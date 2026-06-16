<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\UserSsoIdentityModel;
use App\Helpers\JWTHelper;
use App\Traits\AuditTrait;
use League\OAuth2\Client\Provider\Google;
use League\OAuth2\Client\Provider\Github;
use Stevenmaguire\OAuth2\Client\Provider\Microsoft;

class SsoController extends ResourceController
{
    use ResponseTrait;
    use AuditTrait;

    protected $format = 'json';

    private const SUPPORTED_PROVIDERS = ['google', 'microsoft', 'github'];

    // -------------------------------------------------------------------------
    // GET /auth/sso/providers  — returns which providers are currently enabled
    // Public endpoint consumed by the Login screen to show/hide buttons.
    // -------------------------------------------------------------------------
    public function providers(): \CodeIgniter\HTTP\ResponseInterface
    {
        $enabled = [];
        foreach (self::SUPPORTED_PROVIDERS as $p) {
            if ($this->isProviderEnabled($p)) {
                $enabled[] = $p;
            }
        }
        return $this->response->setJSON(['success' => true, 'providers' => $enabled])->setStatusCode(200);
    }

    // -------------------------------------------------------------------------
    // SSO-007  GET /auth/sso/identities  (authenticated)
    // -------------------------------------------------------------------------
    public function identities(): \CodeIgniter\HTTP\ResponseInterface
    {
        $userId = $this->request->userId ?? null;
        if (!$userId) {
            return $this->failUnauthorized('Authentication required');
        }

        $ssoModel   = new UserSsoIdentityModel();
        $identities = $ssoModel->getForUser((int) $userId);

        return $this->response->setJSON([
            'success'    => true,
            'identities' => $identities,
        ])->setStatusCode(200);
    }

    // -------------------------------------------------------------------------
    // SSO-007  DELETE /auth/sso/{provider}/unlink  (authenticated)
    // -------------------------------------------------------------------------
    public function unlink(string $provider): \CodeIgniter\HTTP\ResponseInterface
    {
        $provider = strtolower($provider);

        if (!in_array($provider, self::SUPPORTED_PROVIDERS, true)) {
            return $this->fail('Unsupported provider', 400);
        }

        $userId   = $this->request->userId   ?? null;
        $tenantId = $this->request->tenantId ?? null;

        if (!$userId) {
            return $this->failUnauthorized('Authentication required');
        }

        // Prevent unlinking the last identity if sso_only=1
        $db   = \Config\Database::connect();
        $user = $db->table('users')->where('id', $userId)->get()->getRowArray();

        if ($user && !empty($user['sso_only'])) {
            $ssoModel   = new UserSsoIdentityModel();
            $identities = $ssoModel->getForUser((int) $userId);
            if (count($identities) <= 1) {
                return $this->fail(
                    'Cannot unlink the last SSO identity for an SSO-only account. Enable a password first.',
                    409
                );
            }
        }

        $ssoModel = new UserSsoIdentityModel();
        $ssoModel->deleteByProviderAndUser($provider, (int) $userId);

        $this->logSsoEvent('auth.sso.unlink', $provider, ['provider_uid' => null, 'email' => null], $userId, $tenantId);

        return $this->respond(['success' => true, 'message' => 'Identity unlinked.']);
    }

    // -------------------------------------------------------------------------
    // SSO-002  GET /auth/sso/{provider}/redirect
    // -------------------------------------------------------------------------
    public function redirect(string $provider): \CodeIgniter\HTTP\ResponseInterface
    {
        $provider = strtolower($provider);

        if (!in_array($provider, self::SUPPORTED_PROVIDERS, true)) {
            return $this->fail('Unsupported provider: ' . $provider, 400);
        }

        if (!$this->isProviderEnabled($provider)) {
            return $this->fail('SSO provider not enabled', 403);
        }

        try {
            $base   = rtrim(env('SSO_REDIRECT_BASE_URL') ?: '', '/');
            $action = $this->request->getGet('action');

            // PKCE code_verifier (SSO-024)
            $verifier  = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
            $challenge = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');

            $linkUserId   = null;
            $linkTenantId = null;

            if ($action === 'link') {
                $linkUserId   = $this->request->userId ?? null;
                $linkTenantId = $this->request->tenantId ?? null;

                if (!$linkUserId) {
                    $tokenParam = $this->request->getGet('token');
                    if ($tokenParam) {
                        $decoded = JWTHelper::validateToken($tokenParam);
                        if (is_array($decoded)) {
                            $linkUserId   = $decoded['user_id']   ?? null;
                            $linkTenantId = $decoded['tenant_id'] ?? null;
                        }
                    }
                }

                if (!$linkUserId) {
                    return $this->fail('Authentication required to link identity', 401);
                }

                $oauth = $this->buildProviderWithUri($provider, $base . '/auth/sso/' . $provider . '/link');
            } else {
                $oauth = $this->buildProvider($provider);
            }

            // Build a self-contained signed state — no session or cookie storage needed.
            // Google returns state unchanged in the callback, so we embed all flow data in it.
            $state = $this->buildSignedState($verifier, $linkUserId, $linkTenantId);

            $options = ['state' => $state];
            if ($provider === 'google') {
                $options['code_challenge']        = $challenge;
                $options['code_challenge_method'] = 'S256';
            }

            $authUrl = $oauth->getAuthorizationUrl($options);
            return redirect()->to($authUrl);

        } catch (\Throwable $e) {
            log_message('error', '[SSO] redirect error: ' . $e->getMessage());
            return $this->fail('SSO initiation failed: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine(), 500);
        }
    }

    // -------------------------------------------------------------------------
    // SSO-003  GET /auth/sso/{provider}/callback
    // -------------------------------------------------------------------------
    public function callback(string $provider): \CodeIgniter\HTTP\ResponseInterface
    {
        $provider = strtolower($provider);

        if (!in_array($provider, self::SUPPORTED_PROVIDERS, true)) {
            return $this->fail('Unsupported provider', 400);
        }

        $code          = $this->request->getGet('code');
        $returnedState = $this->request->getGet('state');
        $flowData      = $this->verifySignedState($returnedState ?? '');

        // CSRF check (SSO-023)
        if (empty($code) || empty($returnedState) || $flowData === null) {
            log_message('warning', '[SSO] CSRF state mismatch for provider: ' . $provider);
            return $this->failUnauthorized('Invalid SSO state — possible CSRF attack');
        }

        try {
            $oauth = $this->buildProvider($provider);

            $pkceOptions = [];
            $verifier = $flowData['verifier'] ?? null;
            if ($verifier && $provider === 'google') {
                $pkceOptions['code_verifier'] = $verifier;
            }

            $token     = $oauth->getAccessToken('authorization_code', array_merge(['code' => $code], $pkceOptions));
            $ownerData = $oauth->getResourceOwner($token);

            $profile = $this->normaliseProfile($provider, $ownerData, $token);

            if (empty($profile['email'])) {
                return $this->fail('Provider did not return an email address. Please ensure your account has a public/primary email.', 422);
            }

            return $this->issueJwtForProfile($profile, $provider);

        } catch (\Throwable $e) {
            log_message('error', '[SSO] callback error (' . $provider . '): ' . $e->getMessage());
            return $this->fail('SSO authentication failed: ' . $e->getMessage(), 500);
        }
    }

    // -------------------------------------------------------------------------
    // SSO-007  GET /auth/sso/{provider}/link  (OAuth callback — links identity)
    // Initiated via redirect() with action=link; user identity is in session.
    // -------------------------------------------------------------------------
    public function link(string $provider): \CodeIgniter\HTTP\ResponseInterface
    {
        $provider = strtolower($provider);

        if (!in_array($provider, self::SUPPORTED_PROVIDERS, true)) {
            return $this->fail('Unsupported provider', 400);
        }

        $code     = $this->request->getGet('code');
        $retState = $this->request->getGet('state');
        $flowData = $this->verifySignedState($retState ?? '');

        if (empty($code) || $flowData === null) {
            return $this->failUnauthorized('Invalid state — possible CSRF');
        }

        $userId   = (int) ($flowData['user_id']   ?? 0);
        $tenantId = (int) ($flowData['tenant_id'] ?? 0);

        if (!$userId) {
            return $this->failUnauthorized('No link session found — initiate from Settings');
        }

        try {
            $base        = rtrim(env('SSO_REDIRECT_BASE_URL') ?: '', '/');
            $oauth       = $this->buildProviderWithUri($provider, $base . '/auth/sso/' . $provider . '/link');
            $pkceOptions = ($provider === 'google' && !empty($flowData['verifier']))
                ? ['code_verifier' => $flowData['verifier']] : [];
            $token   = $oauth->getAccessToken('authorization_code', array_merge(['code' => $code], $pkceOptions));
            $profile = $this->normaliseProfile($provider, $oauth->getResourceOwner($token), $token);

            $ssoModel = new UserSsoIdentityModel();
            $ssoModel->linkToUser($userId, $tenantId, $profile);

            $this->logSsoEvent('auth.sso.link', $provider, $profile, $userId, $tenantId);

            // Redirect back to frontend settings with success marker
            $db     = \Config\Database::connect();
            $tenant = $db->table('tenants')->where('id', $tenantId)->get()->getRowArray();
            if ($tenant) {
                $domain   = env('FRONTEND_DOMAIN')   ?: 'localhost';
                $port     = env('FRONTEND_PORT')     ?: '';
                $protocol = env('FRONTEND_PROTOCOL') ?: 'http';
                $suffix   = $port ? ":{$port}" : '';
                $redirectUrl = "{$protocol}://{$tenant['subdomain']}.{$domain}{$suffix}/?linked={$provider}#/settings";
                return redirect()->to($redirectUrl);
            }

            return $this->respond(['success' => true, 'message' => 'Identity linked successfully']);

        } catch (\Throwable $e) {
            log_message('error', '[SSO] link error: ' . $e->getMessage());
            return $this->fail('Link failed: ' . $e->getMessage(), 500);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function issueJwtForProfile(array $profile, string $provider): \CodeIgniter\HTTP\ResponseInterface
    {
        $db = \Config\Database::connect();

        // Match by email — Google just proves the user owns that address.
        $emailEsc = $db->escape(strtolower(trim($profile['email'])));
        $user     = $db->table('users')->where("LOWER(email) = {$emailEsc}")->get()->getRowArray();

        if (!$user) {
            return $this->fail(
                'No BillingTool account found for ' . ($profile['email'] ?? 'this email') . '. ' .
                'Please sign up first or use the email address registered on your account.',
                404
            );
        }

        // Sync Google avatar if user has none
        if (!empty($profile['avatar_url']) && empty($user['avatar_url'])) {
            $db->table('users')->where('id', $user['id'])->update(['avatar_url' => $profile['avatar_url']]);
        }

        $db->table('users')->where('id', $user['id'])->update(['last_login' => date('Y-m-d H:i:s')]);

        $this->logSsoEvent('auth.sso.login', $provider, $profile, $user['id'], $user['tenant_id']);

        $jwtToken = JWTHelper::generateToken(
            $user['id'],
            $user['tenant_id'],
            $user['email'],
            $user['name'],
            'customer'
        );

        $tenant = $db->table('tenants')->where('id', $user['tenant_id'])->get()->getRowArray();
        return redirect()->to($this->buildRedirectUrl($tenant, $jwtToken));
    }

    private function normaliseProfile(string $provider, $ownerData, $token): array
    {
        switch ($provider) {
            case 'google':
                return [
                    'provider'     => 'google',
                    'provider_uid' => (string) $ownerData->getId(),
                    'email'        => $ownerData->getEmail() ?? '',
                    'name'         => $ownerData->getName()  ?? '',
                    'avatar_url'   => $ownerData->getAvatar() ?? null,
                ];

            case 'github':
                $arr = $ownerData->toArray();
                // GitHub may return null email if profile email is private
                $email = $ownerData->getEmail() ?: $this->fetchGithubPrimaryEmail($token->getToken());
                return [
                    'provider'     => 'github',
                    'provider_uid' => (string) $ownerData->getId(),
                    'email'        => $email ?? '',
                    'name'         => $ownerData->getName() ?: ($arr['login'] ?? ''),
                    'avatar_url'   => $arr['avatar_url'] ?? null,
                ];

            case 'microsoft':
                $arr = $ownerData->toArray();
                return [
                    'provider'     => 'microsoft',
                    'provider_uid' => (string) $ownerData->getId(),
                    'email'        => $arr['mail'] ?? $arr['userPrincipalName'] ?? '',
                    'name'         => $arr['displayName'] ?? '',
                    'avatar_url'   => null,
                ];

            default:
                return [];
        }
    }

    private function fetchGithubPrimaryEmail(string $accessToken): ?string
    {
        try {
            $client   = \Config\Services::curlrequest();
            $response = $client->request('GET', 'https://api.github.com/user/emails', [
                'headers' => [
                    'Authorization' => 'token ' . $accessToken,
                    'Accept'        => 'application/vnd.github.v3+json',
                    'User-Agent'    => 'BillingTool-SSO/1.0',
                ],
            ]);
            $emails = json_decode($response->getBody(), true) ?? [];
            foreach ($emails as $e) {
                if (!empty($e['primary']) && !empty($e['verified'])) {
                    return $e['email'];
                }
            }
        } catch (\Throwable $e) {
            log_message('warning', '[SSO] GitHub email fetch failed: ' . $e->getMessage());
        }
        return null;
    }

    private function buildProvider(string $provider): object
    {
        $base = rtrim(env('SSO_REDIRECT_BASE_URL') ?: '', '/');

        switch ($provider) {
            case 'google':
                return new Google([
                    'clientId'     => env('GOOGLE_CLIENT_ID')     ?: '',
                    'clientSecret' => env('GOOGLE_CLIENT_SECRET') ?: '',
                    'redirectUri'  => $base . '/auth/sso/google/callback',
                ]);

            case 'github':
                return new Github([
                    'clientId'     => env('GITHUB_CLIENT_ID')     ?: '',
                    'clientSecret' => env('GITHUB_CLIENT_SECRET') ?: '',
                    'redirectUri'  => $base . '/auth/sso/github/callback',
                ]);

            case 'microsoft':
                return new Microsoft([
                    'clientId'     => env('MICROSOFT_CLIENT_ID')     ?: '',
                    'clientSecret' => env('MICROSOFT_CLIENT_SECRET') ?: '',
                    'redirectUri'  => $base . '/auth/sso/microsoft/callback',
                    'tenant'       => env('MICROSOFT_TENANT_ID') ?: 'common',
                ]);

            default:
                throw new \InvalidArgumentException('Unknown provider: ' . $provider);
        }
    }

    private function buildProviderWithUri(string $provider, string $redirectUri): object
    {
        switch ($provider) {
            case 'google':
                return new Google([
                    'clientId'     => env('GOOGLE_CLIENT_ID')     ?: '',
                    'clientSecret' => env('GOOGLE_CLIENT_SECRET') ?: '',
                    'redirectUri'  => $redirectUri,
                ]);
            case 'github':
                return new Github([
                    'clientId'     => env('GITHUB_CLIENT_ID')     ?: '',
                    'clientSecret' => env('GITHUB_CLIENT_SECRET') ?: '',
                    'redirectUri'  => $redirectUri,
                ]);
            case 'microsoft':
                return new Microsoft([
                    'clientId'     => env('MICROSOFT_CLIENT_ID')     ?: '',
                    'clientSecret' => env('MICROSOFT_CLIENT_SECRET') ?: '',
                    'redirectUri'  => $redirectUri,
                    'tenant'       => env('MICROSOFT_TENANT_ID') ?: 'common',
                ]);
            default:
                throw new \InvalidArgumentException('Unknown provider: ' . $provider);
        }
    }

    private function buildSignedState(string $verifier, $userId, $tenantId): string
    {
        $payload = base64_encode(json_encode([
            'verifier'  => $verifier,
            'user_id'   => $userId,
            'tenant_id' => $tenantId,
            'ts'        => time(),
        ]));
        $sig = hash_hmac('sha256', $payload, $this->getStateSecret());
        return $payload . '.' . $sig;
    }

    private function verifySignedState(string $state): ?array
    {
        if (empty($state)) return null;
        $dotPos = strrpos($state, '.');
        if ($dotPos === false) return null;
        $payload = substr($state, 0, $dotPos);
        $sig     = substr($state, $dotPos + 1);
        if (!hash_equals(hash_hmac('sha256', $payload, $this->getStateSecret()), $sig)) {
            log_message('warning', '[SSO] signed state signature invalid');
            return null;
        }
        $data = json_decode(base64_decode($payload), true);
        if (!is_array($data) || (time() - ($data['ts'] ?? 0)) > 600) {
            log_message('warning', '[SSO] signed state expired or malformed');
            return null;
        }
        return $data;
    }

    private function getStateSecret(): string
    {
        return env('SSO_ENCRYPTION_KEY') ?: 'sso-state-secret';
    }

    private function isProviderEnabled(string $provider): bool
    {
        $clientIdKey = strtoupper($provider) . '_CLIENT_ID';
        $clientId    = env($clientIdKey) ?: '';
        return !empty(trim((string)$clientId));
    }

    private function buildRedirectUrl(array $tenant, string $token): string
    {
        $domain   = env('FRONTEND_DOMAIN')   ?: 'localhost';
        $port     = env('FRONTEND_PORT')     ?: '';
        $protocol = env('FRONTEND_PROTOCOL') ?: 'http';
        $suffix   = $port ? ":{$port}" : '';
        return "{$protocol}://{$tenant['subdomain']}.{$domain}{$suffix}/?token={$token}#/dashboard";
    }

    private function logSsoEvent(string $event, string $provider, array $profile, $userId, $tenantId): void
    {
        try {
            $db = \Config\Database::connect();
            $db->table('audit_logs')->insert([
                'tenant_id'  => $tenantId,
                'user_id'    => $userId,
                'action'     => $event,
                'entity_type' => 'sso',
                'entity_id'  => 0,
                'details'    => json_encode([
                    'provider'     => $provider,
                    'provider_uid' => $profile['provider_uid'] ?? null,
                    'email'        => $profile['email'] ?? null,
                    'ip_address'   => $this->request->getIPAddress(),
                    'user_agent'   => $this->request->getUserAgent()->getAgentString(),
                ]),
                'ip_address' => $this->request->getIPAddress(),
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) {
            log_message('warning', '[SSO] audit log failed: ' . $e->getMessage());
        }
    }
}

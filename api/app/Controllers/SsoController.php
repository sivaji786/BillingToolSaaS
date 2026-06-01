<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\UserModel;
use App\Models\TenantModel;
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
            $base    = rtrim(getenv('SSO_REDIRECT_BASE_URL') ?: ($_ENV['SSO_REDIRECT_BASE_URL'] ?? ''), '/');
            $action  = $this->request->getGet('action');
            $session = session();

            // CSRF state (SSO-023)
            $state = bin2hex(random_bytes(16));

            // PKCE code_verifier (SSO-024)
            $verifier   = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
            $challenge  = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');

            $session->set('sso_state',     $state);
            $session->set('sso_provider',  $provider);
            $session->set('pkce_verifier', $verifier);

            // If action=link, capture the authenticated user for the link callback
            if ($action === 'link') {
                // Browser navigation: JWT arrives as ?token= query param (no Authorization header)
                $linkUserId   = $this->request->userId   ?? null;
                $linkTenantId = $this->request->tenantId ?? null;

                if (!$linkUserId) {
                    $tokenParam = $this->request->getGet('token');
                    if ($tokenParam) {
                        try {
                            $decoded      = JWTHelper::verifyToken($tokenParam);
                            $linkUserId   = $decoded->user_id   ?? null;
                            $linkTenantId = $decoded->tenant_id ?? null;
                        } catch (\Throwable $e) {
                            // invalid token — fall through to 401
                        }
                    }
                }

                if (!$linkUserId) {
                    return $this->fail('Authentication required to link identity', 401);
                }
                $session->set('sso_link_user_id',   $linkUserId);
                $session->set('sso_link_tenant_id', $linkTenantId);
                // Use the link callback URI instead of the normal callback
                $oauth = $this->buildProviderWithUri($provider, $base . '/auth/sso/' . $provider . '/link');
            } else {
                $oauth = $this->buildProvider($provider);
            }

            $options = ['state' => $state];

            // Google supports PKCE
            if ($provider === 'google') {
                $options['code_challenge']        = $challenge;
                $options['code_challenge_method'] = 'S256';
            }

            $authUrl = $oauth->getAuthorizationUrl($options);

            // Direct browser navigation: issue 302 so the session cookie is set
            // in a same-origin context before the user reaches Google.
            return redirect()->to($authUrl);

        } catch (\Throwable $e) {
            log_message('error', '[SSO] redirect error: ' . $e->getMessage());
            return $this->fail('SSO initiation failed', 500);
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

        $session      = session();
        $code         = $this->request->getGet('code');
        $returnedState = $this->request->getGet('state');
        $storedState  = $session->get('sso_state');

        // CSRF check (SSO-023)
        if (empty($code) || empty($returnedState) || $returnedState !== $storedState) {
            log_message('warning', '[SSO] CSRF state mismatch for provider: ' . $provider);
            return $this->failUnauthorized('Invalid SSO state — possible CSRF attack');
        }

        $session->remove('sso_state');

        try {
            $oauth = $this->buildProvider($provider);

            $pkceOptions = [];
            $verifier = $session->get('pkce_verifier');
            if ($verifier && $provider === 'google') {
                $pkceOptions['code_verifier'] = $verifier;
            }
            $session->remove('pkce_verifier');

            $token     = $oauth->getAccessToken('authorization_code', array_merge(['code' => $code], $pkceOptions));
            $ownerData = $oauth->getResourceOwner($token);

            $profile = $this->normaliseProfile($provider, $ownerData, $token);

            if (empty($profile['email'])) {
                return $this->fail('Provider did not return an email address. Please ensure your account has a public/primary email.', 422);
            }

            return $this->issueJwtForProfile($profile, $provider, $token->getToken());

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

        $session  = session();
        $code     = $this->request->getGet('code');
        $retState = $this->request->getGet('state');
        $stored   = $session->get('sso_state');

        if (empty($code) || $retState !== $stored) {
            return $this->failUnauthorized('Invalid state — possible CSRF');
        }

        $userId   = (int) ($session->get('sso_link_user_id')   ?? 0);
        $tenantId = (int) ($session->get('sso_link_tenant_id') ?? 0);

        if (!$userId) {
            return $this->failUnauthorized('No link session found — initiate from Settings');
        }

        $session->remove('sso_state');
        $session->remove('sso_link_user_id');
        $session->remove('sso_link_tenant_id');

        try {
            $base    = rtrim(getenv('SSO_REDIRECT_BASE_URL') ?: ($_ENV['SSO_REDIRECT_BASE_URL'] ?? ''), '/');
            $oauth   = $this->buildProviderWithUri($provider, $base . '/auth/sso/' . $provider . '/link');
            $token   = $oauth->getAccessToken('authorization_code', ['code' => $code]);
            $profile = $this->normaliseProfile($provider, $oauth->getResourceOwner($token), $token);

            $ssoModel = new UserSsoIdentityModel();
            $ssoModel->linkToUser($userId, $tenantId, $profile);

            $this->logSsoEvent('auth.sso.link', $provider, $profile, $userId, $tenantId);

            // Redirect back to frontend settings with success marker
            $db     = \Config\Database::connect();
            $tenant = $db->table('tenants')->where('id', $tenantId)->get()->getRowArray();
            if ($tenant) {
                $domain   = getenv('FRONTEND_DOMAIN')   ?: ($_ENV['FRONTEND_DOMAIN']   ?? 'localhost');
                $port     = getenv('FRONTEND_PORT')     ?: ($_ENV['FRONTEND_PORT']     ?? '');
                $protocol = getenv('FRONTEND_PROTOCOL') ?: ($_ENV['FRONTEND_PROTOCOL'] ?? 'http');
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

    private function issueJwtForProfile(array $profile, string $provider, string $accessToken): \CodeIgniter\HTTP\ResponseInterface
    {
        $db        = \Config\Database::connect();
        $userModel = new UserModel();
        $ssoModel  = new UserSsoIdentityModel();

        // Look up existing SSO identity first
        $identity = $ssoModel->findByProvider($provider, $profile['provider_uid']);

        if ($identity) {
            // Known identity — just refresh the record
            $user = $userModel->withoutTenant()->find($identity['user_id']);
        } else {
            // Unknown SSO uid — check for matching email to link accounts (SSO-004 / UC-04)
            $user = $userModel->withoutTenant()->findByEmail($profile['email']);
        }

        if (!$user) {
            // Auto-provision new user (UC-03)
            $user = $this->provisionUser($profile, $db);
            if (!$user) {
                return $this->fail('Failed to provision user account', 500);
            }
        }

        // Sync avatar if user has none (SSO-011)
        if (!empty($profile['avatar_url']) && empty($user['avatar_url'])) {
            $userModel->withoutTenant()->update($user['id'], ['avatar_url' => $profile['avatar_url']]);
        }

        // Persist / update the SSO identity row
        $ssoModel->linkToUser((int)$user['id'], (int)$user['tenant_id'], array_merge($profile, [
            'access_token' => $accessToken,
        ]));

        // Audit log (SSO-010)
        $eventType = $identity ? 'auth.sso.login' : 'auth.sso.provision';
        $this->logSsoEvent($eventType, $provider, $profile, $user['id'], $user['tenant_id']);

        // Issue BillingTool JWT (identical shape to Auth::login)
        $jwtToken = JWTHelper::generateToken(
            $user['id'],
            $user['tenant_id'],
            $user['email'],
            $user['name'],
            'customer'
        );

        // Update last login
        $userModel->withoutTenant()->update($user['id'], ['last_login' => date('Y-m-d H:i:s')]);

        // Redirect to tenant subdomain with token (matches Auth::login redirect pattern)
        $tenant = $db->table('tenants')->where('id', $user['tenant_id'])->get()->getRowArray();
        $redirectUrl = $this->buildRedirectUrl($tenant, $jwtToken);

        return redirect()->to($redirectUrl);
    }

    private function provisionUser(array $profile, $db): ?array
    {
        $userModel = new UserModel();

        // Find any active tenant to attach to (single-tenant auto-provision)
        // In multi-tenant SaaS this would use the subdomain from the session
        $tenant = $db->table('tenants')->where('status', 'active')->limit(1)->get()->getRowArray();
        if (!$tenant) {
            log_message('error', '[SSO] provision failed: no active tenant found');
            return null;
        }

        $db->transStart();
        try {
            $userId = $userModel->insert([
                'tenant_id' => $tenant['id'],
                'email'     => $profile['email'],
                'name'      => $profile['name'] ?: explode('@', $profile['email'])[0],
                'role'      => 'member',
                'sso_only'  => 1,
                'password'  => bin2hex(random_bytes(32)), // random unusable password
            ]);

            if (!$userId) {
                throw new \Exception('User insert failed');
            }

            $db->transComplete();
            $this->logSsoEvent('auth.sso.provision', $profile['provider'], $profile, $userId, $tenant['id']);
            return $userModel->withoutTenant()->find($userId);

        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', '[SSO] provision exception: ' . $e->getMessage());
            return null;
        }
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
        $base = rtrim(getenv('SSO_REDIRECT_BASE_URL') ?: ($_ENV['SSO_REDIRECT_BASE_URL'] ?? ''), '/');

        switch ($provider) {
            case 'google':
                return new Google([
                    'clientId'     => getenv('GOOGLE_CLIENT_ID')     ?: ($_ENV['GOOGLE_CLIENT_ID']     ?? ''),
                    'clientSecret' => getenv('GOOGLE_CLIENT_SECRET') ?: ($_ENV['GOOGLE_CLIENT_SECRET'] ?? ''),
                    'redirectUri'  => $base . '/auth/sso/google/callback',
                ]);

            case 'github':
                return new Github([
                    'clientId'     => getenv('GITHUB_CLIENT_ID')     ?: ($_ENV['GITHUB_CLIENT_ID']     ?? ''),
                    'clientSecret' => getenv('GITHUB_CLIENT_SECRET') ?: ($_ENV['GITHUB_CLIENT_SECRET'] ?? ''),
                    'redirectUri'  => $base . '/auth/sso/github/callback',
                ]);

            case 'microsoft':
                return new Microsoft([
                    'clientId'     => getenv('MICROSOFT_CLIENT_ID')     ?: ($_ENV['MICROSOFT_CLIENT_ID']     ?? ''),
                    'clientSecret' => getenv('MICROSOFT_CLIENT_SECRET') ?: ($_ENV['MICROSOFT_CLIENT_SECRET'] ?? ''),
                    'redirectUri'  => $base . '/auth/sso/microsoft/callback',
                    'tenant'       => getenv('MICROSOFT_TENANT_ID') ?: ($_ENV['MICROSOFT_TENANT_ID'] ?? 'common'),
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
                    'clientId'     => getenv('GOOGLE_CLIENT_ID')     ?: ($_ENV['GOOGLE_CLIENT_ID']     ?? ''),
                    'clientSecret' => getenv('GOOGLE_CLIENT_SECRET') ?: ($_ENV['GOOGLE_CLIENT_SECRET'] ?? ''),
                    'redirectUri'  => $redirectUri,
                ]);
            case 'github':
                return new Github([
                    'clientId'     => getenv('GITHUB_CLIENT_ID')     ?: ($_ENV['GITHUB_CLIENT_ID']     ?? ''),
                    'clientSecret' => getenv('GITHUB_CLIENT_SECRET') ?: ($_ENV['GITHUB_CLIENT_SECRET'] ?? ''),
                    'redirectUri'  => $redirectUri,
                ]);
            case 'microsoft':
                return new Microsoft([
                    'clientId'     => getenv('MICROSOFT_CLIENT_ID')     ?: ($_ENV['MICROSOFT_CLIENT_ID']     ?? ''),
                    'clientSecret' => getenv('MICROSOFT_CLIENT_SECRET') ?: ($_ENV['MICROSOFT_CLIENT_SECRET'] ?? ''),
                    'redirectUri'  => $redirectUri,
                    'tenant'       => getenv('MICROSOFT_TENANT_ID') ?: ($_ENV['MICROSOFT_TENANT_ID'] ?? 'common'),
                ]);
            default:
                throw new \InvalidArgumentException('Unknown provider: ' . $provider);
        }
    }

    private function isProviderEnabled(string $provider): bool
    {
        $clientIdKey = strtoupper($provider) . '_CLIENT_ID';
        $clientId    = getenv($clientIdKey) ?: ($_ENV[$clientIdKey] ?? '');
        return !empty(trim((string)$clientId));
    }

    private function buildRedirectUrl(array $tenant, string $token): string
    {
        $domain   = getenv('FRONTEND_DOMAIN')   ?: ($_ENV['FRONTEND_DOMAIN']   ?? 'localhost');
        $port     = getenv('FRONTEND_PORT')     ?: ($_ENV['FRONTEND_PORT']     ?? '');
        $protocol = getenv('FRONTEND_PROTOCOL') ?: ($_ENV['FRONTEND_PROTOCOL'] ?? 'http');
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

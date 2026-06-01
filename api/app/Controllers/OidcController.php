<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Models\UserModel;
use App\Models\UserSsoIdentityModel;
use App\Models\TenantSsoConfigModel;
use App\Helpers\JWTHelper;
use App\Traits\AuditTrait;
use Jumbojett\OpenIDConnectClient;

class OidcController extends BaseController
{
    use ResponseTrait, AuditTrait;

    protected $format = 'json';

    // SSO-021  GET /auth/oidc/redirect?tenant={subdomain}
    public function redirect(): \CodeIgniter\HTTP\ResponseInterface
    {
        $subdomain = $this->request->getGet('tenant');
        if (empty($subdomain)) {
            return $this->fail('tenant query parameter required', 400);
        }

        try {
            $config = $this->getOidcConfigForSubdomain($subdomain);
            if (!$config) {
                return $this->fail('OIDC not configured for this tenant', 404);
            }

            $oidc = new OpenIDConnectClient(
                $config['issuer_url'],
                $config['client_id'],
                $config['client_secret']
            );

            $base = rtrim(getenv('SSO_REDIRECT_BASE_URL') ?: ($_ENV['SSO_REDIRECT_BASE_URL'] ?? ''), '/');
            $oidc->setRedirectURL($base . '/auth/oidc/callback');
            $oidc->addScope(['openid', 'email', 'profile']);

            // SSO-027: nonce for replay protection
            $nonce = bin2hex(random_bytes(16));
            session()->set('oidc_nonce',    $nonce);
            session()->set('oidc_tenant',   $subdomain);
            session()->set('oidc_state',    bin2hex(random_bytes(16)));

            $oidc->setNonce($nonce);
            $oidc->setCodeChallengeMethod('S256');

            $authUrl = $oidc->buildAuthorizationURL();

            return $this->response->setJSON([
                'success'      => true,
                'redirect_url' => $authUrl,
            ])->setStatusCode(200);

        } catch (\Throwable $e) {
            log_message('error', '[OIDC] redirect error: ' . $e->getMessage());
            return $this->fail('OIDC initiation failed: ' . $e->getMessage(), 500);
        }
    }

    // SSO-021  GET /auth/oidc/callback
    public function callback(): \CodeIgniter\HTTP\ResponseInterface
    {
        $code  = $this->request->getGet('code');
        $state = $this->request->getGet('state');

        if (empty($code)) {
            return $this->failUnauthorized('No authorization code in callback');
        }

        $storedState = session()->get('oidc_state');
        if ($storedState && $state !== $storedState) {
            return $this->failUnauthorized('Invalid state — possible CSRF attack');
        }

        $subdomain = session()->get('oidc_tenant');
        if (empty($subdomain)) {
            return $this->failUnauthorized('No OIDC session found');
        }

        try {
            $config = $this->getOidcConfigForSubdomain($subdomain);
            if (!$config) {
                return $this->fail('OIDC not configured for this tenant', 404);
            }

            $oidc = new OpenIDConnectClient(
                $config['issuer_url'],
                $config['client_id'],
                $config['client_secret']
            );

            $base = rtrim(getenv('SSO_REDIRECT_BASE_URL') ?: ($_ENV['SSO_REDIRECT_BASE_URL'] ?? ''), '/');
            $oidc->setRedirectURL($base . '/auth/oidc/callback');
            $oidc->setCodeChallengeMethod('S256');

            // Must be called before requestTokens to set nonce validation
            $storedNonce = session()->get('oidc_nonce');
            if ($storedNonce) {
                $oidc->setNonce($storedNonce);
            }

            $oidc->authenticate();

            // SSO-027: verify nonce claim in id_token
            $tokenNonce = $oidc->getVerifiedClaims('nonce');
            if ($storedNonce && $tokenNonce && $tokenNonce !== $storedNonce) {
                return $this->failUnauthorized('Nonce mismatch — possible replay attack');
            }

            session()->remove('oidc_nonce');
            session()->remove('oidc_state');
            session()->remove('oidc_tenant');

            $email = $oidc->requestUserInfo('email');
            $name  = $oidc->requestUserInfo('name')
                ?: ($oidc->requestUserInfo('given_name') . ' ' . $oidc->requestUserInfo('family_name'));
            $name  = trim($name) ?: explode('@', $email)[0];
            $sub   = $oidc->getVerifiedClaims('sub');

            if (empty($email)) {
                return $this->fail('OIDC provider did not return an email address', 422);
            }

            $db           = \Config\Database::connect();
            $tenantRecord = $db->table('tenants')->where('subdomain', $subdomain)->get()->getRowArray();
            if (!$tenantRecord) {
                return $this->fail('Tenant not found', 404);
            }

            $userModel = new UserModel();
            $user = $userModel->withoutTenant()
                ->where('email', $email)
                ->where('tenant_id', $tenantRecord['id'])
                ->first();

            if (!$user) {
                $userId = $userModel->insert([
                    'tenant_id' => $tenantRecord['id'],
                    'email'     => $email,
                    'name'      => $name,
                    'role'      => 'member',
                    'sso_only'  => 1,
                    'password'  => bin2hex(random_bytes(32)),
                ]);
                $user = $userModel->withoutTenant()->find($userId);
                $this->logOidcEvent('auth.sso.provision', $email, $sub, (int) $tenantRecord['id'], $userId);
            }

            $ssoModel = new UserSsoIdentityModel();
            $ssoModel->linkToUser((int) $user['id'], (int) $tenantRecord['id'], [
                'provider'     => 'oidc',
                'provider_uid' => $sub ?: $email,
                'email'        => $email,
                'name'         => $name,
            ]);

            $this->logOidcEvent('auth.sso.login', $email, $sub, (int) $tenantRecord['id'], $user['id']);

            $jwtToken = JWTHelper::generateToken(
                $user['id'],
                $user['tenant_id'],
                $user['email'],
                $user['name'],
                'customer'
            );

            $userModel->withoutTenant()->update($user['id'], ['last_login' => date('Y-m-d H:i:s')]);

            $redirectUrl = $this->buildRedirectUrl($tenantRecord, $jwtToken);
            return redirect()->to($redirectUrl);

        } catch (\Throwable $e) {
            log_message('error', '[OIDC] callback error: ' . $e->getMessage());
            return $this->fail('OIDC authentication failed: ' . $e->getMessage(), 500);
        }
    }

    // SSO-022  POST /auth/oidc/test-discovery (tenant admin can test OIDC connection)
    public function testDiscovery(): \CodeIgniter\HTTP\ResponseInterface
    {
        $body       = $this->request->getJSON(true) ?? [];
        $issuerUrl  = trim($body['issuer_url'] ?? '');

        if (empty($issuerUrl)) {
            return $this->fail('issuer_url is required', 422);
        }

        try {
            $oidc = new OpenIDConnectClient($issuerUrl);
            $oidc->setVerifyHost(false);
            $oidc->setVerifyPeer(false);

            $endpoints = [
                'authorization_endpoint' => $oidc->getProviderConfigValue('authorization_endpoint'),
                'token_endpoint'         => $oidc->getProviderConfigValue('token_endpoint'),
                'userinfo_endpoint'      => $oidc->getProviderConfigValue('userinfo_endpoint'),
                'issuer'                 => $oidc->getProviderConfigValue('issuer'),
            ];

            return $this->respond(['success' => true, 'endpoints' => $endpoints]);
        } catch (\Throwable $e) {
            return $this->fail('Discovery failed: ' . $e->getMessage(), 422);
        }
    }

    private function getOidcConfigForSubdomain(string $subdomain): ?array
    {
        $db     = \Config\Database::connect();
        $tenant = $db->table('tenants')->where('subdomain', $subdomain)->get()->getRowArray();
        if (!$tenant) return null;

        $model  = new TenantSsoConfigModel();
        $config = $model->getDecryptedConfig((int) $tenant['id']);

        if (!$config || !$config['enabled'] || $config['provider'] !== 'oidc') {
            return null;
        }

        return $config['config'];
    }

    private function buildRedirectUrl(array $tenant, string $token): string
    {
        $domain   = getenv('FRONTEND_DOMAIN')   ?: ($_ENV['FRONTEND_DOMAIN']   ?? 'localhost');
        $port     = getenv('FRONTEND_PORT')     ?: ($_ENV['FRONTEND_PORT']     ?? '');
        $protocol = getenv('FRONTEND_PROTOCOL') ?: ($_ENV['FRONTEND_PROTOCOL'] ?? 'http');
        $suffix   = $port ? ":{$port}" : '';
        return "{$protocol}://{$tenant['subdomain']}.{$domain}{$suffix}/?token={$token}#/dashboard";
    }

    private function logOidcEvent(string $event, string $email, ?string $sub, int $tenantId, $userId): void
    {
        try {
            $db = \Config\Database::connect();
            $db->table('audit_logs')->insert([
                'tenant_id'   => $tenantId,
                'user_id'     => $userId,
                'action'      => $event,
                'entity_type' => 'sso',
                'entity_id'   => 0,
                'details'     => json_encode([
                    'provider'   => 'oidc',
                    'email'      => $email,
                    'sub'        => $sub,
                    'ip_address' => $this->request->getIPAddress(),
                    'user_agent' => $this->request->getUserAgent()->getAgentString(),
                ]),
                'ip_address'  => $this->request->getIPAddress(),
                'created_at'  => date('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) {
            log_message('warning', '[OIDC] audit log failed: ' . $e->getMessage());
        }
    }
}

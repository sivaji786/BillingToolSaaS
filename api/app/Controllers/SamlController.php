<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Models\UserModel;
use App\Models\UserSsoIdentityModel;
use App\Models\TenantSsoConfigModel;
use App\Helpers\JWTHelper;
use App\Traits\AuditTrait;
use OneLogin\Saml2\Auth;
use OneLogin\Saml2\Settings as Saml2Settings;

class SamlController extends BaseController
{
    use ResponseTrait, AuditTrait;

    protected $format = 'json';

    // SSO-013  GET /auth/saml/metadata
    public function metadata(): \CodeIgniter\HTTP\ResponseInterface
    {
        try {
            $settings = new Saml2Settings($this->buildSpOnlySettings(), true);
            $metadata = $settings->getSPMetadata();

            return $this->response
                ->setHeader('Content-Type', 'text/xml')
                ->setBody($metadata)
                ->setStatusCode(200);
        } catch (\Throwable $e) {
            log_message('error', '[SAML] metadata error: ' . $e->getMessage());
            return $this->fail('Failed to generate SP metadata', 500);
        }
    }

    // SSO-014  GET /auth/saml/login?tenant={subdomain}
    public function login(): \CodeIgniter\HTTP\ResponseInterface
    {
        $subdomain = $this->request->getGet('tenant');
        if (empty($subdomain)) {
            return $this->fail('tenant query parameter required', 400);
        }

        try {
            $samlSettings = $this->getSamlSettingsForSubdomain($subdomain);
            if (!$samlSettings) {
                return $this->fail('SAML not configured for this tenant', 404);
            }

            session()->set('saml_tenant', $subdomain);

            $auth = new Auth($samlSettings);
            $auth->login(null, [], false, false, true);

            $redirectUrl = $auth->getLastRequestID()
                ? $auth->getSSOurl()
                : null;

            if ($redirectUrl) {
                return redirect()->to($auth->login(null, [], false, false, true) ?? $redirectUrl);
            }

            $auth->login();
            return $this->fail('SAML redirect error', 500);

        } catch (\Throwable $e) {
            log_message('error', '[SAML] login error: ' . $e->getMessage());
            return $this->fail('SAML login failed: ' . $e->getMessage(), 500);
        }
    }

    // SSO-015  POST /auth/saml/acs
    public function acs(): \CodeIgniter\HTTP\ResponseInterface
    {
        try {
            $subdomain = $this->request->getPost('RelayState') ?: session()->get('saml_tenant');

            if (empty($subdomain)) {
                $host  = $this->request->getServer('HTTP_HOST') ?? '';
                $parts = explode('.', $host);
                $subdomain = $parts[0] ?? '';
            }

            $samlSettings = $this->getSamlSettingsForSubdomain($subdomain);
            if (!$samlSettings) {
                return $this->fail('SAML not configured for this tenant', 404);
            }

            $auth = new Auth($samlSettings);
            $auth->processResponse();

            if (!$auth->isAuthenticated()) {
                $errors = $auth->getErrors();
                log_message('warning', '[SAML] ACS not authenticated: ' . implode(', ', $errors));
                return $this->failUnauthorized('SAML assertion validation failed: ' . implode(', ', $errors));
            }

            $nameId     = $auth->getNameId();
            $attributes = $auth->getAttributes();

            $email = $nameId;
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $email = $attributes['email'][0]
                    ?? $attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'][0]
                    ?? $attributes['mail'][0]
                    ?? '';
            }

            if (empty($email)) {
                return $this->fail('SAML assertion missing email', 422);
            }

            $name = $attributes['displayName'][0]
                ?? $attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/displayname'][0]
                ?? $attributes['cn'][0]
                ?? $attributes['givenName'][0]
                ?? explode('@', $email)[0];

            $groups = $attributes['groups'] ?? $attributes['memberOf'] ?? [];

            $db           = \Config\Database::connect();
            $tenantRecord = $db->table('tenants')->where('subdomain', $subdomain)->get()->getRowArray();
            if (!$tenantRecord) {
                return $this->fail('Tenant not found', 404);
            }

            // SSO-019: role mapping
            $ssoConfigModel = new TenantSsoConfigModel();
            $ssoConfig      = $ssoConfigModel->getDecryptedConfig((int) $tenantRecord['id']);
            $roleMapping    = $ssoConfig['config']['role_mapping'] ?? [];

            $role = 'member';
            foreach ($groups as $group) {
                if (isset($roleMapping[$group])) {
                    $role = $roleMapping[$group];
                    break;
                }
            }

            // SSO-020: JIT provisioning
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
                    'role'      => $role,
                    'sso_only'  => 1,
                    'password'  => bin2hex(random_bytes(32)),
                ]);
                $user = $userModel->withoutTenant()->find($userId);
                $this->logSamlEvent('auth.sso.provision', $email, $nameId, (int) $tenantRecord['id'], $userId);
            } else {
                if (!empty($roleMapping) && isset($user['role']) && $user['role'] !== $role) {
                    $userModel->withoutTenant()->update($user['id'], ['role' => $role]);
                }
            }

            $ssoModel = new UserSsoIdentityModel();
            $ssoModel->linkToUser((int) $user['id'], (int) $tenantRecord['id'], [
                'provider'     => 'saml',
                'provider_uid' => $nameId,
                'email'        => $email,
                'name'         => $name,
            ]);

            $this->logSamlEvent('auth.sso.login', $email, $nameId, (int) $tenantRecord['id'], $user['id']);

            $jwtToken = JWTHelper::generateToken(
                $user['id'],
                $user['tenant_id'],
                $user['email'],
                $user['name'],
                'customer'
            );

            $userModel->withoutTenant()->update($user['id'], ['last_login' => date('Y-m-d H:i:s')]);
            session()->set('saml_tenant', null);

            $redirectUrl = $this->buildRedirectUrl($tenantRecord, $jwtToken);
            return redirect()->to($redirectUrl);

        } catch (\Throwable $e) {
            log_message('error', '[SAML] ACS error: ' . $e->getMessage());
            return $this->fail('SAML authentication failed: ' . $e->getMessage(), 500);
        }
    }

    // SSO-016  GET /auth/saml/slo
    public function slo(): \CodeIgniter\HTTP\ResponseInterface
    {
        try {
            $subdomain = $this->request->getGet('tenant') ?: session()->get('saml_tenant');

            if ($subdomain) {
                $samlSettings = $this->getSamlSettingsForSubdomain($subdomain);
                if ($samlSettings) {
                    $auth = new Auth($samlSettings);
                    $auth->processSLO(false, null, false, function () {
                        session()->destroy();
                    });
                    return redirect()->to('/');
                }
            }

            session()->destroy();
            return redirect()->to('/');

        } catch (\Throwable $e) {
            log_message('error', '[SAML] SLO error: ' . $e->getMessage());
            session()->destroy();
            return redirect()->to('/');
        }
    }

    // -------------------------------------------------------------------------

    private function getSamlSettingsForSubdomain(string $subdomain): ?array
    {
        $db     = \Config\Database::connect();
        $tenant = $db->table('tenants')->where('subdomain', $subdomain)->get()->getRowArray();
        if (!$tenant) return null;

        $model  = new TenantSsoConfigModel();
        $config = $model->getDecryptedConfig((int) $tenant['id']);

        if (!$config || !$config['enabled'] || $config['provider'] !== 'saml') {
            return null;
        }

        return $this->buildSamlSettings($config['config']);
    }

    private function buildSpOnlySettings(): array
    {
        $base   = rtrim(getenv('SSO_REDIRECT_BASE_URL') ?: ($_ENV['SSO_REDIRECT_BASE_URL'] ?? ''), '/');
        $spCert = getenv('SAML_SP_CERT') ?: ($_ENV['SAML_SP_CERT'] ?? '');
        $spKey  = getenv('SAML_SP_KEY')  ?: ($_ENV['SAML_SP_KEY']  ?? '');

        return [
            'sp' => [
                'entityId'                 => $base . '/auth/saml/metadata',
                'assertionConsumerService' => [
                    'url'     => $base . '/auth/saml/acs',
                    'binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
                ],
                'singleLogoutService' => [
                    'url'     => $base . '/auth/saml/slo',
                    'binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
                ],
                'NameIDFormat' => 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
                'x509cert'     => $spCert,
                'privateKey'   => $spKey,
            ],
            'idp' => [
                'entityId'            => '',
                'singleSignOnService' => ['url' => '', 'binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect'],
                'singleLogoutService' => ['url' => '', 'binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect'],
                'x509cert'            => '',
            ],
        ];
    }

    private function buildSamlSettings(array $c): array
    {
        $base   = rtrim(getenv('SSO_REDIRECT_BASE_URL') ?: ($_ENV['SSO_REDIRECT_BASE_URL'] ?? ''), '/');
        $spCert = getenv('SAML_SP_CERT') ?: ($_ENV['SAML_SP_CERT'] ?? '');
        $spKey  = getenv('SAML_SP_KEY')  ?: ($_ENV['SAML_SP_KEY']  ?? '');

        return [
            'sp' => [
                'entityId'                 => $base . '/auth/saml/metadata',
                'assertionConsumerService' => [
                    'url'     => $base . '/auth/saml/acs',
                    'binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
                ],
                'singleLogoutService' => [
                    'url'     => $base . '/auth/saml/slo',
                    'binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
                ],
                'NameIDFormat' => 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
                'x509cert'     => $spCert,
                'privateKey'   => $spKey,
            ],
            'idp' => [
                'entityId'            => $c['idp_entity_id'] ?? '',
                'singleSignOnService' => [
                    'url'     => $c['idp_sso_url'] ?? '',
                    'binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
                ],
                'singleLogoutService' => [
                    'url'     => $c['idp_slo_url'] ?? '',
                    'binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
                ],
                'x509cert' => $c['idp_cert'] ?? '',
            ],
        ];
    }

    private function buildRedirectUrl(array $tenant, string $token): string
    {
        $domain   = getenv('FRONTEND_DOMAIN')   ?: ($_ENV['FRONTEND_DOMAIN']   ?? 'localhost');
        $port     = getenv('FRONTEND_PORT')     ?: ($_ENV['FRONTEND_PORT']     ?? '');
        $protocol = getenv('FRONTEND_PROTOCOL') ?: ($_ENV['FRONTEND_PROTOCOL'] ?? 'http');
        $suffix   = $port ? ":{$port}" : '';
        return "{$protocol}://{$tenant['subdomain']}.{$domain}{$suffix}/?token={$token}#/dashboard";
    }

    private function logSamlEvent(string $event, string $email, string $nameId, int $tenantId, $userId): void
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
                    'provider'   => 'saml',
                    'email'      => $email,
                    'name_id'    => $nameId,
                    'ip_address' => $this->request->getIPAddress(),
                    'user_agent' => $this->request->getUserAgent()->getAgentString(),
                ]),
                'ip_address'  => $this->request->getIPAddress(),
                'created_at'  => date('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) {
            log_message('warning', '[SAML] audit log failed: ' . $e->getMessage());
        }
    }
}

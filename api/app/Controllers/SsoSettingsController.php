<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;
use App\Models\TenantSsoConfigModel;

class SsoSettingsController extends BaseController
{
    use ResponseTrait, AuditTrait;

    protected int $tenantId = 0;
    protected int $userId   = 0;

    private function boot(): void
    {
        $tenant         = config('App')->currentTenant ?? null;
        $this->tenantId = (int) ($tenant->id ?? 0);
        $this->userId   = (int) ($this->request->userId ?? session()->get('userId') ?? 0);
    }

    // GET /api/settings/sso
    public function show(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $model  = new TenantSsoConfigModel();
        $config = $model->getForTenant($this->tenantId);

        if (!$config) {
            return $this->respond([
                'provider' => 'saml',
                'enabled'  => false,
                'sso_only' => false,
                'config'   => [
                    'idp_entity_id' => '',
                    'idp_sso_url'   => '',
                    'idp_slo_url'   => '',
                    'idp_cert'      => '',
                    'role_mapping'  => [],
                    'client_id'     => '',
                    'client_secret' => '',
                    'issuer_url'    => '',
                ],
                'sp_metadata_url' => rtrim(getenv('SSO_REDIRECT_BASE_URL') ?: '', '/') . '/auth/saml/metadata',
            ]);
        }

        $decoded = json_decode($config['config_json'] ?? '{}', true) ?? [];
        // Mask secrets in output
        foreach (['client_secret', 'sp_private_key'] as $field) {
            if (!empty($decoded[$field])) {
                $decoded[$field] = '••••••••';
            }
        }

        return $this->respond([
            'provider'        => $config['provider'],
            'enabled'         => (bool) $config['enabled'],
            'sso_only'        => (bool) $config['sso_only'],
            'config'          => $decoded,
            'sp_metadata_url' => rtrim(getenv('SSO_REDIRECT_BASE_URL') ?: '', '/') . '/auth/saml/metadata',
        ]);
    }

    // PUT /api/settings/sso
    public function update(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $body     = $this->request->getJSON(true) ?? [];
        $provider = $body['provider'] ?? 'saml';

        if (!in_array($provider, ['saml', 'oidc'], true)) {
            return $this->fail('provider must be saml or oidc', 422);
        }

        $model         = new TenantSsoConfigModel();
        $existingDecry = $model->getDecryptedConfig($this->tenantId);
        $newConfig     = $body['config'] ?? [];

        // Preserve existing secrets if masked placeholder was sent
        foreach (['client_secret', 'sp_private_key'] as $field) {
            if (isset($newConfig[$field]) && $newConfig[$field] === '••••••••') {
                $newConfig[$field] = $existingDecry['config'][$field] ?? '';
            }
        }

        $model->upsertForTenant($this->tenantId, [
            'provider'    => $provider,
            'enabled'     => (bool) ($body['enabled'] ?? false),
            'sso_only'    => (bool) ($body['sso_only'] ?? false),
            'config_json' => $newConfig,
        ]);

        $this->logAction('settings.sso.updated', 'tenant-' . $this->tenantId, 'SSO config updated: ' . $provider);

        return $this->respond(['success' => true, 'message' => 'SSO configuration saved.']);
    }
}

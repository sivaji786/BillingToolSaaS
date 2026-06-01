<?php

namespace App\Models;

use CodeIgniter\Model;

class TenantSsoConfigModel extends Model
{
    protected $table      = 'tenant_sso_configs';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = ['tenant_id', 'provider', 'enabled', 'sso_only', 'config_json'];
    protected $useTimestamps = true;

    public function getForTenant(int $tenantId): ?array
    {
        return $this->where('tenant_id', $tenantId)->first();
    }

    public function getDecryptedConfig(int $tenantId): ?array
    {
        $row = $this->getForTenant($tenantId);
        if (!$row) return null;

        $config = json_decode($row['config_json'] ?? '{}', true) ?? [];

        foreach (['client_secret', 'sp_private_key', 'idp_cert'] as $field) {
            if (!empty($config[$field])) {
                $decrypted = $this->decryptValue($config[$field]);
                // If decryption fails / returns same value, keep it (may be plain text)
                $config[$field] = $decrypted;
            }
        }

        $row['config'] = $config;
        return $row;
    }

    public function upsertForTenant(int $tenantId, array $data): void
    {
        $configJson = $data['config_json'] ?? [];
        if (is_string($configJson)) {
            $configJson = json_decode($configJson, true) ?? [];
        }

        // Encrypt sensitive values at rest
        foreach (['client_secret', 'sp_private_key'] as $field) {
            if (!empty($configJson[$field])) {
                $configJson[$field] = $this->encryptValue($configJson[$field]);
            }
        }

        $row = [
            'provider'    => $data['provider'],
            'enabled'     => (int) ($data['enabled'] ?? 0),
            'sso_only'    => (int) ($data['sso_only'] ?? 0),
            'config_json' => json_encode($configJson),
        ];

        $existing = $this->getForTenant($tenantId);
        if ($existing) {
            $this->update($existing['id'], $row);
        } else {
            $this->insert(array_merge($row, ['tenant_id' => $tenantId]));
        }
    }

    private function encryptValue(string $value): string
    {
        $key = getenv('SSO_ENCRYPTION_KEY') ?: ($_ENV['SSO_ENCRYPTION_KEY'] ?? '');
        if (empty($key)) return $value;
        $iv = random_bytes(12);
        $encrypted = openssl_encrypt($value, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
        return base64_encode($iv . $tag . $encrypted);
    }

    private function decryptValue(string $encrypted): string
    {
        $key = getenv('SSO_ENCRYPTION_KEY') ?: ($_ENV['SSO_ENCRYPTION_KEY'] ?? '');
        if (empty($key)) return $encrypted;
        try {
            $raw = base64_decode($encrypted, true);
            if ($raw === false || strlen($raw) < 28) return $encrypted;
            $iv  = substr($raw, 0, 12);
            $tag = substr($raw, 12, 16);
            $ct  = substr($raw, 28);
            $dec = openssl_decrypt($ct, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
            return $dec !== false ? $dec : $encrypted;
        } catch (\Throwable $e) {
            return $encrypted;
        }
    }
}

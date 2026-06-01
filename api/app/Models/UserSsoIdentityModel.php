<?php

namespace App\Models;

use CodeIgniter\Model;

class UserSsoIdentityModel extends Model
{
    protected $table = 'user_sso_identities';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'user_id', 'tenant_id', 'provider', 'provider_uid', 'email',
        'name', 'avatar_url', 'access_token', 'id_token', 'last_login_at',
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    public function findByProvider(string $provider, string $uid): ?array
    {
        return $this->where('provider', $provider)->where('provider_uid', $uid)->first();
    }

    public function findByEmail(string $provider, string $email): ?array
    {
        return $this->where('provider', $provider)->where('email', $email)->first();
    }

    public function linkToUser(int $userId, int $tenantId, array $data): int|string
    {
        $row = $this->findByProvider($data['provider'], $data['provider_uid']);
        if ($row) {
            $this->update($row['id'], [
                'email'         => $data['email'] ?? $row['email'],
                'name'          => $data['name']  ?? $row['name'],
                'avatar_url'    => $data['avatar_url'] ?? $row['avatar_url'],
                'access_token'  => isset($data['access_token']) ? $this->encryptToken($data['access_token']) : $row['access_token'],
                'id_token'      => isset($data['id_token'])     ? $this->encryptToken($data['id_token'])     : $row['id_token'],
                'last_login_at' => date('Y-m-d H:i:s'),
            ]);
            return $row['id'];
        }

        $insertData = [
            'user_id'      => $userId,
            'tenant_id'    => $tenantId,
            'provider'     => $data['provider'],
            'provider_uid' => $data['provider_uid'],
            'email'        => $data['email'] ?? '',
            'name'         => $data['name']  ?? null,
            'avatar_url'   => $data['avatar_url'] ?? null,
            'access_token' => isset($data['access_token']) ? $this->encryptToken($data['access_token']) : null,
            'id_token'     => isset($data['id_token'])     ? $this->encryptToken($data['id_token'])     : null,
            'last_login_at' => date('Y-m-d H:i:s'),
        ];
        return $this->insert($insertData);
    }

    public function getForUser(int $userId): array
    {
        return $this->where('user_id', $userId)
            ->select('id, provider, email, name, last_login_at, created_at')
            ->orderBy('created_at', 'ASC')
            ->findAll();
    }

    public function deleteByProviderAndUser(string $provider, int $userId): bool
    {
        return $this->where('provider', $provider)->where('user_id', $userId)->delete() !== false;
    }

    private function encryptToken(string $token): string
    {
        $key = getenv('SSO_ENCRYPTION_KEY') ?: ($_ENV['SSO_ENCRYPTION_KEY'] ?? '');
        if (empty($key)) {
            return $token;
        }
        $iv = random_bytes(12);
        $encrypted = openssl_encrypt($token, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
        return base64_encode($iv . $tag . $encrypted);
    }

    public function decryptToken(string $encrypted): string
    {
        $key = getenv('SSO_ENCRYPTION_KEY') ?: ($_ENV['SSO_ENCRYPTION_KEY'] ?? '');
        if (empty($key)) {
            return $encrypted;
        }
        try {
            $raw = base64_decode($encrypted);
            $iv  = substr($raw, 0, 12);
            $tag = substr($raw, 12, 16);
            $ct  = substr($raw, 28);
            return openssl_decrypt($ct, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag) ?: $encrypted;
        } catch (\Throwable $e) {
            return $encrypted;
        }
    }
}

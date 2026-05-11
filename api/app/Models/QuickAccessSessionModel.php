<?php

namespace App\Models;

use CodeIgniter\Model;

class QuickAccessSessionModel extends Model
{
    protected $table      = 'quick_access_sessions';
    protected $primaryKey = 'id';

    protected $allowedFields = [
        'token_hash',
        'email',
        'client_ip',
        'otp_hash',
        'invoice_draft',
        'verified',
        'expires_at',
        'created_at',
    ];

    protected $useAutoIncrement = true;
    protected $useTimestamps    = false; // managed manually

    /**
     * Find a non-expired session by its token hash.
     */
    public function findByTokenHash(string $hash): ?array
    {
        return $this
            ->where('token_hash', $hash)
            ->where('expires_at >', date('Y-m-d H:i:s'))
            ->first();
    }

    /**
     * Mark a session as verified.
     */
    public function markVerified(int $id): void
    {
        $this->update($id, ['verified' => 1]);
    }

    /**
     * Remove all expired sessions (housekeeping).
     */
    public function pruneExpired(): void
    {
        $this->where('expires_at <', date('Y-m-d H:i:s'))->delete();
    }
}

<?php

namespace App\Models;

class WorkhubTranslationCacheModel extends BaseModel
{
    protected $table      = 'workhub_translation_cache';
    protected $primaryKey = 'id';

    protected $returnType     = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields  = true;

    protected $allowedFields = [
        'tenant_id', 'source_hash', 'source_lang', 'target_lang',
        'translated_text', 'expires_at',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = '';   // '' = disabled; false casts to int key 0 in CI4 setUpdatedField()

    /** DB cache TTL (spec §5.3: 7-day DB, 30-day Redis L2) */
    public const TTL_DAYS_DB    = 7;
    public const TTL_DAYS_REDIS = 30;

    private function cacheKey(int $tenantId, string $hash, string $sourceLang, string $targetLang): string
    {
        return "wh_trans_{$tenantId}_{$hash}_{$sourceLang}_{$targetLang}";
    }

    /**
     * Look up a cached translation.
     * Lookup order: L2 Redis (CI4 cache) → L1 DB.
     * On DB hit, backfill Redis for future fast-path lookups.
     */
    public function lookup(int $tenantId, string $sourceText, string $sourceLang, string $targetLang): ?string
    {
        $hash     = hash('sha256', $sourceText);
        $cacheKey = $this->cacheKey($tenantId, $hash, $sourceLang, $targetLang);

        // L2: Redis (or file-based CI4 cache if Redis not configured)
        $cached = cache($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        // L1: Database
        $row = $this->where('tenant_id', $tenantId)
            ->where('source_hash', $hash)
            ->where('source_lang', $sourceLang)
            ->where('target_lang', $targetLang)
            ->where('expires_at >', date('Y-m-d H:i:s'))
            ->first();

        if ($row !== null) {
            // Backfill L2 on DB hit so next request is served from Redis
            cache()->save($cacheKey, $row['translated_text'], self::TTL_DAYS_REDIS * 86400);
        }

        return $row['translated_text'] ?? null;
    }

    /**
     * Store a translation in both L2 (Redis) and L1 (DB).
     */
    public function store(int $tenantId, string $sourceText, string $sourceLang, string $targetLang, string $translatedText): void
    {
        $hash    = hash('sha256', $sourceText);
        $expires = date('Y-m-d H:i:s', strtotime('+' . self::TTL_DAYS_DB . ' days'));

        // Write to L2 first — fast path for next request
        $cacheKey = $this->cacheKey($tenantId, $hash, $sourceLang, $targetLang);
        cache()->save($cacheKey, $translatedText, self::TTL_DAYS_REDIS * 86400);

        // Upsert in DB — durable store (L1)
        $existing = $this->where('tenant_id', $tenantId)
            ->where('source_hash', $hash)
            ->where('source_lang', $sourceLang)
            ->where('target_lang', $targetLang)
            ->first();

        if ($existing) {
            $this->update($existing['id'], ['translated_text' => $translatedText, 'expires_at' => $expires]);
        } else {
            $this->insert([
                'tenant_id'       => $tenantId,
                'source_hash'     => $hash,
                'source_lang'     => $sourceLang,
                'target_lang'     => $targetLang,
                'translated_text' => $translatedText,
                'expires_at'      => $expires,
            ]);
        }
    }

    /**
     * Remove expired DB entries (run via scheduled command).
     * Redis entries expire automatically via their TTL.
     */
    public function purgeExpired(): int
    {
        $builder = \Config\Database::connect()->table($this->table);
        $builder->where('expires_at <', date('Y-m-d H:i:s'));
        $count = $builder->countAllResults(false);
        $builder->delete();
        return $count;
    }
}

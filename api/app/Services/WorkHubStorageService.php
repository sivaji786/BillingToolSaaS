<?php

namespace App\Services;

/**
 * Local-disk storage for WorkHub photos.
 *
 * Files are saved to WRITEPATH/uploads/workhub/{tenant_id}/{task_id}/{uuid}.{ext}
 * and served via the HMAC-signed proxy route /workhub/files/proxy (no S3/R2).
 */
class WorkHubStorageService
{
    private const URL_TTL_SECONDS = 900; // 15 minutes

    private const ALLOWED_MIMES = [
        'image/jpeg',
        'image/png',
        'image/heic',
        'image/heif',
    ];

    private const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

    // ---- Public API ----

    /**
     * Validate uploaded file and return normalised metadata.
     * Throws \RuntimeException on failure.
     *
     * @param  string $tmpPath  Absolute path to uploaded temp file
     * @param  int    $fileSize File size in bytes
     * @return array{mime: string, ext: string}
     */
    public function validateUpload(string $tmpPath, int $fileSize): array
    {
        if ($fileSize > self::MAX_BYTES) {
            throw new \RuntimeException('File size exceeds 10 MB limit.', 413);
        }

        $mime = $this->detectMime($tmpPath);

        if (!in_array($mime, self::ALLOWED_MIMES, true)) {
            throw new \RuntimeException(
                'Invalid file type. Only JPEG, PNG and HEIC images are accepted.',
                415
            );
        }

        return ['mime' => $mime, 'ext' => $this->mimeToExt($mime)];
    }

    /**
     * Build the storage key (relative path under writable/uploads/).
     * Pattern: workhub/{tenant_id}/{task_id}/{uuid}.{ext}
     */
    public function buildStorageKey(int $tenantId, int $taskId, string $uuid, string $ext): string
    {
        return sprintf('workhub/%d/%d/%s.%s', $tenantId, $taskId, $uuid, $ext);
    }

    /**
     * Generate an HMAC-signed proxy URL for a stored photo.
     * The signature replaces S3 presigning — no cloud storage involved.
     */
    public function presignUrl(string $storageKey, int $ttlSeconds = self::URL_TTL_SECONDS): string
    {
        $expires = time() + $ttlSeconds;
        $sig     = hash_hmac('sha256', $storageKey . $expires, env('APP_KEY', 'dev'));
        return rtrim(base_url(), '/') . '/workhub/files/proxy?'
            . http_build_query(['key' => $storageKey, 'exp' => $expires, 'sig' => $sig]);
    }

    /**
     * Save uploaded file to local disk.
     *
     * @param  string $tmpPath    PHP temp file path
     * @param  string $storageKey Relative key (from buildStorageKey)
     * @param  string $mime       Validated MIME type (unused locally, kept for interface consistency)
     * @return string             The storage key
     */
    public function upload(string $tmpPath, string $storageKey, string $mime): string
    {
        $localDir  = WRITEPATH . 'uploads/' . dirname($storageKey) . '/';
        $localPath = WRITEPATH . 'uploads/' . $storageKey;

        if (!is_dir($localDir) && !mkdir($localDir, 0755, true)) {
            throw new \RuntimeException('Failed to create upload directory: ' . $localDir);
        }
        if (!copy($tmpPath, $localPath)) {
            throw new \RuntimeException('Failed to write file to disk: ' . $localPath);
        }

        return $storageKey;
    }

    /**
     * Delete a stored photo from disk.
     */
    public function delete(string $storageKey): void
    {
        $localPath = WRITEPATH . 'uploads/' . $storageKey;
        if (file_exists($localPath)) {
            unlink($localPath);
        }
    }

    // ---- Private helpers ----

    private function detectMime(string $path): string
    {
        if (function_exists('finfo_open')) {
            $fi   = finfo_open(FILEINFO_MIME_TYPE);
            $mime = finfo_file($fi, $path);
            finfo_close($fi);
            return $mime ?: 'application/octet-stream';
        }
        return mime_content_type($path) ?: 'application/octet-stream';
    }

    private function mimeToExt(string $mime): string
    {
        return match ($mime) {
            'image/jpeg'        => 'jpg',
            'image/png'         => 'png',
            'image/heic',
            'image/heif'        => 'heic',
            default             => 'bin',
        };
    }
}

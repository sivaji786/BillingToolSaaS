<?php

namespace App\Services;

/**
 * WH-081: S3/R2 pre-signed URL generation and MIME validation for WorkHub photos.
 *
 * - All photo URLs returned to clients are pre-signed with 15-min expiry.
 * - Storage paths are prefixed workhub/{tenant_id}/{task_id}/{uuid} to prevent
 *   cross-tenant path traversal.
 * - Raw S3 bucket URLs are never returned to clients.
 * - MIME type is validated server-side via finfo (libmagic), not just extension.
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

        $ext = $this->mimeToExt($mime);

        return ['mime' => $mime, 'ext' => $ext];
    }

    /**
     * Build the S3 storage key for a photo.
     * Pattern: workhub/{tenant_id}/{task_id}/{uuid}.{ext}
     */
    public function buildStorageKey(int $tenantId, int $taskId, string $uuid, string $ext): string
    {
        return sprintf('workhub/%d/%d/%s.%s', $tenantId, $taskId, $uuid, $ext);
    }

    /**
     * Generate a pre-signed URL for an S3 object key.
     *
     * In production: uses AWS SDK v3 or Cloudflare R2 presign.
     * In development/test: returns a local proxy URL.
     */
    public function presignUrl(string $storageKey, int $ttlSeconds = self::URL_TTL_SECONDS): string
    {
        $s3Client = $this->getS3Client();

        if ($s3Client === null) {
            // Development fallback — local API proxy (HMAC-signed, same model as S3 presign)
            $expires = time() + $ttlSeconds;
            $sig     = hash_hmac('sha256', $storageKey . $expires, env('APP_KEY', 'dev'));
            return rtrim(base_url(), '/') . '/workhub/files/proxy?'
                . http_build_query(['key' => $storageKey, 'exp' => $expires, 'sig' => $sig]);
        }

        // AWS SDK v3 presign
        $bucket  = env('S3_BUCKET', '');
        $command = $s3Client->getCommand('GetObject', [
            'Bucket' => $bucket,
            'Key'    => $storageKey,
        ]);

        $presignedRequest = $s3Client->createPresignedRequest($command, "+{$ttlSeconds} seconds");
        return (string) $presignedRequest->getUri();
    }

    /**
     * Upload a file to S3/R2 and return the storage key.
     *
     * @param  string $tmpPath     Local temp file path
     * @param  string $storageKey  Target S3 key (from buildStorageKey)
     * @param  string $mime        Validated MIME type
     * @return string              Storage key on success
     */
    public function upload(string $tmpPath, string $storageKey, string $mime): string
    {
        $s3Client = $this->getS3Client();

        if ($s3Client === null) {
            // Development: move to local storage
            $localDir  = WRITEPATH . 'uploads/' . dirname($storageKey) . '/';
            $localPath = WRITEPATH . 'uploads/' . $storageKey;

            if (!is_dir($localDir)) mkdir($localDir, 0755, true);
            copy($tmpPath, $localPath);
            return $storageKey;
        }

        $bucket = env('S3_BUCKET', '');
        $s3Client->putObject([
            'Bucket'      => $bucket,
            'Key'         => $storageKey,
            'SourceFile'  => $tmpPath,
            'ContentType' => $mime,
            'ACL'         => 'private',
            'Metadata'    => [
                'uploaded-by' => 'workhub',
            ],
        ]);

        return $storageKey;
    }

    /**
     * Delete an S3 object. Called when a photo record is removed.
     */
    public function delete(string $storageKey): void
    {
        $s3Client = $this->getS3Client();

        if ($s3Client === null) {
            $localPath = WRITEPATH . 'uploads/' . $storageKey;
            if (file_exists($localPath)) unlink($localPath);
            return;
        }

        $s3Client->deleteObject([
            'Bucket' => env('S3_BUCKET', ''),
            'Key'    => $storageKey,
        ]);
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
        // Fallback — less reliable
        return mime_content_type($path) ?: 'application/octet-stream';
    }

    private function mimeToExt(string $mime): string
    {
        return match ($mime) {
            'image/jpeg'      => 'jpg',
            'image/png'       => 'png',
            'image/heic',
            'image/heif'      => 'heic',
            default           => 'bin',
        };
    }

    private function getS3Client(): ?object
    {
        $key    = env('AWS_ACCESS_KEY_ID', '');
        $secret = env('AWS_SECRET_ACCESS_KEY', '');
        $region = env('AWS_DEFAULT_REGION', 'eu-central-1');
        $bucket = env('S3_BUCKET', '');

        if (!$key || !$secret || !$bucket) {
            return null;
        }

        // Avoid hard-coding AWS SDK — resolved via Composer autoload
        if (!class_exists('\Aws\S3\S3Client')) {
            return null;
        }

        return new \Aws\S3\S3Client([
            'version'     => 'latest',
            'region'      => $region,
            'credentials' => ['key' => $key, 'secret' => $secret],
            'endpoint'    => env('S3_ENDPOINT') ?: null, // Cloudflare R2
        ]);
    }
}

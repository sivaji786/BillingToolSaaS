<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * WH-080: Rate limiting for /api/workhub/ai/* endpoints.
 *
 * Limits:
 *   - 60 requests/min per tenant (JWT sub claim)
 *   - 10 requests/min per user   (JWT user_id)
 *
 * Storage: file-based counter in writable/ratelimits/ (swap for Redis in prod).
 * Returns 429 with Retry-After header on breach.
 */
class WorkHubRateLimitFilter implements FilterInterface
{
    private const TENANT_LIMIT = 60;
    private const USER_LIMIT   = 10;
    private const WINDOW_SEC   = 60;

    public function before(RequestInterface $request, $arguments = null)
    {
        [$tenantId, $userId] = $this->resolveIdentity($request);

        if (!$tenantId && !$userId) {
            // Auth filter runs before this — if we have no identity, let auth reject it
            return null;
        }

        $now    = time();
        $window = (int) floor($now / self::WINDOW_SEC);

        // --- Tenant-level check ---
        if ($tenantId) {
            $result = $this->checkLimit("tenant:{$tenantId}:{$window}", self::TENANT_LIMIT);
            if ($result !== null) return $result;
        }

        // --- User-level check ---
        if ($userId) {
            $result = $this->checkLimit("user:{$userId}:{$window}", self::USER_LIMIT);
            if ($result !== null) return $result;
        }

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }

    // ---- Private helpers ----

    private function resolveIdentity(RequestInterface $request): array
    {
        $tenantId = null;
        $userId   = null;

        $bearer = $request->getHeaderLine('Authorization');
        if (!str_starts_with($bearer, 'Bearer ')) {
            return [null, null];
        }

        $token = substr($bearer, 7);

        try {
            $secret  = env('JWT_SECRET', '');
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
            $tenantId = $decoded->tenant_id ?? null;
            $userId   = $decoded->sub       ?? $decoded->user_id ?? null;
        } catch (\Throwable $e) {
            // Token invalid — let auth filter handle it
        }

        return [$tenantId, $userId];
    }

    private function checkLimit(string $key, int $maxRequests): ?\CodeIgniter\HTTP\Response
    {
        $dir  = WRITEPATH . 'ratelimits/';
        $file = $dir . sha1($key) . '.json';

        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $count = 1;
        if (file_exists($file)) {
            $data  = json_decode(file_get_contents($file), true) ?? [];
            $count = (int) ($data['count'] ?? 0) + 1;
        }

        file_put_contents($file, json_encode(['count' => $count, 'ts' => time()]), LOCK_EX);

        if ($count > $maxRequests) {
            $retryAfter = self::WINDOW_SEC - (time() % self::WINDOW_SEC);
            $response   = service('response');
            $response->setStatusCode(429)
                     ->setHeader('Retry-After', (string) $retryAfter)
                     ->setHeader('X-RateLimit-Limit', (string) $maxRequests)
                     ->setHeader('X-RateLimit-Remaining', '0')
                     ->setJSON([
                         'error'       => 'too_many_requests',
                         'message'     => 'Rate limit exceeded. Retry in ' . $retryAfter . ' seconds.',
                         'retry_after' => $retryAfter,
                     ]);
            return $response;
        }

        return null;
    }
}

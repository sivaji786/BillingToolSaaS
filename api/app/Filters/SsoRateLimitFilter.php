<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;

/**
 * Rate limits SSO callback endpoints: 10 attempts per IP per minute.
 * Prevents callback-replay and brute-force attacks (SSO-025).
 */
class SsoRateLimitFilter implements FilterInterface
{
    private const MAX_ATTEMPTS = 10;
    private const WINDOW_SECONDS = 60;

    public function before(RequestInterface $request, $arguments = null)
    {
        $ip       = $request->getIPAddress();
        $cacheKey = 'sso_rl_' . md5($ip);

        $cache = \Config\Services::cache();
        $count = (int) ($cache->get($cacheKey) ?? 0);

        if ($count >= self::MAX_ATTEMPTS) {
            log_message('warning', '[SSO RateLimit] IP ' . $ip . ' exceeded SSO callback limit');
            return Services::response()
                ->setJSON(['success' => false, 'message' => 'Too many SSO attempts. Please wait a minute.'])
                ->setStatusCode(429);
        }

        $cache->save($cacheKey, $count + 1, self::WINDOW_SECONDS);
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }
}

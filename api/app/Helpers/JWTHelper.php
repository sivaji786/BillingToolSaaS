<?php

namespace App\Helpers;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JWTHelper
{
    private static $secretKey;
    private static $algorithm = 'HS256';
    private static $expirationTime = 3600; // 1 hour

    public static function init()
    {
        // On shared hosting, getenv() and env() can be unreliable.
        // Check $_ENV and $_SERVER as well.
        self::$secretKey = env('JWT_SECRET') 
            ?? $_ENV['JWT_SECRET'] 
            ?? $_SERVER['JWT_SECRET'] 
            ?? getenv('JWT_SECRET') 
            ?? 'billing_tool_secret_key';
    }

    public static function getSecretKey()
    {
        self::init();
        return self::$secretKey;
    }

    /**
     * Generate JWT token
     */
    public static function generateToken($userId, $tenantId, $email, $name = null, $type = 'customer')
    {
        self::init();

        $issuedAt = time();
        $expirationTime = $issuedAt + self::$expirationTime;

        $payload = [
            'iat' => $issuedAt,
            'exp' => $expirationTime,
            'user_id' => $userId,   // Standard key
            'uid' => $userId,       // Backward compatibility key
            'tenant_id' => $tenantId, // Standard key (null for admin)
            'tid' => $tenantId,      // Backward compatibility key
            'email' => $email,
            'name' => $name,
            'type' => $type,        // NEW: 'admin' or 'customer'
        ];

        return JWT::encode($payload, self::$secretKey, self::$algorithm);
    }

    /**
     * Validate and decode JWT token
     */
    public static function validateToken($token)
    {
        self::init();

        try {
            $decoded = JWT::decode($token, new Key(self::$secretKey, self::$algorithm));
            return (array) $decoded;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Decode token without validation (for debugging)
     */
    public static function decodeToken($token)
    {
        self::init();

        try {
            $decoded = JWT::decode($token, new Key(self::$secretKey, self::$algorithm));
            return (array) $decoded;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Refresh token (generate new token with same data)
     */
    public static function refreshToken($token)
    {
        $decoded = self::validateToken($token);

        if (!$decoded) {
            return false;
        }

        return self::generateToken(
            $decoded['user_id'],
            $decoded['tenant_id'],
            $decoded['email'],
            $decoded['name'] ?? null
        );
    }

    /**
     * Extract user ID from token
     */
    public static function getUserIdFromToken($token)
    {
        $decoded = self::validateToken($token);
        return $decoded ? $decoded['user_id'] : null;
    }

    /**
     * Extract tenant ID from token
     */
    public static function getTenantIdFromToken($token)
    {
        $decoded = self::validateToken($token);
        return $decoded ? $decoded['tenant_id'] : null;
    }
}

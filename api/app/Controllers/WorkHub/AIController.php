<?php

namespace App\Controllers\WorkHub;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;
use App\Traits\PlanLimitTrait;
use App\Models\WorkhubTranslationCacheModel;

class AIController extends BaseController
{
    use ResponseTrait, AuditTrait, PlanLimitTrait;

    protected int $tenantId = 0;
    protected int $userId   = 0;

    private const MAX_INPUT_CHARS   = 2000;
    // Per-user rate: 60 calls/hour
    private const THROTTLE_LIMIT    = 60;
    private const THROTTLE_WINDOW   = HOUR;

    private function boot(): void
    {
        $tenant         = config('App')->currentTenant ?? null;
        $this->tenantId = (int) ($tenant->id ?? 0);
        $this->userId   = (int) ($this->request->userId ?? session()->get('userId') ?? 0);
    }

    // WH-027: POST /workhub/ai/correct
    public function correct(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        if (!$this->withinWorkhubAiCallLimit()) {
            return $this->fail('Monthly AI call limit reached. Please upgrade your plan.', 402);
        }

        if (!$this->checkThrottle('correct')) {
            return $this->fail('Rate limit exceeded. Maximum ' . self::THROTTLE_LIMIT . ' AI calls per hour.', 429);
        }

        $data = $this->request->getJSON(true) ?? [];
        $text = trim($data['text'] ?? '');

        if (strlen($text) < 5) {
            return $this->fail('text must be at least 5 characters.', 422);
        }
        if (strlen($text) > self::MAX_INPUT_CHARS) {
            return $this->fail('text must not exceed ' . self::MAX_INPUT_CHARS . ' characters.', 422);
        }

        $prompt = <<<PROMPT
You are a professional text editor. Correct the grammar, spelling, and punctuation of the following text.
Return ONLY valid JSON in exactly this structure — no markdown, no explanation:
{
  "corrected": "<corrected full text>",
  "changes": [
    {"type": "removed", "text": "<original segment>", "replacement": "<corrected segment>"}
  ]
}
If the text has no errors, return "changes": [] and "corrected" equal to the original.

TEXT TO CORRECT:
{$text}
PROMPT;

        try {
            $result = $this->callGemini($prompt);
        } catch (\Throwable $e) {
            $status = ($e->getCode() === 503) ? 503 : 500;
            return $this->fail('AI service temporarily unavailable. Please try again.' , $status);
        }

        $corrected = $result['corrected'] ?? $text;
        $changes   = $result['changes']   ?? [];

        $this->recordAiCall($text, 'correct');

        return $this->respond([
            'original'  => $text,
            'corrected' => $corrected,
            'changes'   => $changes,
            'identical' => ($corrected === $text || empty($changes)),
        ]);
    }

    // WH-028: POST /workhub/ai/translate
    public function translate(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        if (!$this->withinWorkhubAiCallLimit()) {
            return $this->fail('Monthly AI call limit reached. Please upgrade your plan.', 402);
        }

        if (!$this->checkThrottle('translate')) {
            return $this->fail('Rate limit exceeded. Maximum ' . self::THROTTLE_LIMIT . ' AI calls per hour.', 429);
        }

        $data       = $this->request->getJSON(true) ?? [];
        $text       = trim($data['text'] ?? '');
        $sourceLang = trim($data['source_lang'] ?? 'auto');
        $targetLang = trim($data['target_lang'] ?? '');

        if (strlen($text) < 1) {
            return $this->fail('text is required.', 422);
        }
        if (strlen($text) > self::MAX_INPUT_CHARS) {
            return $this->fail('text must not exceed ' . self::MAX_INPUT_CHARS . ' characters.', 422);
        }

        $allowedLangs = ['en', 'de', 'pl', 'fr', 'it'];
        if (!in_array($targetLang, $allowedLangs, true)) {
            return $this->fail('target_lang must be one of: ' . implode(', ', $allowedLangs), 422);
        }

        // Check translation cache first (SHA-256 hash key)
        $cacheModel = new WorkhubTranslationCacheModel();
        $cached     = $cacheModel->lookup($this->tenantId, $text, $sourceLang, $targetLang);

        if ($cached !== null) {
            return $this->respond([
                'translated'          => $cached,
                'detected_source_lang' => $sourceLang !== 'auto' ? $sourceLang : null,
                'from_cache'          => true,
            ]);
        }

        // Cache miss — call AI
        $langNames = ['en' => 'English', 'de' => 'German', 'pl' => 'Polish', 'fr' => 'French', 'it' => 'Italian'];
        $targetName = $langNames[$targetLang] ?? $targetLang;
        $sourceName = ($sourceLang === 'auto') ? 'auto-detected' : ($langNames[$sourceLang] ?? $sourceLang);

        $prompt = <<<PROMPT
Translate the following text into {$targetName}. The source language is {$sourceName}.
Return ONLY valid JSON in exactly this structure — no markdown, no explanation:
{
  "translated": "<translated text>",
  "detected_source_lang": "<ISO 639-1 code of detected source language>"
}

TEXT TO TRANSLATE:
{$text}
PROMPT;

        try {
            $result = $this->callGemini($prompt);
        } catch (\Throwable $e) {
            $status = ($e->getCode() === 503) ? 503 : 500;
            return $this->fail('AI service temporarily unavailable. Please try again.', $status);
        }

        $translated   = $result['translated']          ?? $text;
        $detectedLang = $result['detected_source_lang'] ?? $sourceLang;

        // Store in translation cache
        $effectiveSource = ($sourceLang === 'auto') ? $detectedLang : $sourceLang;
        $cacheModel->store($this->tenantId, $text, $effectiveSource, $targetLang, $translated);

        $this->recordAiCall($text, 'translate');

        return $this->respond([
            'translated'          => $translated,
            'detected_source_lang' => $detectedLang,
            'from_cache'          => false,
        ]);
    }

    // ---- private helpers ----

    private function callGemini(string $prompt): array
    {
        $apiKey = env('GEMINI_API_KEY');
        if (empty($apiKey) || $apiKey === 'YOUR_GEMINI_API_KEY') {
            throw new \Exception('Gemini API key not configured.');
        }

        $client  = \Config\Services::curlrequest();
        $baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/';
        $models  = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
        $payload = [
            'contents'         => [['parts' => [['text' => $prompt]]]],
            'generationConfig' => ['response_mime_type' => 'application/json'],
        ];

        $lastError   = '';
        $lastStatus  = 500;

        foreach ($models as $attempt => $model) {
            if ($attempt > 0) {
                sleep(1); // brief pause before trying next model
            }

            $url      = $baseUrl . $model . ':generateContent?key=' . $apiKey;
            $response = $client->post($url, [
                'headers'     => ['Content-Type' => 'application/json'],
                'json'        => $payload,
                'http_errors' => false,
            ]);

            $statusCode = $response->getStatusCode();

            if ($statusCode === 200) {
                $body    = json_decode((string) $response->getBody(), true);
                $rawText = $body['candidates'][0]['content']['parts'][0]['text'] ?? '{}';
                $decoded = json_decode($rawText, true);

                if (!is_array($decoded)) {
                    throw new \Exception('Gemini returned non-JSON output.');
                }

                return $decoded;
            }

            $err        = json_decode((string) $response->getBody(), true);
            $lastError  = $err['error']['message'] ?? ('Gemini ' . $model . ' returned ' . $statusCode);
            $lastStatus = $statusCode;

            log_message('warning', '[WorkHub AI] ' . $model . ' returned ' . $statusCode . ': ' . $lastError);

            // Only retry on transient errors (503 overloaded, 429 rate-limit)
            if (!in_array($statusCode, [429, 503], true)) {
                break;
            }
        }

        // Surface transient upstream errors with 503 so callers know to retry
        $isTransient = in_array($lastStatus, [429, 503], true);
        throw new \RuntimeException($lastError, $isTransient ? 503 : 500);
    }

    private function checkThrottle(string $action): bool
    {
        $throttler = \Config\Services::throttler();
        $key       = 'wh_ai_' . $action . '_' . sha1($this->tenantId . ':' . $this->userId);
        return $throttler->check($key, self::THROTTLE_LIMIT, self::THROTTLE_WINDOW);
    }

    private function recordAiCall(string $prompt, string $action): void
    {
        try {
            \Config\Database::connect()->table('aiquery_history')->insert([
                'tenant_id'  => $this->tenantId,
                'user_id'    => $this->userId,
                'prompt'     => mb_substr($prompt, 0, 500),
                'source'     => 'workhub',
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) {
            log_message('warning', '[WorkHub AI] Failed to record AI call: ' . $e->getMessage());
        }

        $this->logAction('workhub.ai.' . $action, 'WH-ai-' . $this->userId, 'WorkHub AI call: ' . $action);
    }
}

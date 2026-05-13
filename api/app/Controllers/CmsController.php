<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\CmsPageModel;

class CmsController extends ResourceController
{
    use ResponseTrait;

    private const SUPPORTED_LANGS = ['en', 'de', 'ar', 'pl'];
    private const DEFAULT_LANG = 'en';

    /**
     * Get page content by slug with language fallback (Public)
     * GET /api/public/cms/(:segment)?lang=de
     */
    public function getPage($slug)
    {
        $lang = $this->request->getGet('lang') ?? self::DEFAULT_LANG;
        if (!in_array($lang, self::SUPPORTED_LANGS)) {
            $lang = self::DEFAULT_LANG;
        }

        $model = new CmsPageModel();

        // Try requested language first
        $page = $model->where('slug', $slug)->where('lang', $lang)->first();
        $isFallback = false;

        // Fall back to default language
        if (!$page && $lang !== self::DEFAULT_LANG) {
            $page = $model->where('slug', $slug)->where('lang', self::DEFAULT_LANG)->first();
            $isFallback = true;
        }

        if (!$page) {
            // Return empty page so public pages degrade gracefully without a 404
            return $this->respond([
                'success'        => true,
                'data'           => [
                    'slug'               => $slug,
                    'lang'               => $lang,
                    'title'              => '',
                    'content'            => '{}',
                    'content_structured' => null,
                    'meta_description'   => '',
                    'is_fallback'        => false,
                    'requested_lang'     => $lang,
                ]
            ]);
        }

        $decodedContent = json_decode($page['content'], true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $page['content_structured'] = $decodedContent;
        }

        $page['is_fallback'] = $isFallback;
        $page['requested_lang'] = $lang;

        return $this->respond([
            'success' => true,
            'data' => $page
        ]);
    }

    /**
     * List all manageable pages for a given language (Admin only)
     * GET /api/admin/cms?lang=de
     */
    public function listPages()
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        $lang = $this->request->getGet('lang') ?? self::DEFAULT_LANG;
        if (!in_array($lang, self::SUPPORTED_LANGS)) {
            $lang = self::DEFAULT_LANG;
        }

        $model = new CmsPageModel();

        // Fetch pages for requested lang; for any missing slug fall back to default lang
        $langPages = $model->where('lang', $lang)->findAll();
        $langPagesBySlug = array_column($langPages, null, 'slug');

        // Also fetch default lang pages so we can fill gaps
        $defaultPages = [];
        if ($lang !== self::DEFAULT_LANG) {
            $defaultRows = $model->where('lang', self::DEFAULT_LANG)->findAll();
            $defaultPages = array_column($defaultRows, null, 'slug');
        }

        $result = [];
        $allSlugs = array_unique([...array_keys($langPagesBySlug), ...array_keys($defaultPages)]);

        foreach ($allSlugs as $slug) {
            if (isset($langPagesBySlug[$slug])) {
                $row = $langPagesBySlug[$slug];
                $row['is_fallback'] = false;
            } else {
                $row = $defaultPages[$slug];
                $row['is_fallback'] = true;
            }
            $row['requested_lang'] = $lang;
            $result[] = $row;
        }

        return $this->respond([
            'success' => true,
            'data' => $result
        ]);
    }

    /**
     * Create or update page content for a specific language (Admin only)
     * PUT /api/admin/cms/(:segment)
     * Body: { lang: 'de', title: '...', content: '...', meta_description: '...' }
     */
    public function updatePage($slug)
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        $input = $this->request->getJSON(true);

        $lang = $input['lang'] ?? self::DEFAULT_LANG;
        if (!in_array($lang, self::SUPPORTED_LANGS)) {
            $lang = self::DEFAULT_LANG;
        }

        $model = new CmsPageModel();
        $existing = $model->where('slug', $slug)->where('lang', $lang)->first();

        $data = [
            'slug'       => $slug,
            'lang'       => $lang,
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        if (isset($input['title']))            $data['title']            = $input['title'];
        if (isset($input['meta_description'])) $data['meta_description'] = $input['meta_description'];
        if (isset($input['show_in_nav']))      $data['show_in_nav']      = (int)(bool)$input['show_in_nav'];
        if (isset($input['nav_label']))        $data['nav_label']        = $input['nav_label'];
        if (isset($input['nav_order']))        $data['nav_order']        = (int)$input['nav_order'];
        if (isset($input['is_published']))     $data['is_published']     = (int)(bool)$input['is_published'];
        if (isset($input['content'])) {
            $data['content'] = is_array($input['content']) ? json_encode($input['content']) : $input['content'];
        }

        if ($existing) {
            $model->update($existing['id'], $data);
        } else {
            // When creating a new language variant, copy title from default lang if not provided
            if (!isset($data['title'])) {
                $defaultPage = $model->where('slug', $slug)->where('lang', self::DEFAULT_LANG)->first();
                if ($defaultPage) {
                    $data['title'] = $defaultPage['title'];
                }
            }
            $model->insert($data);
        }

        return $this->respond([
            'success' => true,
            'message' => 'Page updated successfully'
        ]);
    }

    /**
     * Patch a single field on a CMS page (Admin only)
     * PATCH /api/admin/cms/(:segment)
     * Body: { lang, field, value }
     */
    public function patchField($slug)
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        $input = $this->request->getJSON(true);

        $lang = $input['lang'] ?? self::DEFAULT_LANG;
        if (!in_array($lang, self::SUPPORTED_LANGS)) {
            $lang = self::DEFAULT_LANG;
        }

        $field = $input['field'] ?? null;
        $value = $input['value'] ?? null;

        $model = new CmsPageModel();
        $page  = $model->where('slug', $slug)->where('lang', $lang)->first();

        if (!$page) {
            return $this->failNotFound('Page not found');
        }

        // Scalar columns that can be updated directly
        $directFields = ['title', 'meta_description', 'show_in_nav', 'nav_label', 'nav_order', 'page_template', 'is_published', 'content'];

        if (in_array($field, $directFields, true)) {
            // 'content' for legal pages — store raw HTML directly
            $model->update($page['id'], [
                $field       => $value,
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
        } else {
            // Structured JSON field inside 'content' (e.g. home page blocks)
            $structured = json_decode($page['content'], true) ?? [];
            $structured[$field] = $value;
            $model->update($page['id'], [
                'content'    => json_encode($structured, JSON_UNESCAPED_UNICODE),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
        }

        return $this->respond([
            'success' => true,
            'message' => 'Field updated successfully'
        ]);
    }

    /**
     * Return nav items for published pages (Public)
     * GET /api/public/cms/nav?lang=de
     */
    public function nav()
    {
        $lang = $this->request->getGet('lang') ?? self::DEFAULT_LANG;
        if (!in_array($lang, self::SUPPORTED_LANGS)) {
            $lang = self::DEFAULT_LANG;
        }

        $model = new CmsPageModel();

        // Fetch nav-enabled, published pages for requested language
        $rows = $model
            ->where('show_in_nav', 1)
            ->where('is_published', 1)
            ->where('lang', $lang)
            ->orderBy('nav_order', 'ASC')
            ->findAll();

        // If requested lang is not the default, fill in any slugs that are missing
        // by falling back to the default language
        if ($lang !== self::DEFAULT_LANG) {
            $foundSlugs = array_column($rows, 'slug');

            $fallbacks = $model
                ->where('show_in_nav', 1)
                ->where('is_published', 1)
                ->where('lang', self::DEFAULT_LANG)
                ->whereNotIn('slug', empty($foundSlugs) ? ['__none__'] : $foundSlugs)
                ->orderBy('nav_order', 'ASC')
                ->findAll();

            $rows = [...$rows, ...$fallbacks];

            // Re-sort merged list by nav_order
            usort($rows, fn($a, $b) => $a['nav_order'] <=> $b['nav_order']);
        }

        $result = array_map(fn($r) => [
            'slug'          => $r['slug'],
            'title'         => $r['title'],
            'nav_label'     => $r['nav_label'],
            'nav_order'     => (int) $r['nav_order'],
            'page_template' => $r['page_template'],
            'lang'          => $r['lang'],
        ], $rows);

        return $this->response->setHeader('Cache-Control', 'public, max-age=300')->setJSON([
            'success' => true,
            'data'    => $result,
        ])->setStatusCode(200);
    }

    /**
     * Upload an image for CMS use (Admin only)
     * POST /api/admin/cms/upload-image
     * Accepts JSON { image: 'data:image/...;base64,...' } OR multipart file field 'file'
     */
    public function uploadImage()
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        $year  = date('Y');
        $month = date('m');
        $dir   = FCPATH . "uploads/cms/{$year}/{$month}/";

        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $filename = 'cms_' . time() . '_' . uniqid() . '.jpg';
        $fullPath = $dir . $filename;

        $contentType = $this->request->getHeaderLine('Content-Type');

        if (strpos($contentType, 'application/json') !== false) {
            // --- Base64 path ---
            $input  = $this->request->getJSON(true);
            $base64 = $input['image'] ?? null;

            if (!$base64) {
                return $this->fail('Missing image data', 400);
            }

            // Strip data URI prefix if present
            if (preg_match('/^data:image\/\w+;base64,/', $base64)) {
                $base64 = preg_replace('/^data:image\/\w+;base64,/', '', $base64);
            }

            $imageData = base64_decode($base64, true);
            if ($imageData === false) {
                return $this->fail('Invalid base64 image data', 400);
            }

            $img = @imagecreatefromstring($imageData);
            if ($img === false) {
                return $this->fail('Cannot decode image', 400);
            }

            imagejpeg($img, $fullPath, 90);
            unset($img); // free GD resource; imagedestroy() is deprecated since PHP 8.5
        } else {
            // --- Multipart file path ---
            $file = $this->request->getFile('file');

            if (!$file || !$file->isValid()) {
                return $this->fail('No valid file uploaded', 400);
            }

            $allowedMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!in_array($file->getMimeType(), $allowedMime, true)) {
                return $this->fail('Invalid image type', 400);
            }

            $file->move($dir, $filename);
        }

        $url = "uploads/cms/{$year}/{$month}/{$filename}";

        return $this->respond([
            'success' => true,
            'url'     => $url,
        ]);
    }

    /**
     * Delete all language variants of a CMS page (Admin only)
     * DELETE /api/admin/cms/(:segment)
     */
    public function deletePage($slug)
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        if ($slug === 'home') {
            return $this->fail('Cannot delete the home page', 403);
        }

        $model = new CmsPageModel();
        $model->where('slug', $slug)->delete();

        return $this->respond([
            'success' => true,
        ]);
    }
}

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
            return $this->failNotFound('Page not found');
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
        $allSlugs = array_unique(array_merge(
            array_keys($langPagesBySlug),
            array_keys($defaultPages)
        ));

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

        if (isset($input['title'])) $data['title'] = $input['title'];
        if (isset($input['meta_description'])) $data['meta_description'] = $input['meta_description'];
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
}

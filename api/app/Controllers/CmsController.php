<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\CmsPageModel;
use App\Models\CmsPageVersionModel;
use App\Models\CmsMediaModel;

class CmsController extends ResourceController
{
    use ResponseTrait;

    private const SUPPORTED_LANGS = ['en', 'de', 'ar', 'pl'];
    private const DEFAULT_LANG    = 'en';

    // Scalar columns patchable directly on the row
    private const DIRECT_FIELDS = [
        'title', 'meta_description', 'show_in_nav', 'nav_label', 'nav_order',
        'page_template', 'is_published', 'published_at', 'content',
        'nav_position', 'parent_id', 'link_url', 'link_target', 'footer_group',
        'meta_title', 'og_description', 'og_image',
    ];

    // -------------------------------------------------------------------------
    // Public: GET /api/public/cms/(:segment)?lang=de
    // -------------------------------------------------------------------------
    public function getPage($slug)
    {
        $lang = $this->resolveLang($this->request->getGet('lang'));
        $model = new CmsPageModel();

        $page = $model->where('slug', $slug)->where('lang', $lang)->first();
        $isFallback = false;

        if (!$page && $lang !== self::DEFAULT_LANG) {
            $page = $model->where('slug', $slug)->where('lang', self::DEFAULT_LANG)->first();
            $isFallback = true;
        }

        if (!$page) {
            return $this->respond([
                'success' => true,
                'data'    => [
                    'slug'               => $slug,
                    'lang'               => $lang,
                    'title'              => '',
                    'content'            => '{}',
                    'content_structured' => null,
                    'meta_description'   => '',
                    'meta_title'         => '',
                    'og_description'     => '',
                    'og_image'           => '',
                    'is_fallback'        => false,
                    'requested_lang'     => $lang,
                ]
            ]);
        }

        $decodedContent = json_decode($page['content'], true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $page['content_structured'] = $decodedContent;
        }

        $page['is_fallback']    = $isFallback;
        $page['requested_lang'] = $lang;

        return $this->respond(['success' => true, 'data' => $page]);
    }

    // -------------------------------------------------------------------------
    // Admin: GET /api/admin/cms?lang=de
    // -------------------------------------------------------------------------
    public function listPages()
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        $lang = $this->resolveLang($this->request->getGet('lang'));
        $model = new CmsPageModel();

        $langPages        = $model->where('lang', $lang)->findAll();
        $langPagesBySlug  = array_column($langPages, null, 'slug');

        $defaultPages = [];
        if ($lang !== self::DEFAULT_LANG) {
            $defaultRows  = $model->where('lang', self::DEFAULT_LANG)->findAll();
            $defaultPages = array_column($defaultRows, null, 'slug');
        }

        $allSlugs = array_unique([...array_keys($langPagesBySlug), ...array_keys($defaultPages)]);
        $result   = [];

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

        return $this->respond(['success' => true, 'data' => $result]);
    }

    // -------------------------------------------------------------------------
    // Admin: PUT /api/admin/cms/(:segment)
    // -------------------------------------------------------------------------
    public function updatePage($slug)
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        $input = $this->request->getJSON(true);
        $lang  = $this->resolveLang($input['lang'] ?? null);
        $model = new CmsPageModel();
        $existing = $model->where('slug', $slug)->where('lang', $lang)->first();

        $data = [
            'slug'       => $slug,
            'lang'       => $lang,
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        // Scalar fields — map input → row
        $scalars = [
            'title', 'meta_description', 'show_in_nav', 'nav_label', 'nav_order',
            'is_published', 'published_at', 'page_template',
            'nav_position', 'link_url', 'link_target', 'footer_group',
            'meta_title', 'og_description', 'og_image',
        ];
        foreach ($scalars as $f) {
            if (!array_key_exists($f, $input)) continue;
            $data[$f] = match($f) {
                'show_in_nav', 'is_published' => (int)(bool)$input[$f],
                'nav_order', 'parent_id'      => $input[$f] === null ? null : (int)$input[$f],
                default                        => $input[$f],
            };
        }
        if (array_key_exists('parent_id', $input)) {
            $data['parent_id'] = $input['parent_id'] === null ? null : (int)$input['parent_id'];
        }
        if (isset($input['content'])) {
            $data['content'] = is_array($input['content'])
                ? json_encode($input['content'], JSON_UNESCAPED_UNICODE)
                : $input['content'];
        }

        if ($existing) {
            $model->update($existing['id'], $data);
        } else {
            if (!isset($data['title'])) {
                $def = $model->where('slug', $slug)->where('lang', self::DEFAULT_LANG)->first();
                if ($def) $data['title'] = $def['title'];
            }
            $model->insert($data);
        }

        return $this->respond(['success' => true, 'message' => 'Page updated successfully']);
    }

    // -------------------------------------------------------------------------
    // Admin: PATCH /api/admin/cms/(:segment)
    // Body: { lang, field, value }
    // -------------------------------------------------------------------------
    public function patchField($slug)
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        $input = $this->request->getJSON(true);
        $lang  = $this->resolveLang($input['lang'] ?? null);
        $field = $input['field'] ?? null;
        $value = $input['value'] ?? null;

        $model = new CmsPageModel();
        $page  = $model->where('slug', $slug)->where('lang', $lang)->first();

        if (!$page) return $this->failNotFound('Page not found');

        if (in_array($field, self::DIRECT_FIELDS, true)) {
            $model->update($page['id'], [
                $field       => $value,
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
        } else {
            // Nested JSON key inside the content blob (home page blocks, etc.)
            $structured       = json_decode($page['content'], true) ?? [];
            $structured[$field] = $value;
            $model->update($page['id'], [
                'content'    => json_encode($structured, JSON_UNESCAPED_UNICODE),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
        }

        return $this->respond(['success' => true, 'message' => 'Field updated successfully']);
    }

    // -------------------------------------------------------------------------
    // Public: GET /api/public/cms/nav?lang=de
    // Returns structured { top: [...], bottom: [...] } with nested children.
    // -------------------------------------------------------------------------
    public function nav()
    {
        $lang  = $this->resolveLang($this->request->getGet('lang'));
        $model = new CmsPageModel();

        $rows = $this->fetchNavRows($model, $lang);

        $top    = [];
        $bottom = [];

        foreach ($rows as $r) {
            // Skip children — they are embedded inside their parent
            if (!empty($r['parent_id'])) continue;

            $item = $this->formatNavItem($r, $rows);

            if ($r['nav_position'] === 'top' || $r['nav_position'] === 'both') {
                $top[] = $item;
            }
            if ($r['nav_position'] === 'bottom' || $r['nav_position'] === 'both') {
                $bottom[] = $item;
            }
        }

        // Sort each list by nav_order
        $sort = fn($a, $b) => $a['nav_order'] <=> $b['nav_order'];
        usort($top,    $sort);
        usort($bottom, $sort);

        return $this->response
            ->setHeader('Cache-Control', 'public, max-age=300')
            ->setJSON(['success' => true, 'data' => ['top' => $top, 'bottom' => $bottom]])
            ->setStatusCode(200);
    }

    // -------------------------------------------------------------------------
    // Admin: PATCH /api/admin/cms/nav/reorder
    // Body: { items: [ { slug, nav_order }, ... ] }
    // -------------------------------------------------------------------------
    public function reorderNav()
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        $input = $this->request->getJSON(true);
        $items = $input['items'] ?? [];

        if (!is_array($items) || empty($items)) {
            return $this->fail('items array is required', 400);
        }

        $model = new CmsPageModel();

        foreach ($items as $item) {
            $slug      = $item['slug'] ?? null;
            $navOrder  = isset($item['nav_order']) ? (int)$item['nav_order'] : null;
            $parentId  = array_key_exists('parent_id', $item)
                ? ($item['parent_id'] === null ? null : (int)$item['parent_id'])
                : false; // false means "not provided"

            if (!$slug || $navOrder === null) continue;

            $update = ['nav_order' => $navOrder, 'updated_at' => date('Y-m-d H:i:s')];
            if ($parentId !== false) {
                $update['parent_id'] = $parentId;
            }

            // Update all language variants together so order stays consistent
            $model->where('slug', $slug)->set($update)->update();
        }

        return $this->respond(['success' => true, 'message' => 'Navigation reordered']);
    }

    // -------------------------------------------------------------------------
    // Admin: POST /api/admin/cms/versions/:slug  — save a version snapshot
    // Body: { lang }
    // -------------------------------------------------------------------------
    public function saveVersion($slug)
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        $input = $this->request->getJSON(true);
        $lang  = $this->resolveLang($input['lang'] ?? null);

        $pageModel = new CmsPageModel();
        $page = $pageModel->where('slug', $slug)->where('lang', $lang)->first();
        if (!$page) return $this->failNotFound('Page not found');

        $versionModel = new CmsPageVersionModel();
        $versionModel->insert([
            'page_id'        => $page['id'],
            'slug'           => $slug,
            'lang'           => $lang,
            'content'        => $page['content'],
            'saved_by_label' => $admin['email'] ?? 'admin',
            'saved_at'       => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Version saved']);
    }

    // -------------------------------------------------------------------------
    // Admin: GET /api/admin/cms/versions/:slug?lang=en
    // -------------------------------------------------------------------------
    public function listVersions($slug)
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        $lang = $this->resolveLang($this->request->getGet('lang'));

        $versionModel = new CmsPageVersionModel();
        $versions = $versionModel
            ->where('slug', $slug)
            ->where('lang', $lang)
            ->orderBy('saved_at', 'DESC')
            ->findAll(20);

        return $this->respond(['success' => true, 'data' => $versions]);
    }

    // -------------------------------------------------------------------------
    // Admin: POST /api/admin/cms/versions/restore/:id  — restore a version
    // -------------------------------------------------------------------------
    public function restoreVersion($id)
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        $versionModel = new CmsPageVersionModel();
        $version = $versionModel->find($id);
        if (!$version) return $this->failNotFound('Version not found');

        $pageModel = new CmsPageModel();
        $page = $pageModel->where('slug', $version['slug'])->where('lang', $version['lang'])->first();
        if (!$page) return $this->failNotFound('Page not found');

        $pageModel->update($page['id'], [
            'content'    => $version['content'],
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Version restored']);
    }

    // -------------------------------------------------------------------------
    // Admin: GET /api/admin/cms/media
    // -------------------------------------------------------------------------
    public function listMedia()
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        $mediaModel = new CmsMediaModel();
        $items = $mediaModel->orderBy('created_at', 'DESC')->findAll(100);

        return $this->respond(['success' => true, 'data' => $items]);
    }

    // -------------------------------------------------------------------------
    // Admin: DELETE /api/admin/cms/media/:id
    // -------------------------------------------------------------------------
    public function deleteMedia($id)
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        $mediaModel = new CmsMediaModel();
        $item = $mediaModel->find($id);
        if (!$item) return $this->failNotFound('Media not found');

        // Remove the file from disk
        $filePath = FCPATH . $item['url'];
        if (file_exists($filePath)) {
            @unlink($filePath);
        }

        $mediaModel->delete($id);

        return $this->respond(['success' => true]);
    }

    // -------------------------------------------------------------------------
    // Admin: PATCH /api/admin/cms/media/:id  — update alt text
    // Body: { alt_text }
    // -------------------------------------------------------------------------
    public function updateMedia($id)
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        $input = $this->request->getJSON(true);
        $mediaModel = new CmsMediaModel();
        $item = $mediaModel->find($id);
        if (!$item) return $this->failNotFound('Media not found');

        $mediaModel->update($id, ['alt_text' => $input['alt_text'] ?? '']);

        return $this->respond(['success' => true]);
    }

    // -------------------------------------------------------------------------
    // Admin: POST /api/admin/cms/upload-image
    // -------------------------------------------------------------------------
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
            $input  = $this->request->getJSON(true);
            $base64 = $input['image'] ?? null;

            if (!$base64) return $this->fail('Missing image data', 400);

            if (preg_match('/^data:image\/\w+;base64,/', $base64)) {
                $base64 = preg_replace('/^data:image\/\w+;base64,/', '', $base64);
            }

            $imageData = base64_decode($base64, true);
            if ($imageData === false) return $this->fail('Invalid base64 image data', 400);

            $img = @imagecreatefromstring($imageData);
            if ($img === false) return $this->fail('Cannot decode image', 400);

            imagejpeg($img, $fullPath, 90);
            unset($img);
        } else {
            $file = $this->request->getFile('file');

            if (!$file || !$file->isValid()) return $this->fail('No valid file uploaded', 400);

            $allowedMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!in_array($file->getMimeType(), $allowedMime, true)) {
                return $this->fail('Invalid image type', 400);
            }

            $file->move($dir, $filename);
        }

        $url = "uploads/cms/{$year}/{$month}/{$filename}";

        // Record in media library
        $mediaModel = new CmsMediaModel();
        $imgInfo = @getimagesize(FCPATH . $url);
        $mediaModel->insert([
            'filename'           => $filename,
            'url'                => $url,
            'width'              => $imgInfo[0] ?? null,
            'height'             => $imgInfo[1] ?? null,
            'file_size'          => @filesize(FCPATH . $url) ?: null,
            'uploaded_by_label'  => $admin['email'] ?? 'admin',
            'created_at'         => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'url' => $url]);
    }

    // -------------------------------------------------------------------------
    // Admin: DELETE /api/admin/cms/(:segment)
    // -------------------------------------------------------------------------
    public function deletePage($slug)
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        if ($slug === 'home') {
            return $this->fail('Cannot delete the home page', 403);
        }

        $model = new CmsPageModel();
        $model->where('slug', $slug)->delete();

        return $this->respond(['success' => true]);
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    private function resolveLang(?string $lang): string
    {
        if ($lang && in_array($lang, self::SUPPORTED_LANGS, true)) {
            return $lang;
        }
        return self::DEFAULT_LANG;
    }

    /**
     * Fetch all nav-enabled, published pages for a language with default-lang fallback.
     */
    private function fetchNavRows(CmsPageModel $model, string $lang): array
    {
        $rows = $model
            ->where('show_in_nav', 1)
            ->where('is_published', 1)
            ->where('lang', $lang)
            ->orderBy('nav_order', 'ASC')
            ->findAll();

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
            usort($rows, fn($a, $b) => $a['nav_order'] <=> $b['nav_order']);
        }

        return $rows;
    }

    /**
     * Format a single nav item, embedding any direct children from $allRows.
     */
    private function formatNavItem(array $r, array $allRows): array
    {
        $id = (int)$r['id'];

        $children = [];
        foreach ($allRows as $child) {
            if ((int)$child['parent_id'] !== $id) continue;
            $children[] = $this->formatNavItem($child, $allRows);
        }
        usort($children, fn($a, $b) => $a['nav_order'] <=> $b['nav_order']);

        return [
            'id'           => $id,
            'slug'         => $r['slug'],
            'title'        => $r['title'],
            'nav_label'    => $r['nav_label'],
            'nav_order'    => (int)$r['nav_order'],
            'nav_position' => $r['nav_position'] ?? 'none',
            'footer_group' => $r['footer_group'] ?? null,
            'link_url'     => $r['link_url'] ?? null,
            'link_target'  => $r['link_target'] ?? '_self',
            'page_template'=> $r['page_template'],
            'lang'         => $r['lang'],
            'children'     => $children,
        ];
    }
}

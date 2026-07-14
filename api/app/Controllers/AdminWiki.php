<?php

declare(strict_types=1);

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class AdminWiki extends ResourceController
{
    use ResponseTrait;

    protected string $baseDocsPath;

    /** Supported language codes */
    private const SUPPORTED_LANGS = ['en', 'de', 'ar'];

    public function __construct()
    {
        $this->baseDocsPath = realpath(ROOTPATH . '../docs') . DIRECTORY_SEPARATOR;
    }

    /**
     * Resolve the docs path for the requested language.
     * Falls back to 'en' if the language folder does not exist.
     */
    private function resolveDocsPath(string $lang): string
    {
        $lang = in_array($lang, self::SUPPORTED_LANGS, true) ? $lang : 'en';
        $langPath = $this->baseDocsPath . $lang . DIRECTORY_SEPARATOR;

        // Fallback to root docs/en/ or bare docs/ directory
        if (is_dir($langPath)) {
            return $langPath;
        }

        $enPath = $this->baseDocsPath . 'en' . DIRECTORY_SEPARATOR;
        return is_dir($enPath) ? $enPath : $this->baseDocsPath;
    }

    public function index(): \CodeIgniter\HTTP\ResponseInterface
    {
        $lang = $this->request->getGet('lang') ?? 'en';
        $docsPath = $this->resolveDocsPath($lang);

        if (!is_dir($docsPath)) {
            return $this->failNotFound('Docs directory not found.');
        }

        $tree = $this->scanDirectory($docsPath);
        return $this->respond($tree);
    }

    public function create(): \CodeIgniter\HTTP\ResponseInterface
    {
        $body = $this->request->getJSON(true);
        $path = trim($body['path'] ?? '', '/');
        $lang = $body['lang'] ?? 'en';

        if (empty($path)) {
            return $this->fail('Path is required.');
        }

        if (!str_ends_with($path, '.md')) {
            $path .= '.md';
        }

        // Reject traversal segments without relying on realpath() (file does not exist yet)
        $segments = explode('/', str_replace('\\', '/', $path));
        foreach ($segments as $seg) {
            if ($seg === '..' || $seg === '.') {
                return $this->failForbidden('Invalid path.');
            }
        }

        $docsPath = $this->resolveDocsPath($lang);
        $fullPath = $docsPath . implode(DIRECTORY_SEPARATOR, $segments);

        if (file_exists($fullPath)) {
            return $this->fail('Document already exists.');
        }

        $dir = dirname($fullPath);
        if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
            return $this->failServerError('Could not create directory.');
        }

        $title = ucwords(str_replace(['-', '_'], ' ', pathinfo($path, PATHINFO_FILENAME)));
        file_put_contents($fullPath, "# {$title}\n\n");

        return $this->respond(['success' => true, 'path' => implode('/', $segments)]);
    }

    public function write(): \CodeIgniter\HTTP\ResponseInterface
    {
        $body    = $this->request->getJSON(true);
        $path    = $body['path']    ?? null;
        $content = $body['content'] ?? null;
        $lang    = $body['lang']    ?? 'en';

        if (empty($path) || $content === null) {
            return $this->fail('Path and content are required.');
        }

        if (!str_ends_with($path, '.md')) {
            return $this->failForbidden('Only .md files may be written.');
        }

        $docsPath = $this->resolveDocsPath($lang);
        $fullPath = realpath($docsPath . $path);

        if (!$fullPath || strpos($fullPath, realpath($docsPath)) !== 0) {
            return $this->failForbidden('Invalid path.');
        }

        file_put_contents($fullPath, $content);

        return $this->respond(['success' => true]);
    }

    public function read(): \CodeIgniter\HTTP\ResponseInterface
    {
        $path = $this->request->getGet('path');
        $lang = $this->request->getGet('lang') ?? 'en';

        if (empty($path)) {
            return $this->fail('Path parameter is required.');
        }

        $docsPath = $this->resolveDocsPath($lang);

        // Security: Prevent directory traversal
        $fullPath = realpath($docsPath . $path);

        if (!$fullPath || strpos($fullPath, realpath($docsPath)) !== 0) {
            return $this->failForbidden('Invalid path access.');
        }

        if (!is_file($fullPath)) {
            return $this->failNotFound('Document not found.');
        }

        $content = file_get_contents($fullPath);
        return $this->respond([
            'content'  => $content,
            'filename' => basename($fullPath),
            'lang'     => $lang,
        ]);
    }

    // ─── Mockups ──────────────────────────────────────────────────────────────

    private function mockupsDir(): string
    {
        $dir = FCPATH . 'uploads' . DIRECTORY_SEPARATOR . 'mockups' . DIRECTORY_SEPARATOR;
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        return $dir;
    }

    /**
     * Validates a relative path and returns it using the OS directory separator.
     * Returns null if the path contains traversal or invalid characters.
     */
    private function validateMockupPath(string $path): ?string
    {
        $path = str_replace('\\', '/', trim($path, '/'));
        if (empty($path)) {
            return null;
        }
        $segments   = explode('/', $path);
        $normalized = [];
        foreach ($segments as $seg) {
            $seg = trim($seg);
            if ($seg === '' || $seg === '.' || $seg === '..') {
                return null;
            }
            if (!preg_match('/^[a-zA-Z0-9._\- ]+$/', $seg)) {
                return null;
            }
            $normalized[] = $seg;
        }
        return implode(DIRECTORY_SEPARATOR, $normalized);
    }

    private function scanMockupsDir(string $dir, string $relativePath = ''): array
    {
        $dirs  = [];
        $files = [];

        foreach (scandir($dir) as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $fullPath = $dir . DIRECTORY_SEPARATOR . $item;
            $relPath  = $relativePath ? $relativePath . '/' . $item : $item;

            if (is_dir($fullPath)) {
                $dirs[] = [
                    'type'     => 'directory',
                    'name'     => $item,
                    'path'     => $relPath,
                    'children' => $this->scanMockupsDir($fullPath, $relPath),
                ];
            } elseif (strtolower(pathinfo($item, PATHINFO_EXTENSION)) === 'html') {
                $files[] = [
                    'type'       => 'file',
                    'name'       => $item,
                    'path'       => $relPath,
                    'url'        => base_url('uploads/mockups/' . $relPath),
                    'size'       => filesize($fullPath),
                    'created_at' => date('Y-m-d H:i:s', filectime($fullPath)),
                ];
            }
        }

        usort($dirs,  fn($a, $b) => strcasecmp($a['name'], $b['name']));
        usort($files, fn($a, $b) => strcasecmp($a['name'], $b['name']));

        return array_merge($dirs, $files);
    }

    private function deleteDirectory(string $dir): void
    {
        foreach (scandir($dir) as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir . DIRECTORY_SEPARATOR . $item;
            is_dir($path) ? $this->deleteDirectory($path) : unlink($path);
        }
        rmdir($dir);
    }

    public function listMockups(): \CodeIgniter\HTTP\ResponseInterface
    {
        return $this->respond($this->scanMockupsDir($this->mockupsDir()));
    }

    // Public, read-only mirror of listMockups() — lets guests browse the mockups an
    // admin has uploaded via the Wiki's Mockups tab, without needing to log in.
    public function publicListMockups(): \CodeIgniter\HTTP\ResponseInterface
    {
        return $this->respond($this->scanMockupsDir($this->mockupsDir()));
    }

    public function uploadMockup(): \CodeIgniter\HTTP\ResponseInterface
    {
        $file        = $this->request->getFile('file');
        $folderParam = trim($this->request->getPost('folder') ?? '', '/');

        if (!$file || !$file->isValid()) {
            return $this->fail('No file uploaded or file is invalid.');
        }
        if (strtolower($file->getClientExtension()) !== 'html') {
            return $this->fail('Only .html files are allowed.');
        }

        $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $file->getClientName());
        if (!str_ends_with(strtolower($safeName), '.html')) {
            $safeName .= '.html';
        }

        $baseDir      = $this->mockupsDir();
        $targetDir    = $baseDir;
        $relFolderUrl = '';

        if ($folderParam !== '') {
            $safeFolderPath = $this->validateMockupPath($folderParam);
            if ($safeFolderPath === null) {
                return $this->failForbidden('Invalid folder path.');
            }
            $targetDir    = $baseDir . $safeFolderPath . DIRECTORY_SEPARATOR;
            $relFolderUrl = str_replace(DIRECTORY_SEPARATOR, '/', $safeFolderPath) . '/';
            if (!is_dir($targetDir)) {
                mkdir($targetDir, 0755, true);
            }
        }

        if (file_exists($targetDir . $safeName)) {
            $safeName = pathinfo($safeName, PATHINFO_FILENAME) . '_' . time() . '.html';
        }

        $file->move($targetDir, $safeName);

        $relPath = $relFolderUrl . $safeName;

        return $this->respond([
            'type'       => 'file',
            'name'       => $safeName,
            'path'       => $relPath,
            'url'        => base_url('uploads/mockups/' . $relPath),
            'size'       => filesize($targetDir . $safeName),
            'created_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function renameMockup(): \CodeIgniter\HTTP\ResponseInterface
    {
        $body    = $this->request->getJSON(true) ?? [];
        $oldPath = trim($body['old_path'] ?? '', '/');
        $newName = trim($body['new_name'] ?? '');

        if (empty($newName)) {
            return $this->fail('new_name is required.');
        }
        if (!preg_match('/^[a-zA-Z0-9._\- ]+$/', trim($newName))) {
            return $this->fail('new_name contains invalid characters.');
        }
        $newName = trim($newName);

        $safePath = $this->validateMockupPath($oldPath);
        if ($safePath === null) {
            return $this->failForbidden('Invalid old_path.');
        }

        $dir         = $this->mockupsDir();
        $realBase    = realpath($dir);
        $realOldPath = realpath($dir . $safePath);

        if (!$realOldPath || strpos($realOldPath, $realBase) !== 0) {
            return $this->failNotFound('File or folder not found.');
        }

        $parent      = dirname($realOldPath);
        $newFullPath = $parent . DIRECTORY_SEPARATOR . $newName;

        if (file_exists($newFullPath)) {
            return $this->fail('A file or folder with that name already exists.');
        }

        rename($realOldPath, $newFullPath);

        return $this->respond(['success' => true]);
    }

    public function deleteMockup(): \CodeIgniter\HTTP\ResponseInterface
    {
        $body = $this->request->getJSON(true) ?? [];
        $path = trim($body['path'] ?? '', '/');

        $safePath = $this->validateMockupPath($path);
        if ($safePath === null) {
            return $this->failForbidden('Invalid path.');
        }

        $dir      = $this->mockupsDir();
        $realBase = realpath($dir);
        $fullPath = $dir . $safePath;
        $realPath = realpath($fullPath);

        if (!$realPath || strpos($realPath, $realBase) !== 0) {
            return $this->failNotFound('Path not found.');
        }

        if (is_file($realPath)) {
            if (strtolower(pathinfo($realPath, PATHINFO_EXTENSION)) !== 'html') {
                return $this->failForbidden('Only .html files can be deleted.');
            }
            unlink($realPath);
        } elseif (is_dir($realPath)) {
            $this->deleteDirectory($realPath);
        } else {
            return $this->failNotFound('Path not found.');
        }

        return $this->respond(['success' => true]);
    }

    public function createMockupFolder(): \CodeIgniter\HTTP\ResponseInterface
    {
        $body = $this->request->getJSON(true) ?? [];
        $path = trim($body['path'] ?? '', '/');

        $safePath = $this->validateMockupPath($path);
        if ($safePath === null) {
            return $this->failForbidden('Invalid path.');
        }

        $dir      = $this->mockupsDir();
        $fullPath = $dir . $safePath;

        if (is_dir($fullPath)) {
            return $this->fail('Folder already exists.');
        }

        if (!mkdir($fullPath, 0755, true)) {
            return $this->failServerError('Could not create folder.');
        }

        return $this->respond(['success' => true]);
    }

    private function scanDirectory(string $dir, string $relativePath = ''): array
    {
        $result = [];
        $items  = scandir($dir);

        foreach ($items as $item) {
            if (
                $item === '.' ||
                $item === '..' ||
                $item === 'README.md' ||
                $item === 'package.json' ||
                $item === 'package-lock.json'
            ) {
                continue;
            }

            $fullPath        = $dir . DIRECTORY_SEPARATOR . $item;
            $itemRelativePath = $relativePath ? $relativePath . '/' . $item : $item;

            if (is_dir($fullPath)) {
                $children = $this->scanDirectory($fullPath, $itemRelativePath);
                if (!empty($children)) {
                    $result[] = [
                        'name'     => $item,
                        'type'     => 'directory',
                        'children' => $children,
                    ];
                }
            } elseif (pathinfo($fullPath, PATHINFO_EXTENSION) === 'md') {
                $result[] = [
                    'name' => $item,
                    'type' => 'file',
                    'path' => $itemRelativePath,
                ];
            }
        }

        return $result;
    }
}

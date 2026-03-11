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

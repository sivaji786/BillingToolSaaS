<?php

namespace App\Controllers;

use CodeIgniter\API\ResponseTrait;
use App\Controllers\BaseController;
use App\Models\WorkspaceFileModel;
use App\Libraries\ContentExtractor;

class WorkspaceController extends BaseController
{
    use ResponseTrait;

    private $workspaceRoot;
    private $tenantId;

    public function __construct()
    {
    }

    private function ensureContext()
    {
        if ($this->tenantId) return true;

        $tenant = config('App')->currentTenant ?? null;

        if (!$tenant || !isset($tenant->id)) {
            error_log("WorkspaceController: No tenant in config(App)");
            return false;
        }

        $this->tenantId = $tenant->id;
        $this->workspaceRoot = WRITEPATH . 'uploads/tenants/' . $this->tenantId . '/workspace/';
        
        if (!is_dir($this->workspaceRoot)) {
            mkdir($this->workspaceRoot, 0777, true);
            file_put_contents($this->workspaceRoot . 'index.html', '<html><body bgcolor="#ffffff"></body></html>');
        }

        return true;
    }

    private function getUserId()
    {
        return $this->request->userId ?? null;
    }

    private function getSafePath($path)
    {
        if (!$this->ensureContext()) return null;

        $path = str_replace(['..', './'], '', (string)$path);
        $path = trim($path, '/');
        $fullPath = $this->workspaceRoot . $path;
        
        return $fullPath;
    }

    public function list()
    {
        if (!$this->ensureContext()) {
            return $this->failUnauthorized('Tenant context missing');
        }

        $relPath = $this->request->getPostGet('path') ?? '';
        $fullPath = $this->getSafePath($relPath);

        if (!$fullPath || !is_dir($fullPath)) {
            // If it doesn't exist, try to create it if it's the root or a child of root
            if ($relPath === '' || $relPath === '/') {
                 mkdir($this->workspaceRoot, 0777, true);
                 $fullPath = $this->workspaceRoot;
            } else {
                 return $this->failNotFound('Directory not found: ' . $relPath);
            }
        }

        $items = [];
        $files = scandir($fullPath);

        foreach ($files as $file) {
            if ($file === '.' || $file === '..' || $file === 'index.html') continue;

            $itemPath = $fullPath . DIRECTORY_SEPARATOR . $file;
            $isDir = is_dir($itemPath);

            $items[] = [
                'name' => $file,
                'isDir' => $isDir,
                'size' => $isDir ? 0 : filesize($itemPath),
                'mtime' => filemtime($itemPath),
                'type' => $isDir ? 'folder' : pathinfo($file, PATHINFO_EXTENSION)
            ];
        }

        return $this->respond([
            'path' => $relPath,
            'items' => $items,
            'tenant_id' => $this->tenantId
        ]);
    }

    public function upload()
    {
        $logFile = FCPATH . '../debug_upload.log';
        $logData = date('Y-m-d H:i:s') . " - Upload method reached. Method: " . $this->request->getMethod() . "\n";
        file_put_contents($logFile, $logData, FILE_APPEND);
        
        if (!$this->ensureContext()) {
            file_put_contents($logFile, "Context check failed\n", FILE_APPEND);
            return $this->failUnauthorized('Tenant context missing');
        }

        $relPath = $this->request->getPost('path') ?? '';
        $fullPath = $this->getSafePath($relPath);
        $model = new WorkspaceFileModel();
        
        // Disable tenant scope for manual cleanup if needed, but usually it's fine
        // Let's just use the model normally.

        if (!$fullPath || !is_dir($fullPath)) {
            return $this->failNotFound('Target directory not found: ' . $relPath);
        }

        // Check for exceeded post_max_size
        if (empty($_FILES) && empty($_POST) && isset($_SERVER['CONTENT_LENGTH']) && $_SERVER['CONTENT_LENGTH'] > 0) {
            $maxPost = ini_get('post_max_size');
            return $this->fail("The upload was rejected because it exceeds the server's post_max_size ($maxPost).", 413);
        }

        $files = $this->request->getFiles();
        file_put_contents($logFile, "Files count: " . count($files) . "\n", FILE_APPEND);
        if (count($files) > 0) {
            foreach ($files as $k => $v) {
                 file_put_contents($logFile, " - Key: $k, Type: " . gettype($v) . "\n", FILE_APPEND);
            }
        }
        
        if (empty($files)) {
             error_log("Workspace Upload: No files in \$_FILES or getFiles()");
             return $this->fail('No files uploaded. Check server post_max_size and upload_max_filesize.');
        }

        $uploadedCount = 0;
        $errors = [];

        foreach ($files as $group) {
            $filesToProcess = is_array($group) ? $group : [$group];
            foreach ($filesToProcess as $file) {
                if ($file->isValid() && !$file->hasMoved()) {
                    $originalName = $file->getClientName();
                    $safeName = preg_replace('/[^a-zA-Z0-9\._-]/', '_', $originalName);
                    
                    if ($file->move($fullPath, $safeName, true)) {
                        $savedPath = $fullPath . DIRECTORY_SEPARATOR . $safeName;
                        $relativeFilePath = ltrim(str_replace($this->workspaceRoot, '', $savedPath), DIRECTORY_SEPARATOR);
                        
                        $content = '';
                        try {
                            $content = ContentExtractor::extract($savedPath, $file->getClientMimeType());
                        } catch (\Exception $e) {
                            error_log("Extraction error: " . $e->getMessage());
                        }
                        
                        // Sync to Database
                        $model->where('path', $relativeFilePath)->delete(); 

                        $data = [
                            'tenant_id' => $this->tenantId,
                            'user_id' => $this->getUserId(),
                            'name' => $safeName,
                            'original_name' => $originalName,
                            'path' => $relativeFilePath,
                            'is_dir' => false,
                            'mime_type' => $file->getClientMimeType() ?: $file->getMimeType(),
                            'size' => $file->getSize(),
                            'extension' => strtolower($file->getClientExtension() ?: pathinfo($originalName, PATHINFO_EXTENSION)),
                            'content' => $content,
                            'metadata' => json_encode([
                                'uploaded_at' => date('Y-m-d H:i:s'),
                                'original_name' => $originalName
                            ])
                        ];

                        if ($model->insert($data)) {
                            $uploadedCount++;
                        } else {
                            $err = json_encode($model->errors());
                            error_log("DB Insert failed for $safeName: $err");
                            $errors[] = "DB Error for $safeName: $err";
                        }
                    } else {
                        $errors[] = "Move failed for " . $file->getClientName() . ": " . $file->getErrorString();
                    }
                } else if (!$file->isValid()) {
                     $limit = ini_get('upload_max_filesize');
                     $postLimit = ini_get('post_max_size');
                     $errors[] = "Invalid file " . $file->getClientName() . ": " . $file->getErrorString() . " (Server Limits: upload=$limit, post=$postLimit)";
                }
            }
        }

        if ($uploadedCount > 0) {
            return $this->respondCreated([
                'success' => true,
                'message' => "$uploadedCount files uploaded successfully",
                'errors' => $errors
            ]);
        }

        return $this->fail('Upload failed: ' . implode('; ', $errors));
    }

    public function mkdir()
    {
        if (!$this->ensureContext()) return $this->failUnauthorized();

        $relPath = $this->request->getVar('path') ?? '';
        $name = $this->request->getVar('name');

        if (!$name) return $this->fail('Folder name is required');

        $fullPath = $this->getSafePath($relPath) . DIRECTORY_SEPARATOR . $name;
        $relativeDirPath = ltrim(str_replace($this->workspaceRoot, '', $fullPath), DIRECTORY_SEPARATOR);

        if (file_exists($fullPath)) return $this->failResourceExists('Folder already exists');

        if (mkdir($fullPath, 0777, true)) {
            $model = new WorkspaceFileModel();
            $model->insert([
                'tenant_id' => $this->tenantId,
                'user_id' => $this->getUserId(),
                'name' => $name,
                'original_name' => $name,
                'path' => $relativeDirPath,
                'is_dir' => true,
                'size' => 0
            ]);
            return $this->respondCreated(['message' => 'Folder created successfully']);
        }

        return $this->failServerError('Failed to create folder');
    }

    public function delete()
    {
        if (!$this->ensureContext()) return $this->failUnauthorized();

        $relPath = $this->request->getVar('path') ?? '';
        $items = $this->request->getVar('items'); 

        if (!$items || !is_array($items)) return $this->fail('No items specified');

        $basePath = $this->getSafePath($relPath);
        $model = new WorkspaceFileModel();

        foreach ($items as $name) {
            $itemPath = $basePath . DIRECTORY_SEPARATOR . $name;
            $relativeItemPath = ltrim(str_replace($this->workspaceRoot, '', $itemPath), DIRECTORY_SEPARATOR);

            if (!file_exists($itemPath)) continue;

            if (is_dir($itemPath)) {
                $this->recursiveDelete($itemPath);
                $model->like('path', $relativeItemPath, 'after')->delete();
                $model->where('path', $relativeItemPath)->delete();
            } else {
                if (unlink($itemPath)) {
                    $model->where('path', $relativeItemPath)->delete();
                }
            }
        }

        return $this->respond(['message' => 'Deleted successfully']);
    }

    private function recursiveDelete($dir) {
        if (!is_dir($dir)) return;
        $files = array_diff(scandir($dir), ['.', '..']);
        foreach ($files as $file) {
            $path = $dir . DIRECTORY_SEPARATOR . $file;
            is_dir($path) ? $this->recursiveDelete($path) : unlink($path);
        }
        return rmdir($dir);
    }

    public function download()
    {
        if (!$this->ensureContext()) return $this->failUnauthorized();

        $relPath = $this->request->getGet('path') ?? '';
        $name = $this->request->getGet('name');
        if (!$name) return $this->fail('Filename required');

        $fullPath = $this->getSafePath($relPath) . DIRECTORY_SEPARATOR . $name;
        if (!file_exists($fullPath) || is_dir($fullPath)) return $this->failNotFound();

        return $this->response->download($fullPath, null);
    }

    public function extractZip()
    {
        if (!$this->ensureContext()) return $this->failUnauthorized();

        $relPath = $this->request->getVar('path') ?? '';
        $name = $this->request->getVar('name');
        $toFolder = $this->request->getVar('toFolder') ?? false;
        $deleteSource = $this->request->getVar('deleteSource') ?? false;

        if (!$name) {
            return $this->respond(['success' => false, 'message' => 'Zip name required'], 400);
        }

        $zipPath = $this->getSafePath($relPath) . DIRECTORY_SEPARATOR . $name;
        if (!file_exists($zipPath)) {
            return $this->respond(['success' => false, 'message' => 'Zip not found at path: ' . $zipPath], 404);
        }

        $extractTo = $this->getSafePath($relPath);
        if ($toFolder) {
            $folderName = pathinfo($name, PATHINFO_FILENAME);
            $extractTo .= DIRECTORY_SEPARATOR . $folderName;
            if (!is_dir($extractTo)) {
                if (!mkdir($extractTo, 0777, true)) {
                    $error = error_get_last();
                    return $this->respond(['success' => false, 'message' => 'Failed to create target directory: ' . $extractTo, 'details' => $error], 500);
                }
            }
        }

        $zip = new \ZipArchive();
        $openResult = $zip->open($zipPath);
        if ($openResult === true) {
            try {
                if (!$zip->extractTo($extractTo)) {
                    $error = error_get_last();
                    return $this->respond(['success' => false, 'message' => 'ZipArchive::extractTo failed.', 'details' => $error], 500);
                }
                
                $this->indexExtractedFiles($extractTo);
                
                $zip->close();
                if ($deleteSource) {
                    unlink($zipPath);
                }
                return $this->respond(['message' => 'Success']);
            } catch (\Exception $e) {
                return $this->respond([
                    'success' => false, 
                    'message' => 'Exception occurred during extraction or indexing', 
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ], 500);
            } catch (\Throwable $e) {
                return $this->respond([
                    'success' => false, 
                    'message' => 'Fatal error occurred during extraction or indexing', 
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ], 500);
            }
        }
        
        return $this->respond(['success' => false, 'message' => 'Zip open fail', 'code' => $openResult], 500);
    }

    private function indexExtractedFiles($dir)
    {
        $model = new WorkspaceFileModel();
        $userId = $this->getUserId();
        
        try {
            $files = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::SELF_FIRST
            );

            foreach ($files as $file) {
                $filePath = $file->getRealPath();
                $relFile = ltrim(str_replace($this->workspaceRoot, '', $filePath), DIRECTORY_SEPARATOR);
                
                $model->where('path', $relFile)->delete();

                $isDir = $file->isDir();
                $data = [
                    'tenant_id' => $this->tenantId,
                    'user_id' => $userId,
                    'name' => $file->getFilename(),
                    'original_name' => $file->getFilename(),
                    'path' => $relFile,
                    'is_dir' => $isDir,
                    'size' => $isDir ? 0 : $file->getSize(),
                ];

                if (!$isDir) {
                    $data['extension'] = strtolower($file->getExtension());
                    
                    // Capture potential errors in mime_content_type
                    try {
                        $data['mime_type'] = mime_content_type($filePath);
                    } catch (\Exception $e) {
                        $data['mime_type'] = 'application/octet-stream';
                    } catch (\Error $e) {
                        $data['mime_type'] = 'application/octet-stream';
                    }

                    try {
                        $data['content'] = ContentExtractor::extract($filePath, $data['mime_type']);
                    } catch (\Exception $e) {
                         $data['content'] = ''; // proceed even if extraction fails
                    }
                }

                if (!$model->insert($data)) {
                    throw new \Exception("DB Insert Failed for $filePath: " . json_encode($model->errors()));
                }
            }
        } catch (\Exception $e) {
             throw $e; // Re-throw to be caught by the calling extractZip function
        }
    }

    public function search()
    {
        if (!$this->ensureContext()) return $this->failUnauthorized();

        $query = $this->request->getGet('q');
        $path = $this->request->getGet('path') ?? '';
        if (!$query) return $this->respond([]);

        $model = new WorkspaceFileModel();
        
        $builder = $model->groupStart()
            ->like('name', $query)
            ->orLike('content', $query)
            ->groupEnd()
            ->where('is_dir', false);
            
        if ($path) {
            // Include files where path is exactly this path, or starts with this path/
            $builder->groupStart()
                ->where('path', $path) // files directly in this directory
                ->orLike('path', $path . '/%', 'after') // files in subdirectories
                ->groupEnd();
        } else {
             // If no path is specified, it means root, so we search everything but we could restrict explicitly
        }

        $results = $builder->findAll();

        $formattedResults = array_map(function($row) use ($path) {
            $row['isDir'] = (bool)$row['is_dir'];
            $row['size'] = (int)$row['size'];
            $row['lastModified'] = $row['updated_at'] ?? $row['created_at'];
            
            $relPath = $row['path'];
            if ($path && $path !== '/' && strpos($relPath, $path . '/') === 0) {
                 $row['name'] = substr($relPath, strlen($path) + 1);
            } else {
                 $row['name'] = $relPath;
            }
            
            unset($row['is_dir']);
            return $row;
        }, $results);

        return $this->respond($formattedResults);
    }
    public function rename()
    {
        if (!$this->ensureContext()) return $this->failUnauthorized();

        $path = $this->request->getVar('path') ?? '';
        $oldName = $this->request->getVar('oldName') ?? '';
        $newName = $this->request->getVar('newName') ?? '';

        if (!$oldName || !$newName) {
            return $this->fail('Old name and new name are required');
        }

        if (strpos($newName, '/') !== false || strpos($newName, '\\') !== false) {
            return $this->fail('Invalid new name');
        }

        $basePath = rtrim($this->workspaceRoot . DIRECTORY_SEPARATOR . $path, DIRECTORY_SEPARATOR);
        $oldFullPath = $basePath . DIRECTORY_SEPARATOR . $oldName;
        $newFullPath = $basePath . DIRECTORY_SEPARATOR . $newName;

        if (!file_exists($oldFullPath)) {
            return $this->failNotFound('File not found');
        }

        if (file_exists($newFullPath)) {
            return $this->fail('Destination already exists');
        }

        if (rename($oldFullPath, $newFullPath)) {
            $model = new WorkspaceFileModel();
            $model->disableTenantScope();
            
            $oldRelPath = ltrim(str_replace($this->workspaceRoot, '', $oldFullPath), DIRECTORY_SEPARATOR);
            $newRelPath = ltrim(str_replace($this->workspaceRoot, '', $newFullPath), DIRECTORY_SEPARATOR);

            if (is_dir($newFullPath)) {
                $children = $model->where('tenant_id', $this->tenantId)
                                 ->like('path', $oldRelPath . '/%', 'after')
                                 ->findAll();
                foreach ($children as $child) {
                    $childNewPath = preg_replace('/^' . preg_quote($oldRelPath, '/') . '/', $newRelPath, $child['path'], 1);
                    $model->update($child['id'], ['path' => $childNewPath]);
                }
                $dirRecord = $model->where('tenant_id', $this->tenantId)->where('path', $oldRelPath)->first();
                if ($dirRecord) {
                    $model->update($dirRecord['id'], ['name' => $newName, 'path' => $newRelPath]);
                }
            } else {
                $fileRecord = $model->where('tenant_id', $this->tenantId)->where('path', $oldRelPath)->first();
                if ($fileRecord) {
                    $extension = pathinfo($newName, PATHINFO_EXTENSION);
                    $model->update($fileRecord['id'], [
                        'name' => $newName, 
                        'path' => $newRelPath,
                        'extension' => strtolower($extension)
                    ]);
                }
            }

            return $this->respond(['success' => true]);
        }

        return $this->fail('Failed to rename file');
    }
    public function open()
    {
        if (!$this->ensureContext()) return $this->failUnauthorized();

        $path = $this->request->getVar('path') ?? '';
        $name = $this->request->getVar('name') ?? '';

        if (!$name) {
            return $this->fail('File name is required');
        }

        $basePath = rtrim($this->workspaceRoot . DIRECTORY_SEPARATOR . $path, DIRECTORY_SEPARATOR);
        $fullPath = rtrim($basePath . DIRECTORY_SEPARATOR . $name, DIRECTORY_SEPARATOR);

        if (!file_exists($fullPath)) {
            return $this->failNotFound('File not found');
        }

        // Only allow opening if running locally on the same machine
        // OS check
        $os = php_uname('s');
        $command = '';
        if (stripos($os, 'windows') !== false) {
            $command = 'start "" ' . escapeshellarg($fullPath);
        } elseif (stripos($os, 'darwin') !== false) {
            $command = 'open ' . escapeshellarg($fullPath);
        } else {
            $command = 'xdg-open ' . escapeshellarg($fullPath) . ' > /dev/null 2>&1 &';
        }

        exec($command);
        return $this->respond(['success' => true]);
    }

    public function downloadZip()
    {
        if (!$this->ensureContext()) return $this->failUnauthorized();

        $path = $this->request->getVar('path') ?? '';
        $items = $this->request->getVar('items');

        if (empty($items) || !is_array($items)) {
            return $this->fail('No items specified');
        }

        $basePath = rtrim($this->workspaceRoot . DIRECTORY_SEPARATOR . $path, DIRECTORY_SEPARATOR);
        $zipName = 'workspace_export_' . date('Ymd_His') . '.zip';
        $tempZipPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . $zipName;

        $zip = new \ZipArchive();
        if ($zip->open($tempZipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE)) {
            $filesAdded = 0;
            foreach ($items as $item) {
                // Ensure no dir traversal
                if (strpos($item, '..') !== false) {
                    continue;
                }
                
                $fullPath = rtrim($basePath, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . ltrim($item, DIRECTORY_SEPARATOR);
                log_message('debug', 'Zip item full path: ' . $fullPath);
                
                if (is_dir($fullPath)) {
                    $this->addDirToZip($fullPath, $zip, $item);
                    $filesAdded++;
                } elseif (file_exists($fullPath)) {
                    $zip->addFile($fullPath, $item);
                    $filesAdded++;
                } else {
                    log_message('debug', 'Zip item not found: ' . $fullPath);
                }
            }
            if ($filesAdded === 0) {
                $zip->addFromString('empty.txt', 'No valid files were found to add to this archive.');
            }
            $zip->close();
        } else {
             return $this->fail('Could not create zip archive');
        }

        if (!file_exists($tempZipPath)) {
             return $this->fail('Failed to process zip download');
        }

        return $this->response->download($tempZipPath, null, true)->setFileName($zipName);
    }

    private function addDirToZip($dir, $zipArchive, $zipdir = '') {
        $zipArchive->addEmptyDir($zipdir);
        $nodes = glob($dir . '/*');
        foreach ($nodes as $node) {
            if (is_dir($node)) {
                $this->addDirToZip($node, $zipArchive, $zipdir . '/' . basename($node));
            } else if (is_file($node)) {
                $zipArchive->addFile($node, $zipdir . '/' . basename($node));
            }
        }
    }

    public function aiSearch()
    {
        if (!$this->ensureContext()) return $this->failUnauthorized();

        $prompt = trim($this->request->getVar('prompt') ?? '');
        if (empty($prompt)) {
            return $this->fail('Prompt is required');
        }

        $folderPath = $this->request->getVar('path');
        if ($folderPath === null) {
            $folderPath = '/';
        }

        $db = \Config\Database::connect();
        
        // 1. Check History Cache
        $history = $db->table('aiquery_history')
            ->where('tenant_id', $this->tenantId)
            ->where('prompt', $prompt)
            ->orderBy('created_at', 'DESC')
            ->get()->getRowArray();

        $whereClause = null;
        if ($history) {
            $whereClause = $history['sql_query'];
        } else {
            // 2. Fetch from Gemini
            $apiKey = getenv('GEMINI_API_KEY') ?: $_ENV['GEMINI_API_KEY'] ?? '';
            if (empty($apiKey)) {
                return $this->fail('Gemini API key is not configured');
            }

            $schemaDescription = "Table: workspace_files\nColumns: id(int), tenant_id(int), name(varchar), path(text), is_dir(boolean), mime_type(varchar), size(bigint), extension(varchar), created_at(datetime), updated_at(datetime).\n";
            $systemPrompt = "You are an expert SQL assistant. Based on this schema:\n$schemaDescription\n";
            $systemPrompt .= "Generate a raw SQL WHERE clause to answer the user's prompt. ";
            $systemPrompt .= "Only return the WHERE clause text, starting immediately (do not include the 'WHERE ' keyword itself). Do not use Markdown formatting. Do not use backticks. Return ONLY the raw SQL condition string. ";
            $systemPrompt .= "Assume all datetime strings are properly formatted. The user prompt is: \"$prompt\"";

            try {
                $client = \Config\Services::curlrequest();
                $response = $client->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}", [
                    'json' => [
                        'contents' => [
                            ['parts' => [['text' => $systemPrompt]]]
                        ]
                    ],
                    'http_errors' => false
                ]);

                if ($response->getStatusCode() === 200) {
                    $body = json_decode($response->getBody(), true);
                    if (isset($body['candidates'][0]['content']['parts'][0]['text'])) {
                        $generatedWhere = trim($body['candidates'][0]['content']['parts'][0]['text']);
                        // Clean up markdown if any
                        $generatedWhere = preg_replace('/```sql\s*(.*?)\s*```/is', '$1', $generatedWhere);
                        $generatedWhere = preg_replace('/```\s*(.*?)\s*```/is', '$1', $generatedWhere);
                        $whereClause = trim($generatedWhere);
                    }
                }
            } catch (\Exception $e) {
                log_message('error', 'Gemini API Error: ' . $e->getMessage());
                return $this->fail('Failed to process AI search query');
            }
        }

        if (empty($whereClause)) {
            return $this->fail('Could not generate a valid query from the prompt.');
        }

        // Save to history if this exact combo doesn't exist
        $exactMatch = $db->table('aiquery_history')
            ->where('tenant_id', $this->tenantId)
            ->where('prompt', $prompt)
            ->where('folder_path', $folderPath)
            ->get()->getRowArray();

        if (!$exactMatch) {
            $db->table('aiquery_history')->insert([
                'tenant_id' => $this->tenantId,
                'user_id' => $this->getUserId(),
                'prompt' => $prompt,
                'sql_query' => $whereClause,
                'folder_path' => $folderPath,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }

        // 3. Execute Query safely with Tenant restriction
        try {
            $builder = $db->table('workspace_files')
                          ->where('tenant_id', $this->tenantId);

            // Add path restriction for AI search
            if ($folderPath && $folderPath !== '/') {
                 $builder->groupStart()
                    ->where('path', $folderPath)
                    ->orLike('path', $folderPath . '/%', 'after')
                    ->groupEnd();
            }

            // Add the AI generated where clause safely. 
            // In a production system, a proper SQL parser/sanitizer should be used.
            $builder->where("($whereClause)", null, false);
            
            $results = $builder->get()->getResultArray();

            // Format results matching expected frontend structure
            $formattedResults = array_map(function($row) use ($folderPath) {
                // Ensure proper booleans and ints
                $row['isDir'] = (bool)$row['is_dir'];
                $row['size'] = (int)$row['size'];
                $row['lastModified'] = $row['updated_at'] ?? $row['created_at'];
                
                $relPath = $row['path'];
                if ($folderPath && $folderPath !== '/' && strpos($relPath, $folderPath . '/') === 0) {
                     $row['name'] = substr($relPath, strlen($folderPath) + 1);
                } else {
                     $row['name'] = $relPath;
                }
                
                unset($row['is_dir']);
                return $row;
            }, $results);

            return $this->respond([
                'success' => true,
                'items' => $formattedResults,
                'from_cache' => (bool)$history
            ]);
        } catch (\Exception $e) {
            log_message('error', 'AI SQL Execution Error: ' . $e->getMessage() . ' Query: ' . $whereClause);
            return $this->fail('Generated search query resulted in an error.');
        }
    }

    public function getAiHistory()
    {
        if (!$this->ensureContext()) return $this->failUnauthorized();

        $db = \Config\Database::connect();
        
        $history = $db->table('aiquery_history')
            ->select('id, prompt, sql_query, folder_path, created_at')
            ->where('tenant_id', $this->tenantId)
            ->orderBy('created_at', 'DESC')
            ->get()->getResultArray();

        return $this->respond([
            'success' => true,
            'data' => $history
        ]);
    }
}

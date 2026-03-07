<?php

namespace App\Libraries;

class ContentExtractor
{
    /**
     * Extract text content based on file extension and mime type
     */
    public static function extract($filePath, $mimeType = null)
    {
        if (!file_exists($filePath)) {
            return null;
        }

        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $content = '';

        try {
            switch ($extension) {
                case 'txt':
                case 'md':
                case 'csv':
                case 'json':
                case 'xml':
                case 'html':
                case 'htm':
                case 'sql':
                case 'log':
                    $content = file_get_contents($filePath);
                    break;

                case 'pdf':
                    $content = self::extractPdf($filePath);
                    break;

                case 'docx':
                    $content = self::extractDocx($filePath);
                    break;

                case 'xlsx':
                    $content = self::extractXlsx($filePath);
                    break;
                
                case 'pptx':
                    $content = self::extractPptx($filePath);
                    break;

                case 'odt':
                    $content = self::extractOdt($filePath);
                    break;
            }
        } catch (\Exception $e) {
            log_message('error', 'Content extraction failed for ' . $filePath . ': ' . $e->getMessage());
        }

        // Clean up content (remove excessive whitespace, etc.)
        $content = preg_replace('/\s+/', ' ', $content);
        return trim($content);
    }

    /**
     * Extract text from PDF using Smalot/PdfParser
     */
    private static function extractPdf($filePath)
    {
        try {
            if (!class_exists('\Smalot\PdfParser\Parser')) {
                log_message('error', 'ContentExtractor::extractPdf - Smalot\PdfParser\Parser class not found. Is the package installed?');
                return '';
            }
            
            $parser = new \Smalot\PdfParser\Parser();
            $pdf = $parser->parseFile($filePath);
            return $pdf->getText();
        } catch (\Exception $e) {
            log_message('error', 'ContentExtractor::extractPdf - Exception parsing PDF: ' . $e->getMessage());
        } catch (\Error $e) {
            log_message('error', 'ContentExtractor::extractPdf - Error parsing PDF: ' . $e->getMessage());
        }
        
        return '';
    }

    /**
     * Extract text from DOCX by unzipping and reading XML
     */
    private static function extractDocx($filePath)
    {
        $content = '';
        $zip = new \ZipArchive();
        if ($zip->open($filePath) === true) {
            // Find document.xml
            if (($data = $zip->getFromName('word/document.xml')) !== false) {
                // Add spaces between tags to avoid word merger
                $data = str_replace('<', ' <', $data);
                $content = strip_tags($data);
            }
            $zip->close();
        }
        return $content;
    }

    /**
     * Extract text from XLSX (shared strings)
     */
    private static function extractXlsx($filePath)
    {
        $content = '';
        $zip = new \ZipArchive();
        if ($zip->open($filePath) === true) {
            if (($data = $zip->getFromName('xl/sharedStrings.xml')) !== false) {
                $data = str_replace('<', ' <', $data);
                $content = strip_tags($data);
            }
            $zip->close();
        }
        return $content;
    }

    /**
     * Extract text from PPTX
     */
    private static function extractPptx($filePath)
    {
        $content = '';
        $zip = new \ZipArchive();
        if ($zip->open($filePath) === true) {
            // Slides are stored as ppt/slides/slide1.xml, ppt/slides/slide2.xml, etc.
            for ($i = 1; $i <= 100; $i++) { // Limit to first 100 slides
                $slidePath = "ppt/slides/slide{$i}.xml";
                if (($data = $zip->getFromName($slidePath)) !== false) {
                    $data = str_replace('<', ' <', $data);
                    $content .= " " . strip_tags($data);
                } else {
                    break;
                }
            }
            $zip->close();
        }
        return $content;
    }

    /**
     * Extract text from ODT by unzipping and reading content.xml
     */
    private static function extractOdt($filePath)
    {
        $content = '';
        $zip = new \ZipArchive();
        if ($zip->open($filePath) === true) {
            if (($data = $zip->getFromName('content.xml')) !== false) {
                $data = str_replace('<', ' <', $data);
                $content = strip_tags($data);
            }
            $zip->close();
        }
        return $content;
    }
}

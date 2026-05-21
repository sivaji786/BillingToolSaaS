import React, { useCallback, useRef, useState } from 'react';
import { Camera, Upload, Link as LinkIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import adminApi from '../../services/adminApi';
import { useInlineCms } from '../../contexts/InlineCmsContext';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  slug: string;
  field: string;
  lang: string;
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
}

// ---------------------------------------------------------------------------
// InlineImagePicker
// ---------------------------------------------------------------------------

export function InlineImagePicker({
  slug,
  field,
  lang,
  src,
  alt = '',
  className,
  imgClassName,
}: Props) {
  const { editMode, patchField } = useInlineCms();

  const [currentSrc, setCurrentSrc] = useState(src);
  const [isHovered, setIsHovered] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // Upload via file input → base64 → POST to /admin/cms/upload-image
  // ---------------------------------------------------------------------------
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file.');
        return;
      }

      setIsUploading(true);

      try {
        // Convert to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(file);
        });

        // POST to upload endpoint
        const response = await adminApi.post<{ url: string }>('/cms/upload-image', {
          base64,
          filename: file.name,
          mimeType: file.type,
        });

        const uploadedUrl = response.data?.url;
        if (!uploadedUrl) throw new Error('No URL returned from upload endpoint');

        await patchField(slug, lang, field, uploadedUrl);
        setCurrentSrc(uploadedUrl);
        setPopoverOpen(false);
      } catch (err) {
        // patchField already toasts on its own errors; only toast for upload errors
        if (err instanceof Error && err.message !== 'patch failed') {
          toast.error('Image upload failed. Please retry.');
        }
      } finally {
        setIsUploading(false);
        // Reset input so the same file can be re-selected if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [field, lang, patchField, slug],
  );

  // ---------------------------------------------------------------------------
  // Apply URL directly
  // ---------------------------------------------------------------------------
  const handleApplyUrl = useCallback(async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    setIsUploading(true);
    try {
      await patchField(slug, lang, field, trimmed);
      setCurrentSrc(trimmed);
      setUrlInput('');
      setPopoverOpen(false);
    } finally {
      setIsUploading(false);
    }
  }, [field, lang, patchField, slug, urlInput]);

  // ---------------------------------------------------------------------------
  // View mode — plain img
  // ---------------------------------------------------------------------------
  if (!editMode) {
    return (
      <div className={className}>
        <img src={currentSrc} alt={alt} className={imgClassName} />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Edit mode — img with camera overlay
  // ---------------------------------------------------------------------------
  return (
    <div
      className={['relative inline-block', className].filter(Boolean).join(' ')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img src={currentSrc} alt={alt} className={imgClassName} />

      {/* Upload/loading overlay badge — bottom-right of the image */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Change image"
            className={[
              'absolute bottom-2 right-2 z-10 flex items-center justify-center rounded-full p-1.5 shadow-md transition-all',
              isUploading
                ? 'bg-amber-500 text-white'
                : 'bg-white/90 text-gray-700 hover:bg-purple-600 hover:text-white',
              isHovered || isUploading ? 'opacity-100' : 'opacity-0',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-label="Uploading" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
          <Tabs defaultValue="upload">
            <TabsList className="w-full rounded-b-none rounded-t-md">
              <TabsTrigger value="upload" className="flex-1 gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="url" className="flex-1 gap-1.5">
                <LinkIcon className="h-3.5 w-3.5" />
                URL
              </TabsTrigger>
            </TabsList>

            {/* --- Upload tab --- */}
            <TabsContent value="upload" className="p-4">
              <p className="mb-3 text-micro text-gray-500">
                Select an image from your device to upload.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-gray-300 px-4 py-6 text-body text-gray-500 transition-colors hover:border-purple-400 hover:text-purple-600 disabled:opacity-60"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Click to choose a file
                  </>
                )}
              </button>
            </TabsContent>

            {/* --- URL tab --- */}
            <TabsContent value="url" className="p-4">
              <p className="mb-2 text-micro text-gray-500">
                Paste a public image URL and click Apply.
              </p>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.png"
                disabled={isUploading}
                className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-body focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-60"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyUrl();
                }}
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                disabled={isUploading || !urlInput.trim()}
                className="w-full rounded-md bg-purple-600 px-3 py-2 text-body font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-60"
              >
                {isUploading ? 'Saving…' : 'Apply'}
              </button>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  );
}

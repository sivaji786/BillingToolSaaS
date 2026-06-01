import { useRef, useState } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { fileService, WHPhoto } from '../../../services/workhubApi';
import { toast } from 'sonner';

const MAX_JOBSITE = 10;
const MAX_IDENTITY = 1;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];

interface Props {
    taskId: number;
    existingPhotos?: WHPhoto[];
    onUploaded: (photo: WHPhoto) => void;
    onRemove?: (id: number) => void;
}

function PhotoThumb({ url, onRemove }: { url: string; onRemove?: () => void }) {
    return (
        <div className="relative aspect-square rounded-md overflow-hidden border group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            {onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <X className="w-3 h-3" />
                </button>
            )}
        </div>
    );
}

export function PhotoUploadGrid({ taskId, existingPhotos = [], onUploaded, onRemove }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const jobsitePhotos = existingPhotos.filter((p) => p.photo_type === 'jobsite');
    const identityPhotos = existingPhotos.filter((p) => p.photo_type === 'identity');

    const handleFiles = async (files: FileList | null, photoType: 'jobsite' | 'identity') => {
        if (!files || files.length === 0) return;
        const file = files[0];

        if (!ALLOWED_MIME.includes(file.type)) {
            toast.error('Only JPEG, PNG, or HEIC photos are allowed.');
            return;
        }
        if (file.size > MAX_BYTES) {
            toast.error('Photo must be under 10 MB.');
            return;
        }

        const currentCount = photoType === 'jobsite' ? jobsitePhotos.length : identityPhotos.length;
        const maxCount = photoType === 'jobsite' ? MAX_JOBSITE : MAX_IDENTITY;
        if (currentCount >= maxCount) {
            toast.error(`Maximum ${maxCount} ${photoType} photo(s) reached.`);
            return;
        }

        setUploading(true);
        try {
            const result = await fileService.upload(taskId, file, photoType);
            onUploaded({ id: result.photo_id, photo_type: photoType, url: result.url, created_at: new Date().toISOString() });
            toast.success('Photo uploaded');
        } catch (e: any) {
            toast.error(e.response?.data?.message ?? 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Jobsite photos */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-body font-medium">
                        Jobsite Photos ({jobsitePhotos.length}/{MAX_JOBSITE})
                    </span>
                    <div className="flex gap-1">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            disabled={uploading || jobsitePhotos.length >= MAX_JOBSITE}
                            onClick={() => cameraInputRef.current?.click()}
                        >
                            <Camera className="w-3.5 h-3.5" />
                            Camera
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            disabled={uploading || jobsitePhotos.length >= MAX_JOBSITE}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {uploading ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
                            Upload
                        </Button>
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/heic"
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files, 'jobsite')}
                />
                <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files, 'jobsite')}
                />

                {jobsitePhotos.length === 0 ? (
                    <div className="border-2 border-dashed rounded-lg p-6 text-center text-caption text-muted-foreground">
                        No jobsite photos yet. At least 1 is required.
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-2">
                        {jobsitePhotos.map((p) => (
                            <PhotoThumb
                                key={p.id}
                                url={p.url}
                                onRemove={onRemove ? () => onRemove(p.id) : undefined}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Identity photo */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-body font-medium">
                        Identity Photo ({identityPhotos.length}/{MAX_IDENTITY})
                    </span>
                    {identityPhotos.length < MAX_IDENTITY && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            disabled={uploading}
                            onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/jpeg,image/png,image/heic';
                                input.onchange = (e) => handleFiles((e.target as HTMLInputElement).files, 'identity');
                                input.click();
                            }}
                        >
                            <Upload className="w-3.5 h-3.5" /> Upload
                        </Button>
                    )}
                </div>
                {identityPhotos.length === 0 ? (
                    <div className="border-2 border-dashed rounded-lg p-4 text-center text-caption text-muted-foreground">
                        Optional — used for worker identification on reports.
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-2">
                        {identityPhotos.map((p) => (
                            <PhotoThumb key={p.id} url={p.url} onRemove={onRemove ? () => onRemove(p.id) : undefined} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

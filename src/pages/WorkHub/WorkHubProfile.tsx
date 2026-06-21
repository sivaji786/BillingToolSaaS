import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService, workerService, gdprService } from '../../services/workhubApi';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { User, Clock, Languages, Camera, CheckCircle, AlertCircle, Download, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
    { code: 'pl', label: 'Polski' },
    { code: 'fr', label: 'Français' },
    { code: 'it', label: 'Italiano' },
];

export function WorkHubProfile() {
    const qc = useQueryClient();

    const { data: profile, isLoading } = useQuery({
        queryKey: ['wh-profile'],
        queryFn: profileService.get,
        staleTime: 5 * 60 * 1000,
    });

    const [capacityHours, setCapacityHours] = useState('');
    const [skills, setSkills] = useState('');
    const [uiLanguage, setUiLanguage] = useState('en');
    const [exportLanguage, setExportLanguage] = useState('en');
    const [initialised, setInitialised] = useState(false);

    useEffect(() => {
        if (profile && !initialised) {
            setCapacityHours(String(profile.capacity_hours_per_week ?? 40));
            setSkills((profile.skills ?? []).join(', '));
            setUiLanguage(profile.ui_language ?? 'en');
            setExportLanguage(profile.export_language ?? 'en');
            setInitialised(true);
        }
    }, [profile, initialised]);

    const [gdprExporting,   setGdprExporting]   = useState(false);
    const [photoUploading,  setPhotoUploading]  = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);

    async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhotoUploading(true);
        try {
            await profileService.uploadIdentityPhoto(file);
            qc.invalidateQueries({ queryKey: ['wh-profile'] });
            toast.success('Identity photo uploaded successfully');
        } catch {
            toast.error('Failed to upload identity photo. Please try again.');
        } finally {
            setPhotoUploading(false);
            // Reset so the same file can be re-selected if needed
            if (photoInputRef.current) photoInputRef.current.value = '';
        }
    }

    async function handleGdprExport() {
        setGdprExporting(true);
        try {
            const data = await gdprService.export();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `workhub-my-data-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Your data has been downloaded (GDPR Art. 15)');
        } catch {
            toast.error('Failed to export data. Please try again.');
        } finally {
            setGdprExporting(false);
        }
    }

    const resetRoleMut = useMutation({
        mutationFn: () => workerService.setRole(profile!.id, null),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['wh-profile'] });
            qc.invalidateQueries({ queryKey: ['wh-workers'] });
            toast.success('WorkHub role reset to system default');
        },
        onError: () => toast.error('Failed to reset role'),
    });

    const updateMutation = useMutation({
        mutationFn: () => profileService.update({
            capacity_hours_per_week: Number(capacityHours),
            skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
            ui_language: uiLanguage,
            export_language: exportLanguage,
        }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['wh-profile'] });
            toast.success('Profile updated successfully');
        },
        onError: () => toast.error('Failed to update profile'),
    });

    if (isLoading) {
        return (
            <div className="space-y-4 p-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
        );
    }

    const initials = (profile?.name ?? 'WH')
        .split(' ')
        .slice(0, 2)
        .map((n: string) => n[0])
        .join('')
        .toUpperCase();

    return (
        <div className="space-y-4 p-4 max-w-2xl mx-auto">
            {/* Personal info (read-only) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-4 w-4 text-[#2a8fbd]" />
                        Personal Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-full bg-[#f0f6ff] text-[#1e3a5f] flex items-center justify-center text-display font-medium">
                            {initials}
                        </div>
                        <div>
                            <p className="font-medium text-body-lg">{profile?.name ?? '—'}</p>
                            <p className="text-body text-muted-foreground">{profile?.email ?? '—'}</p>
                            <Badge variant="outline" className="mt-1 text-caption">{profile?.role ?? 'Worker'}</Badge>
                        </div>
                    </div>
                    <p className="text-caption text-muted-foreground">
                        Personal info is managed by your administrator and cannot be changed here.
                    </p>
                </CardContent>
            </Card>

            {/* WorkHub Role */}
            {profile?.wh_role && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-[#2a8fbd]" />
                            WorkHub Role
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-body">
                                Your WorkHub role is set to <strong className="capitalize">{profile.wh_role}</strong>.
                                This overrides your system role and controls which tasks and features you can access.
                            </p>
                            <p className="text-caption text-muted-foreground mt-1">
                                Reset to <em>Auto</em> to restore your system-default access level.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetRoleMut.mutate()}
                            disabled={resetRoleMut.isPending}
                            className="shrink-0"
                        >
                            {resetRoleMut.isPending ? 'Resetting…' : 'Reset to Auto'}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Capacity settings (editable) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#2a8fbd]" />
                        WorkHub Capacity
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="capacity">Hours per Week</Label>
                        <Input
                            id="capacity"
                            type="number"
                            min={1}
                            max={60}
                            value={capacityHours}
                            onChange={(e) => setCapacityHours(e.target.value)}
                            className="w-32"
                        />
                        <p className="text-caption text-muted-foreground">Used for utilisation calculations</p>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="skills">Skills / Qualifications</Label>
                        <Input
                            id="skills"
                            placeholder="e.g. Electrical, HVAC, Plumbing (comma-separated)"
                            value={skills}
                            onChange={(e) => setSkills(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Language preferences */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Languages className="h-4 w-4 text-[#2a8fbd]" />
                        Language Preferences
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>UI Language</Label>
                            <Select value={uiLanguage} onValueChange={setUiLanguage}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {LANGUAGES.map((l) => (
                                        <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>PDF Export Language</Label>
                            <Select value={exportLanguage} onValueChange={setExportLanguage}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {LANGUAGES.map((l) => (
                                        <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-caption text-muted-foreground">Used when generating PDFs</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Identity photo status */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-[#2a8fbd]" />
                        Identity Photo
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Hidden file input */}
                    <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={handlePhotoSelected}
                    />
                    {profile?.has_identity_photo ? (
                        <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-body">Identity photo captured — reused automatically in done reports.</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-amber-700">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-body">No identity photo. Capture one during your next done report.</span>
                        </div>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={photoUploading}
                        className="gap-2"
                        onClick={() => photoInputRef.current?.click()}
                    >
                        {photoUploading
                            ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
                            : <><Camera className="h-4 w-4" /> {profile?.has_identity_photo ? 'Replace identity photo' : 'Upload identity photo'}</>
                        }
                    </Button>
                </CardContent>
            </Card>

            {/* GDPR data portability */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-[#2a8fbd]" />
                        My Data (GDPR Art. 15)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-body text-muted-foreground">
                        Download all personal data held about you — time entries, completion records, timesheet sign-offs, and photos metadata — as a JSON file.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGdprExport}
                        disabled={gdprExporting}
                        className="gap-2"
                    >
                        <Download className="h-4 w-4" />
                        {gdprExporting ? 'Preparing download…' : 'Download My Data'}
                    </Button>
                </CardContent>
            </Card>

            <Button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="w-full bg-[#f08a3c] hover:bg-[#e07530]"
            >
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
        </div>
    );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCmsService } from '../../../services/adminApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { RichTextEditor } from '../../ui/RichTextEditor';
import { Switch } from '../../ui/switch';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '../../ui/dialog';
import { ConfirmDeleteDialog } from '../../ui/ConfirmDeleteDialog';
import {
    FileText, Home, Shield, Lock, Info, Save, ArrowRight,
    HelpCircle, Plus, Trash2, Quote, AlertCircle, Sparkles,
    LayoutGrid, Footprints, Star, Megaphone, Globe,
    Eye, EyeOff, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

type Lang = 'en' | 'de' | 'ar' | 'pl';

const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
    { code: 'pl', label: 'Polski', flag: '🇵🇱' },
];

const BUILTIN_SLUGS = ['home', 'package-comparison', 'legal-notice', 'privacy-policy', 'terms-conditions', 'cookie-settings'];

const BUILTIN_PAGES = [
    { slug: 'home', title: 'Home Page', icon: Home },
    { slug: 'package-comparison', title: 'Packages Page', icon: LayoutGrid },
    { slug: 'legal-notice', title: 'Legal Notice / Impressum', icon: Info },
    { slug: 'privacy-policy', title: 'Privacy Policy', icon: Shield },
    { slug: 'terms-conditions', title: 'Terms & Conditions', icon: FileText },
    { slug: 'cookie-settings', title: 'Cookie Settings', icon: Lock },
];

function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function SAPages() {
    const queryClient = useQueryClient();
    const [selectedSlug, setSelectedSlug] = useState<string>(() => {
        const saved = sessionStorage.getItem('cms_edit_slug');
        if (saved) { sessionStorage.removeItem('cms_edit_slug'); return saved; }
        return 'home';
    });
    const [selectedLang, setSelectedLang] = useState<Lang>('en');

    // New page modal state
    const [showNewModal, setShowNewModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newSlug, setNewSlug] = useState('');
    const [newShowInNav, setNewShowInNav] = useState(false);
    const [newNavLabel, setNewNavLabel] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Delete confirmation state
    const [slugToDelete, setSlugToDelete] = useState<string | null>(null);

    // show_in_nav, nav_label, nav_order tracked as form state (per-page, not global)
    const [navOverrides, setNavOverrides] = useState<Record<string, { show_in_nav: boolean; nav_label: string; nav_order: number }>>({});
    // is_published tracked per page+lang
    const [publishedOverrides, setPublishedOverrides] = useState<Record<string, boolean>>({});

    const { data: pages, isLoading } = useQuery({
        queryKey: ['admin-cms-pages', selectedLang],
        queryFn: () => adminCmsService.getPages(selectedLang),
    });

    // Home page dynamic state
    const [testimonials, setTestimonials] = useState<any[]>([]);
    const [faqs, setFaqs] = useState<any[]>([]);
    const [features, setFeatures] = useState<any[]>([]);
    const [howItWorksSteps, setHowItWorksSteps] = useState<any[]>([]);
    const [aboutText, setAboutText] = useState('');
    const [aboutText2, setAboutText2] = useState('');
    const [aboutImage, setAboutImage] = useState('');
    const [initializedKey, setInitializedKey] = useState('');

    const updateMutation = useMutation({
        mutationFn: ({ slug, lang, data }: { slug: string; lang: string; data: any }) =>
            adminCmsService.updatePage(slug, lang, data),
        onSuccess: () => {
            toast.success('Page updated successfully');
            queryClient.invalidateQueries({ queryKey: ['admin-cms-pages'] });
        },
        onError: () => {
            toast.error('Failed to update page');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (slug: string) => adminCmsService.deleteCmsPage(slug),
        onSuccess: () => {
            toast.success('Page deleted');
            setSelectedSlug('home');
            queryClient.invalidateQueries({ queryKey: ['admin-cms-pages'] });
        },
        onError: () => {
            toast.error('Failed to delete page');
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    const selectedPage = pages?.find((p: any) => p.slug === selectedSlug);

    // Custom (non-built-in) pages from the API
    const customPages: any[] = (pages ?? []).filter((p: any) => !BUILTIN_SLUGS.includes(p.slug));
    const customPageSlugsInSidebar = new Set(customPages.map((p: any) => p.slug));

    // Re-initialize home state when page or language changes
    const homeKey = `${selectedSlug}-${selectedLang}`;
    if (selectedSlug === 'home' && selectedPage && initializedKey !== homeKey) {
        const c = JSON.parse(selectedPage.content || '{}');
        setTestimonials(c.testimonials || []);
        setFaqs(c.faqs || []);
        setFeatures(c.features || [{ title: '', desc: '' }, { title: '', desc: '' }, { title: '', desc: '' }, { title: '', desc: '' }]);
        setHowItWorksSteps(c.how_it_works_steps || [{ title: '', desc: '' }, { title: '', desc: '' }, { title: '', desc: '' }]);
        setAboutText(c.about_text || '');
        setAboutText2(c.about_text2 || '');
        setAboutImage(c.about_image || '');
        setInitializedKey(homeKey);
    }

    // Sync nav overrides when page changes
    const navKey = `${selectedSlug}-${selectedLang}-nav`;
    if (selectedPage && !(navKey in navOverrides)) {
        setNavOverrides(prev => ({
            ...prev,
            [navKey]: {
                show_in_nav: !!selectedPage.show_in_nav,
                nav_label: selectedPage.nav_label || '',
                nav_order: selectedPage.nav_order ?? 0,
            },
        }));
    }
    const currentNavState = navOverrides[navKey] ?? {
        show_in_nav: !!selectedPage?.show_in_nav,
        nav_label: selectedPage?.nav_label || '',
        nav_order: selectedPage?.nav_order ?? 0,
    };

    // Sync published state when page changes
    const pubKey = `${selectedSlug}-${selectedLang}`;
    if (selectedPage && !(pubKey in publishedOverrides)) {
        setPublishedOverrides(prev => ({ ...prev, [pubKey]: !!selectedPage.is_published }));
    }
    const isPublished = publishedOverrides[pubKey] ?? !!selectedPage?.is_published;

    const handlePageChange = (slug: string) => {
        setSelectedSlug(slug);
        setInitializedKey('');
    };

    const handleLangChange = (lang: Lang) => {
        setSelectedLang(lang);
        setInitializedKey('');
    };

    const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        let content: any;
        if (selectedSlug === 'home') {
            content = {
                hero_badge:         formData.get('hero_badge'),
                hero_title:         formData.get('hero_title'),
                hero_title_accent:  formData.get('hero_title_accent'),
                hero_title_suffix:  formData.get('hero_title_suffix'),
                hero_subtitle:      formData.get('hero_subtitle'),

                trusted_by: formData.get('trusted_by'),

                features_tag:      formData.get('features_tag'),
                features_subtitle: formData.get('features_subtitle'),
                features: JSON.parse(formData.get('features_json') as string || '[]'),

                how_it_works_tag:      formData.get('how_it_works_tag'),
                how_it_works_subtitle: formData.get('how_it_works_subtitle'),
                how_it_works_steps: JSON.parse(formData.get('how_it_works_steps_json') as string || '[]'),

                about_title:       formData.get('about_title'),
                about_text:        aboutText,
                about_text2:       aboutText2,
                about_stat1_label: formData.get('about_stat1_label'),
                about_stat2_label: formData.get('about_stat2_label'),
                about_image:       aboutImage,

                pricing_tag:      formData.get('pricing_tag'),
                pricing_subtitle: formData.get('pricing_subtitle'),

                testimonials_tag:      formData.get('testimonials_tag'),
                testimonials_subtitle: formData.get('testimonials_subtitle'),
                testimonials: JSON.parse(formData.get('testimonials_json') as string || '[]'),

                faq_tag:      formData.get('faq_tag'),
                faq_subtitle: formData.get('faq_subtitle'),
                faqs: JSON.parse(formData.get('faqs_json') as string || '[]'),

                cta_title:   formData.get('cta_title'),
                cta_subtitle: formData.get('cta_subtitle'),
                cta_context: formData.get('cta_context'),
            };
        } else if (selectedSlug === 'package-comparison') {
            content = {
                compare_title:    formData.get('compare_title'),
                compare_subtitle: formData.get('compare_subtitle'),
                trust_1_title:    formData.get('trust_1_title'),
                trust_1_desc:     formData.get('trust_1_desc'),
                trust_2_title:    formData.get('trust_2_title'),
                trust_2_desc:     formData.get('trust_2_desc'),
                trust_3_title:    formData.get('trust_3_title'),
                trust_3_desc:     formData.get('trust_3_desc'),
            };
        } else {
            content = formData.get('content');
        }

        updateMutation.mutate({
            slug: selectedSlug,
            lang: selectedLang,
            data: {
                title: formData.get('title') as string,
                meta_description: formData.get('meta_description') as string,
                show_in_nav: currentNavState.show_in_nav,
                nav_label: currentNavState.nav_label,
                nav_order: currentNavState.nav_order,
                is_published: isPublished,
                content
            }
        });
    };

    const handleCreatePage = async () => {
        const trimmedSlug = newSlug.trim();
        const trimmedTitle = newTitle.trim();
        if (!trimmedSlug || !trimmedTitle) {
            toast.error('Slug and title are required');
            return;
        }
        if (trimmedSlug === 'home') {
            toast.error('That slug is reserved');
            return;
        }
        const allSlugs = new Set((pages ?? []).map((p: any) => p.slug));
        if (allSlugs.has(trimmedSlug)) {
            toast.error('A page with that slug already exists');
            return;
        }
        setIsCreating(true);
        try {
            await adminCmsService.createPage(trimmedSlug, 'en', trimmedTitle, newShowInNav, newNavLabel);
            queryClient.invalidateQueries({ queryKey: ['admin-cms-pages'] });
            setShowNewModal(false);
            setNewTitle('');
            setNewSlug('');
            setNewShowInNav(false);
            setNewNavLabel('');
            handlePageChange(trimmedSlug);
            toast.success('Page created');
        } catch {
            toast.error('Failed to create page');
        } finally {
            setIsCreating(false);
        }
    };

    const isFallback = selectedPage?.is_fallback === true;
    const homeContent = selectedSlug === 'home' && selectedPage ? JSON.parse(selectedPage.content || '{}') : {};
    const pkgContent = selectedSlug === 'package-comparison' && selectedPage ? JSON.parse(selectedPage.content || '{}') : {};
    const isBuiltIn = selectedSlug === 'home';

    return (
        <>
        <div className="flex h-[calc(100vh-10rem)] gap-6">
            {/* Sidebar */}
            <div className="w-64 flex flex-col gap-2 shrink-0 overflow-y-auto">
                <h2 className="text-body font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-wider">Built-in Pages</h2>
                {BUILTIN_PAGES.map((page) => (
                    <button
                        key={page.slug}
                        onClick={() => handlePageChange(page.slug)}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl text-body font-medium transition-all group",
                            selectedSlug === page.slug
                                ? "bg-purple-600 text-white shadow-lg shadow-purple-200 dark:shadow-none translate-x-1"
                                : "hover:bg-purple-50 dark:hover:bg-purple-900/20 text-muted-foreground hover:text-purple-600"
                        )}
                    >
                        <page.icon className={cn("h-4 w-4 shrink-0", selectedSlug === page.slug ? "text-white" : "text-muted-foreground group-hover:text-purple-600")} />
                        <span className="truncate">{page.title}</span>
                        {selectedSlug === page.slug && <ArrowRight className="ml-auto h-3 w-3 shrink-0" />}
                    </button>
                ))}

                {/* Custom pages */}
                {customPages.length > 0 && (
                    <>
                        <h2 className="text-body font-semibold text-muted-foreground px-2 mt-4 mb-2 uppercase tracking-wider">Custom Pages</h2>
                        {customPages.map((page: any) => (
                            <button
                                key={page.slug}
                                onClick={() => handlePageChange(page.slug)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-body font-medium transition-all group",
                                    selectedSlug === page.slug
                                        ? "bg-purple-600 text-white shadow-lg shadow-purple-200 dark:shadow-none translate-x-1"
                                        : "hover:bg-purple-50 dark:hover:bg-purple-900/20 text-muted-foreground hover:text-purple-600"
                                )}
                            >
                                <Globe className={cn("h-4 w-4 shrink-0", selectedSlug === page.slug ? "text-white" : "text-muted-foreground group-hover:text-purple-600")} />
                                <span className="truncate">{page.title || page.slug}</span>
                                {selectedSlug === page.slug
                                    ? <ArrowRight className="ml-auto h-3 w-3 shrink-0" />
                                    : <span className={cn("ml-auto h-2 w-2 rounded-full shrink-0", page.is_published ? "bg-green-400" : "bg-amber-400")} />
                                }
                            </button>
                        ))}
                    </>
                )}

                <div className="mt-auto pt-4 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full border-dashed border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-400"
                        onClick={() => setShowNewModal(true)}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Page
                    </Button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-auto pr-2">
                {selectedPage ? (
                    <form onSubmit={handleSave} className="space-y-6 pb-12">
                        {/* Header */}
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-heading-1 font-bold text-slate-900 dark:text-white">Edit {selectedPage.title}</h1>
                                    <span className={cn(
                                        "text-micro font-semibold px-2 py-0.5 rounded-full border",
                                        isPublished
                                            ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                                            : "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"
                                    )}>
                                        {isPublished ? 'Published' : 'Draft'}
                                    </span>
                                </div>
                                <p className="text-body text-muted-foreground">Manage content and SEO for this public page.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={getLiveUrl(selectedSlug)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-body font-medium rounded-md border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    View Live
                                </a>
                                {!isBuiltIn && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="border-red-200 text-red-600 hover:bg-red-50"
                                        onClick={() => setSlugToDelete(selectedSlug)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </Button>
                                )}
                                <Button type="submit" disabled={updateMutation.isPending} className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200 dark:shadow-none">
                                    <Save className="mr-2 h-4 w-4" />
                                    {updateMutation.isPending ? 'Saving...' : `Save (${selectedLang.toUpperCase()})`}
                                </Button>
                            </div>
                        </div>

                        {/* Language Tabs */}
                        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    type="button"
                                    onClick={() => handleLangChange(lang.code)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg text-body font-medium transition-all",
                                        selectedLang === lang.code
                                            ? "bg-white dark:bg-slate-900 shadow text-purple-600 font-semibold"
                                            : "text-muted-foreground hover:text-slate-900 dark:hover:text-white"
                                    )}
                                >
                                    <span>{lang.flag}</span>
                                    <span>{lang.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Fallback notice */}
                        {isFallback && (
                            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-body">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>
                                    No <strong>{LANGUAGES.find(l => l.code === selectedLang)?.label}</strong> content yet — showing English fallback.
                                    Save to create a {LANGUAGES.find(l => l.code === selectedLang)?.label} version.
                                </span>
                            </div>
                        )}

                        {/* Page Configuration */}
                        <Card className="border-none shadow-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur">
                            <CardHeader>
                                <CardTitle className="text-heading-3">Page Configuration</CardTitle>
                                <CardDescription>Basic information, SEO, and navigation settings</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="title">Admin Display Title</Label>
                                    <Input id="title" name="title" defaultValue={selectedPage.title} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="meta_description">Meta Description (SEO)</Label>
                                    <Textarea id="meta_description" name="meta_description" placeholder="What this page is about (for search engines)" defaultValue={selectedPage.meta_description} />
                                </div>
                                <div className="border-t pt-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-body font-medium">Published</Label>
                                            <p className="text-micro text-muted-foreground mt-0.5">Unpublished pages are hidden from public visitors</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isPublished
                                                ? <Eye className="h-4 w-4 text-green-600" />
                                                : <EyeOff className="h-4 w-4 text-amber-500" />
                                            }
                                            <Switch
                                                checked={isPublished}
                                                onCheckedChange={(checked) =>
                                                    setPublishedOverrides(prev => ({ ...prev, [pubKey]: checked }))
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-body font-medium">Show in Navigation</Label>
                                            <p className="text-micro text-muted-foreground mt-0.5">Adds this page to the website header and footer nav</p>
                                        </div>
                                        <Switch
                                            checked={currentNavState.show_in_nav}
                                            onCheckedChange={(checked) =>
                                                setNavOverrides(prev => ({
                                                    ...prev,
                                                    [navKey]: { ...currentNavState, show_in_nav: checked },
                                                }))
                                            }
                                        />
                                    </div>
                                    {currentNavState.show_in_nav && (
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div className="col-span-2 grid gap-2">
                                                <Label htmlFor="nav_label">Navigation Label</Label>
                                                <Input
                                                    id="nav_label"
                                                    placeholder={selectedPage.title}
                                                    value={currentNavState.nav_label}
                                                    onChange={(e) =>
                                                        setNavOverrides(prev => ({
                                                            ...prev,
                                                            [navKey]: { ...currentNavState, nav_label: e.target.value },
                                                        }))
                                                    }
                                                />
                                                <p className="text-micro text-muted-foreground">Leave blank to use the page title</p>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="nav_order">Nav Order</Label>
                                                <Input
                                                    id="nav_order"
                                                    type="number"
                                                    min={0}
                                                    value={currentNavState.nav_order}
                                                    onChange={(e) =>
                                                        setNavOverrides(prev => ({
                                                            ...prev,
                                                            [navKey]: { ...currentNavState, nav_order: parseInt(e.target.value) || 0 },
                                                        }))
                                                    }
                                                />
                                                <p className="text-micro text-muted-foreground">Lower = earlier in nav</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Page-specific sections */}
                        {selectedSlug === 'home' ? (
                            <>
                                {/* Hero Section */}
                                <SectionCard icon={<Sparkles className="h-4 w-4" />} title="Hero Section" desc="Main banner at the top of the landing page">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field label="Badge Text" name="hero_badge" defaultValue={homeContent.hero_badge} />
                                        <Field label="Title (plain part)" name="hero_title" defaultValue={homeContent.hero_title} placeholder="Modern Invoicing for" />
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field label="Title Accent (gradient)" name="hero_title_accent" defaultValue={homeContent.hero_title_accent} placeholder="Forward-Thinking" />
                                        <Field label="Title Suffix" name="hero_title_suffix" defaultValue={homeContent.hero_title_suffix} placeholder="Businesses" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="hero_subtitle">Subtitle</Label>
                                        <Textarea id="hero_subtitle" name="hero_subtitle" defaultValue={homeContent.hero_subtitle} rows={3} />
                                    </div>
                                    <Field label="Trusted By Banner Text" name="trusted_by" defaultValue={homeContent.trusted_by} placeholder="Trusted by innovative companies worldwide" />
                                </SectionCard>

                                {/* Features Section */}
                                <SectionCard icon={<LayoutGrid className="h-4 w-4" />} title="Features Section" desc="The four feature cards below the hero">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field label="Section Heading" name="features_tag" defaultValue={homeContent.features_tag} />
                                        <Field label="Section Subtitle" name="features_subtitle" defaultValue={homeContent.features_subtitle} />
                                    </div>
                                    <div className="space-y-3">
                                        {features.map((f, idx) => (
                                            <div key={idx} className="grid gap-4 md:grid-cols-2 p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:bg-slate-900/20 dark:border-slate-800">
                                                <div>
                                                    <Label className="text-micro mb-1.5 block">Feature {idx + 1} Title</Label>
                                                    <Input value={f.title} onChange={(e) => { const n = [...features]; n[idx] = { ...n[idx], title: e.target.value }; setFeatures(n); }} />
                                                </div>
                                                <div>
                                                    <Label className="text-micro mb-1.5 block">Feature {idx + 1} Description</Label>
                                                    <Input value={f.desc} onChange={(e) => { const n = [...features]; n[idx] = { ...n[idx], desc: e.target.value }; setFeatures(n); }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <input type="hidden" name="features_json" value={JSON.stringify(features)} />
                                </SectionCard>

                                {/* How It Works Section */}
                                <SectionCard icon={<Footprints className="h-4 w-4" />} title="How It Works Section" desc="The three numbered steps">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field label="Section Heading" name="how_it_works_tag" defaultValue={homeContent.how_it_works_tag} />
                                        <Field label="Section Subtitle" name="how_it_works_subtitle" defaultValue={homeContent.how_it_works_subtitle} />
                                    </div>
                                    <div className="space-y-3">
                                        {howItWorksSteps.map((s, idx) => (
                                            <div key={idx} className="grid gap-4 md:grid-cols-2 p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:bg-slate-900/20 dark:border-slate-800">
                                                <div>
                                                    <Label className="text-micro mb-1.5 block">Step {idx + 1} Title</Label>
                                                    <Input value={s.title} onChange={(e) => { const n = [...howItWorksSteps]; n[idx] = { ...n[idx], title: e.target.value }; setHowItWorksSteps(n); }} />
                                                </div>
                                                <div>
                                                    <Label className="text-micro mb-1.5 block">Step {idx + 1} Description</Label>
                                                    <Input value={s.desc} onChange={(e) => { const n = [...howItWorksSteps]; n[idx] = { ...n[idx], desc: e.target.value }; setHowItWorksSteps(n); }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <input type="hidden" name="how_it_works_steps_json" value={JSON.stringify(howItWorksSteps)} />
                                </SectionCard>

                                {/* About Section */}
                                <SectionCard icon={<Info className="h-4 w-4" />} title="About Us Section" desc="Company description and stats">
                                    <Field label="Section Title" name="about_title" defaultValue={homeContent.about_title} />
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <Label className="text-body mb-1.5 block">First Paragraph</Label>
                                            <RichTextEditor value={aboutText} onChange={setAboutText} className="min-h-[180px]" />
                                        </div>
                                        <div>
                                            <Label className="text-body mb-1.5 block">Second Paragraph</Label>
                                            <RichTextEditor value={aboutText2} onChange={setAboutText2} className="min-h-[180px]" />
                                        </div>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field label='Stat 1 Label (e.g. "Active Users")' name="about_stat1_label" defaultValue={homeContent.about_stat1_label} />
                                        <Field label='Stat 2 Label (e.g. "Invoices Sent")' name="about_stat2_label" defaultValue={homeContent.about_stat2_label} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Section Image</Label>
                                        <div className="flex flex-col gap-3">
                                            {aboutImage ? (
                                                <div className="relative w-full max-w-sm aspect-video rounded-lg overflow-hidden border">
                                                    <img src={aboutImage} alt="About Us Preview" className="w-full h-full object-cover" />
                                                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8 shadow-md" onClick={() => setAboutImage('')}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div
                                                    className="flex flex-col items-center justify-center w-full max-w-sm aspect-video rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 cursor-pointer hover:bg-slate-100 transition-colors"
                                                    onClick={() => document.getElementById('about-image-upload')?.click()}
                                                >
                                                    <Plus className="h-8 w-8 text-slate-400 mb-2" />
                                                    <span className="text-micro text-slate-500 font-medium">Click to upload image</span>
                                                    <span className="text-body text-slate-400 mt-1">Recommended: 800x600px</span>
                                                </div>
                                            )}
                                            <input id="about-image-upload" type="file" className="hidden" accept="image/*" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
                                                const reader = new FileReader();
                                                reader.onload = async (ev) => {
                                                    try {
                                                        const base64 = ev.target?.result as string;
                                                        const url = await adminCmsService.uploadCmsImage(base64);
                                                        setAboutImage(url);
                                                        toast.success('Image uploaded');
                                                    } catch {
                                                        toast.error('Image upload failed');
                                                    }
                                                };
                                                reader.readAsDataURL(file);
                                            }} />
                                        </div>
                                    </div>
                                </SectionCard>

                                {/* Pricing Section */}
                                <SectionCard icon={<Star className="h-4 w-4" />} title="Pricing Section" desc="Headings above the pricing cards (cards are managed via Billing settings)">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field label="Section Heading" name="pricing_tag" defaultValue={homeContent.pricing_tag} />
                                        <Field label="Section Subtitle" name="pricing_subtitle" defaultValue={homeContent.pricing_subtitle} />
                                    </div>
                                </SectionCard>

                                {/* Testimonials Section */}
                                <SectionCard icon={<Quote className="h-4 w-4" />} title="Testimonials (Wall of Love)" desc="Customer quotes displayed on the landing page"
                                    action={<Button type="button" variant="outline" size="sm" onClick={() => setTestimonials([...testimonials, { name: '', role: '', text: '' }])} className="h-8 border-purple-200 text-purple-600 hover:bg-purple-50">
                                        <Plus className="h-3 w-3 mr-1" /> Add
                                    </Button>}
                                >
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field label="Section Heading" name="testimonials_tag" defaultValue={homeContent.testimonials_tag} />
                                        <Field label="Section Subtitle" name="testimonials_subtitle" defaultValue={homeContent.testimonials_subtitle} />
                                    </div>
                                    <div className="space-y-4">
                                        {testimonials.map((t, idx) => (
                                            <div key={idx} className="relative p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:bg-slate-900/20 dark:border-slate-800">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => setTestimonials(testimonials.filter((_, i) => i !== idx))} className="absolute top-2 right-2 h-7 w-7 text-slate-400 hover:text-red-500">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                <div className="grid gap-4 md:grid-cols-2 mb-4">
                                                    <div className="grid gap-2"><Label className="text-micro">User Name</Label><Input value={t.name} onChange={(e) => { const n = [...testimonials]; n[idx] = { ...n[idx], name: e.target.value }; setTestimonials(n); }} placeholder="Jane Doe" /></div>
                                                    <div className="grid gap-2"><Label className="text-micro">Role/Company</Label><Input value={t.role} onChange={(e) => { const n = [...testimonials]; n[idx] = { ...n[idx], role: e.target.value }; setTestimonials(n); }} placeholder="CEO at TechCo" /></div>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label className="text-micro">Testimonial Text</Label>
                                                    <RichTextEditor value={t.text} onChange={(val) => { const n = [...testimonials]; n[idx] = { ...n[idx], text: val }; setTestimonials(n); }} className="min-h-[120px]" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <input type="hidden" name="testimonials_json" value={JSON.stringify(testimonials)} />
                                </SectionCard>

                                {/* FAQ Section */}
                                <SectionCard icon={<HelpCircle className="h-4 w-4" />} title="Frequently Asked Questions" desc="Questions and answers displayed below testimonials"
                                    action={<Button type="button" variant="outline" size="sm" onClick={() => setFaqs([...faqs, { q: '', a: '' }])} className="h-8 border-purple-200 text-purple-600 hover:bg-purple-50">
                                        <Plus className="h-3 w-3 mr-1" /> Add
                                    </Button>}
                                >
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field label="Section Heading" name="faq_tag" defaultValue={homeContent.faq_tag} />
                                        <Field label="Section Subtitle" name="faq_subtitle" defaultValue={homeContent.faq_subtitle} />
                                    </div>
                                    <div className="space-y-4">
                                        {faqs.map((f, idx) => (
                                            <div key={idx} className="relative p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:bg-slate-900/20 dark:border-slate-800">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => setFaqs(faqs.filter((_, i) => i !== idx))} className="absolute top-2 right-2 h-7 w-7 text-slate-400 hover:text-red-500">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                <div className="grid gap-2 mb-4"><Label className="text-micro">Question</Label><Input value={f.q} onChange={(e) => { const n = [...faqs]; n[idx] = { ...n[idx], q: e.target.value }; setFaqs(n); }} placeholder="How does it work?" /></div>
                                                <div className="grid gap-2"><Label className="text-micro">Answer</Label><RichTextEditor value={f.a} onChange={(val) => { const n = [...faqs]; n[idx] = { ...n[idx], a: val }; setFaqs(n); }} className="min-h-[120px]" /></div>
                                            </div>
                                        ))}
                                    </div>
                                    <input type="hidden" name="faqs_json" value={JSON.stringify(faqs)} />
                                </SectionCard>

                                {/* Bottom CTA Section */}
                                <SectionCard icon={<Megaphone className="h-4 w-4" />} title="Bottom CTA Banner" desc="The call-to-action section at the bottom of the page">
                                    <Field label="Heading" name="cta_title" defaultValue={homeContent.cta_title} />
                                    <Field label="Subtitle" name="cta_subtitle" defaultValue={homeContent.cta_subtitle} />
                                    <Field label="Fine Print (below button)" name="cta_context" defaultValue={homeContent.cta_context} />
                                </SectionCard>
                            </>
                        ) : selectedSlug === 'package-comparison' ? (
                            <>
                                <SectionCard icon={<LayoutGrid className="h-4 w-4" />} title="Page Header" desc="Title and subtitle shown at the top of the packages comparison page">
                                    <Field label="Page Title" name="compare_title" defaultValue={pkgContent.compare_title} placeholder="Compare our plans" />
                                    <Field label="Page Subtitle" name="compare_subtitle" defaultValue={pkgContent.compare_subtitle} placeholder="Find the perfect fit for your business needs" />
                                </SectionCard>

                                <SectionCard icon={<Star className="h-4 w-4" />} title="Trust Section Cards" desc="The three highlight cards at the bottom of the comparison table">
                                    <div className="grid gap-4 md:grid-cols-2 p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:bg-slate-900/20 dark:border-slate-800">
                                        <Field label="Card 1 Title" name="trust_1_title" defaultValue={pkgContent.trust_1_title} placeholder="Highly Secure" />
                                        <Field label="Card 1 Description" name="trust_1_desc" defaultValue={pkgContent.trust_1_desc} placeholder="Enterprise-grade encryption for all your data." />
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2 p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:bg-slate-900/20 dark:border-slate-800">
                                        <Field label="Card 2 Title" name="trust_2_title" defaultValue={pkgContent.trust_2_title} placeholder="Go Global" />
                                        <Field label="Card 2 Description" name="trust_2_desc" defaultValue={pkgContent.trust_2_desc} placeholder="Multi-currency and multi-language support included." />
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2 p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:bg-slate-900/20 dark:border-slate-800">
                                        <Field label="Card 3 Title" name="trust_3_title" defaultValue={pkgContent.trust_3_title} placeholder="Customizable" />
                                        <Field label="Card 3 Description" name="trust_3_desc" defaultValue={pkgContent.trust_3_desc} placeholder="Design templates that match your brand identity." />
                                    </div>
                                </SectionCard>
                            </>
                        ) : (
                            /* Legal / custom page rich-text editor */
                            <Card className="border-none shadow-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur">
                                <CardHeader>
                                    <CardTitle className="text-heading-3">Content</CardTitle>
                                    <CardDescription>Rich text content for this page. The URL on the live website will be <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-micro">/#/cms/{selectedSlug}</code></CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <CMSContentEditor key={`${selectedSlug}-${selectedLang}`} initialValue={selectedPage.content} name="content" />
                                </CardContent>
                            </Card>
                        )}

                        <div className="flex items-center justify-end border-t pt-6">
                            <Button type="submit" disabled={updateMutation.isPending} className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200 dark:shadow-none min-w-[200px]">
                                <Save className="mr-2 h-4 w-4" />
                                {updateMutation.isPending ? 'Saving...' : `Save (${selectedLang.toUpperCase()})`}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-slate-50 dark:bg-slate-900/20 rounded-2xl border-2 border-dashed">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                        <h3 className="text-heading-3 font-semibold">Select a page to edit</h3>
                        <p className="text-body text-muted-foreground max-w-xs">Choose a page from the sidebar to modify its public content.</p>
                    </div>
                )}
            </div>
        </div>

        {/* New Page Modal */}
        <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create New Page</DialogTitle>
                    <DialogDescription>Add a new custom page to your website. You can edit the content after creation.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="new-title">Page Title</Label>
                        <Input
                            id="new-title"
                            placeholder="e.g. About Us"
                            value={newTitle}
                            onChange={(e) => {
                                setNewTitle(e.target.value);
                                setNewSlug(slugify(e.target.value));
                            }}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="new-slug">URL Slug</Label>
                        <div className="flex items-center gap-2">
                            <span className="text-body text-muted-foreground whitespace-nowrap">#/cms/</span>
                            <Input
                                id="new-slug"
                                placeholder="about-us"
                                value={newSlug}
                                onChange={(e) => setNewSlug(slugify(e.target.value))}
                            />
                        </div>
                        <p className="text-micro text-muted-foreground">Auto-generated from title. Lowercase letters, numbers, and hyphens only.</p>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t">
                        <div>
                            <Label className="text-body font-medium">Show in Navigation</Label>
                            <p className="text-micro text-muted-foreground mt-0.5">Add to header/footer nav links</p>
                        </div>
                        <Switch checked={newShowInNav} onCheckedChange={setNewShowInNav} />
                    </div>
                    {newShowInNav && (
                        <div className="grid gap-2">
                            <Label htmlFor="new-nav-label">Navigation Label</Label>
                            <Input
                                id="new-nav-label"
                                placeholder={newTitle || 'e.g. About Us'}
                                value={newNavLabel}
                                onChange={(e) => setNewNavLabel(e.target.value)}
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowNewModal(false)}>Cancel</Button>
                    <Button
                        type="button"
                        disabled={isCreating || !newTitle.trim() || !newSlug.trim()}
                        onClick={handleCreatePage}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        {isCreating ? 'Creating...' : 'Create Page'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDeleteDialog
            open={!!slugToDelete}
            onOpenChange={(open) => { if (!open) setSlugToDelete(null); }}
            onConfirm={() => { if (slugToDelete) { deleteMutation.mutate(slugToDelete); setSlugToDelete(null); } }}
            title="Delete Page"
            description={`This will permanently delete the page "${slugToDelete}" and all its language variants. This action cannot be undone.`}
            confirmLabel="Delete"
        />
        </>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getLiveUrl(slug: string): string {
    const map: Record<string, string> = {
        'home': '#/landing',
        'package-comparison': '#/packageComparison',
        'legal-notice': '#/impressum',
        'privacy-policy': '#/privacyPolicy',
        'terms-conditions': '#/termsAndConditions',
        'cookie-settings': '#/cookiePolicy',
    };
    return map[slug] ?? `#/cms/${slug}`;
}

function SectionCard({
    icon, title, desc, children, action
}: {
    icon: React.ReactNode;
    title: string;
    desc: string;
    children: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <Card className="border-none shadow-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-purple-600 font-semibold">
                        {icon}
                        <CardTitle className="text-heading-3 text-foreground">{title}</CardTitle>
                    </div>
                    {action}
                </div>
                <CardDescription>{desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">{children}</CardContent>
        </Card>
    );
}

function Field({ label, name, defaultValue, placeholder }: { label: string; name: string; defaultValue?: string; placeholder?: string }) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={name}>{label}</Label>
            <Input id={name} name={name} defaultValue={defaultValue ?? ''} placeholder={placeholder} />
        </div>
    );
}

function CMSContentEditor({ initialValue, name }: { initialValue: string; name: string }) {
    const [val, setVal] = useState(initialValue);
    return (
        <>
            <RichTextEditor value={val} onChange={setVal} className="min-h-[400px]" />
            <input type="hidden" name={name} value={val} />
        </>
    );
}

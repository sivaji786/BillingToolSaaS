import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCmsService } from '../../../services/adminApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { RichTextEditor } from '../../ui/RichTextEditor';
import { FileText, Home, Shield, Lock, Info, Save, ArrowRight, HelpCircle, Plus, Trash2, Quote, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

type Lang = 'en' | 'de' | 'ar' | 'pl';

const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
    { code: 'pl', label: 'Polski', flag: '🇵🇱' },
];

export function SAPages() {
    const queryClient = useQueryClient();
    const [selectedSlug, setSelectedSlug] = useState<string>('home');
    const [selectedLang, setSelectedLang] = useState<Lang>('en');

    const { data: pages, isLoading } = useQuery({
        queryKey: ['admin-cms-pages', selectedLang],
        queryFn: () => adminCmsService.getPages(selectedLang),
    });

    const [testimonials, setTestimonials] = useState<any[]>([]);
    const [faqs, setFaqs] = useState<any[]>([]);
    const [aboutText, setAboutText] = useState('');
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    const selectedPage = pages?.find((p: any) => p.slug === selectedSlug);

    // Initialize local state when home page or language changes
    const homeKey = `${selectedSlug}-${selectedLang}`;
    if (selectedSlug === 'home' && selectedPage && initializedKey !== homeKey) {
        const content = JSON.parse(selectedPage.content || '{}');
        setTestimonials(content.testimonials || []);
        setFaqs(content.faqs || []);
        setAboutText(content.about_text || '');
        setAboutImage(content.about_image || '');
        setInitializedKey(homeKey);
    }

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
                hero_badge: formData.get('hero_badge'),
                hero_title: formData.get('hero_title'),
                hero_subtitle: formData.get('hero_subtitle'),
                about_title: formData.get('about_title'),
                about_text: aboutText,
                about_image: aboutImage,
                testimonials_tag: formData.get('testimonials_tag'),
                testimonials_subtitle: formData.get('testimonials_subtitle'),
                testimonials: JSON.parse(formData.get('testimonials_json') as string || '[]'),
                faq_tag: formData.get('faq_tag'),
                faq_subtitle: formData.get('faq_subtitle'),
                faqs: JSON.parse(formData.get('faqs_json') as string || '[]'),
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
                content
            }
        });
    };

    const pagesList = [
        { slug: 'home', title: 'Home Page', icon: Home },
        { slug: 'legal-notice', title: 'Legal Notice / Impressum', icon: Info },
        { slug: 'privacy-policy', title: 'Privacy Policy', icon: Shield },
        { slug: 'terms-conditions', title: 'Terms & Conditions', icon: FileText },
        { slug: 'cookie-settings', title: 'Cookie Settings', icon: Lock },
    ];

    const isFallback = selectedPage?.is_fallback === true;

    return (
        <div className="flex h-[calc(100vh-10rem)] gap-6">
            {/* Sidebar List */}
            <div className="w-64 flex flex-col gap-2 shrink-0">
                <h2 className="text-sm font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-wider">Pages</h2>
                {pagesList.map((page) => (
                    <button
                        key={page.slug}
                        onClick={() => handlePageChange(page.slug)}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                            selectedSlug === page.slug
                                ? "bg-purple-600 text-white shadow-lg shadow-purple-200 dark:shadow-none translate-x-1"
                                : "hover:bg-purple-50 dark:hover:bg-purple-900/20 text-muted-foreground hover:text-purple-600"
                        )}
                    >
                        <page.icon className={cn("h-4 w-4", selectedSlug === page.slug ? "text-white" : "text-muted-foreground group-hover:text-purple-600")} />
                        {page.title}
                        {selectedSlug === page.slug && <ArrowRight className="ml-auto h-3 w-3" />}
                    </button>
                ))}
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-auto pr-2">
                {selectedPage ? (
                    <form onSubmit={handleSave} className="space-y-6 pb-12">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit {selectedPage.title}</h1>
                                <p className="text-sm text-muted-foreground">Manage content and SEO for your public {selectedSlug} page.</p>
                            </div>
                            <Button type="submit" disabled={updateMutation.isPending} className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200 dark:shadow-none">
                                <Save className="mr-2 h-4 w-4" />
                                {updateMutation.isPending ? 'Saving...' : `Save (${selectedLang.toUpperCase()})`}
                            </Button>
                        </div>

                        {/* Language Tab Switcher */}
                        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    type="button"
                                    onClick={() => handleLangChange(lang.code)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
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
                            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>
                                    No <strong>{LANGUAGES.find(l => l.code === selectedLang)?.label}</strong> content yet — showing English fallback.
                                    Save to create a {LANGUAGES.find(l => l.code === selectedLang)?.label} version.
                                </span>
                            </div>
                        )}

                        <div className="grid gap-6">
                            <Card className="border-none shadow-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur">
                                <CardHeader>
                                    <CardTitle className="text-lg">Page Configuration</CardTitle>
                                    <CardDescription>Basic information and SEO settings</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="title">Admin Display Title</Label>
                                        <Input id="title" name="title" defaultValue={selectedPage.title} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="meta_description">Meta Description (SEO)</Label>
                                        <Textarea
                                            id="meta_description"
                                            name="meta_description"
                                            placeholder="What this page is about (for search engines)"
                                            defaultValue={selectedPage.meta_description}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur">
                                <CardHeader>
                                    <CardTitle className="text-lg">Content</CardTitle>
                                    <CardDescription>
                                        {selectedSlug === 'home'
                                            ? 'Structured parts of the landing page'
                                            : 'Rich text content for this legal page'
                                        }
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {selectedSlug === 'home' ? (
                                        <div className="space-y-8">
                                            {(() => {
                                                const homeContent = JSON.parse(selectedPage.content || '{}');

                                                const addTestimonial = () => setTestimonials([...testimonials, { name: '', role: '', text: '' }]);
                                                const removeTestimonial = (index: number) => setTestimonials(testimonials.filter((_, i) => i !== index));
                                                const updateTestimonial = (index: number, field: string, value: string) => {
                                                    const newT = [...testimonials];
                                                    newT[index] = { ...newT[index], [field]: value };
                                                    setTestimonials(newT);
                                                };

                                                const addFaq = () => setFaqs([...faqs, { q: '', a: '' }]);
                                                const removeFaq = (index: number) => setFaqs(faqs.filter((_, i) => i !== index));
                                                const updateFaq = (index: number, field: string, value: string) => {
                                                    const newF = [...faqs];
                                                    newF[index] = { ...newF[index], [field]: value };
                                                    setFaqs(newF);
                                                };

                                                const handleAboutImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;

                                                    if (!file.type.startsWith('image/')) {
                                                        toast.error('Please upload an image file');
                                                        return;
                                                    }

                                                    const reader = new FileReader();
                                                    reader.onload = (event) => {
                                                        setAboutImage(event.target?.result as string);
                                                    };
                                                    reader.readAsDataURL(file);
                                                };

                                                return (
                                                    <>
                                                        {/* Hero Section */}
                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-2 text-purple-600 font-semibold mb-2">
                                                                <Home className="h-4 w-4" />
                                                                <span>Hero Section</span>
                                                            </div>
                                                            <div className="grid gap-4 md:grid-cols-2">
                                                                <div className="grid gap-2">
                                                                    <Label htmlFor="hero_badge">Hero Badge Text</Label>
                                                                    <Input id="hero_badge" name="hero_badge" defaultValue={homeContent.hero_badge} />
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label htmlFor="hero_title">Hero Main Title</Label>
                                                                    <Input id="hero_title" name="hero_title" defaultValue={homeContent.hero_title} />
                                                                </div>
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="hero_subtitle">Hero Subtitle</Label>
                                                                <Textarea id="hero_subtitle" name="hero_subtitle" defaultValue={homeContent.hero_subtitle} rows={3} />
                                                            </div>
                                                        </div>

                                                        {/* About Us Section */}
                                                        <div className="border-t pt-6 space-y-4">
                                                            <div className="flex items-center gap-2 text-purple-600 font-semibold mb-2">
                                                                <Info className="h-4 w-4" />
                                                                <span>About Us Section</span>
                                                            </div>
                                                            <div className="grid gap-4 md:grid-cols-2">
                                                                <div className="grid gap-4">
                                                                    <div className="grid gap-2">
                                                                        <Label htmlFor="about_title">Section Title</Label>
                                                                        <Input id="about_title" name="about_title" defaultValue={homeContent.about_title} />
                                                                    </div>
                                                                    <div className="grid gap-2">
                                                                        <Label>Section Image</Label>
                                                                        <div className="flex flex-col gap-3">
                                                                            {aboutImage ? (
                                                                                <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                                                                                    <img src={aboutImage} alt="About Us Preview" className="w-full h-full object-cover" />
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="destructive"
                                                                                        size="icon"
                                                                                        className="absolute top-2 right-2 h-8 w-8 shadow-md"
                                                                                        onClick={() => setAboutImage('')}
                                                                                    >
                                                                                        <Trash2 className="h-4 w-4" />
                                                                                    </Button>
                                                                                </div>
                                                                            ) : (
                                                                                <div
                                                                                    className="flex flex-col items-center justify-center w-full aspect-video rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 cursor-pointer hover:bg-slate-100 transition-colors"
                                                                                    onClick={() => document.getElementById('about-image-upload')?.click()}
                                                                                >
                                                                                    <Plus className="h-8 w-8 text-slate-400 mb-2" />
                                                                                    <span className="text-xs text-slate-500 font-medium font-outfit">Click to upload image</span>
                                                                                    <span className="text-[10px] text-slate-400 mt-1">Recommended: 800x600px</span>
                                                                                </div>
                                                                            )}
                                                                            <input
                                                                                id="about-image-upload"
                                                                                type="file"
                                                                                className="hidden"
                                                                                accept="image/*"
                                                                                onChange={handleAboutImageUpload}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label htmlFor="about_text">Section Main Text</Label>
                                                                    <RichTextEditor
                                                                        value={aboutText}
                                                                        onChange={setAboutText}
                                                                        className="min-h-[250px]"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Testimonials Section */}
                                                        <div className="border-t pt-6 space-y-4">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2 text-purple-600 font-semibold">
                                                                    <Quote className="h-4 w-4" />
                                                                    <span>Testimonials (Wall of Love)</span>
                                                                </div>
                                                                <Button type="button" variant="outline" size="sm" onClick={addTestimonial} className="h-8 border-purple-200 text-purple-600 hover:bg-purple-50">
                                                                    <Plus className="h-3 w-3 mr-1" /> Add Testimonial
                                                                </Button>
                                                            </div>

                                                            <div className="grid gap-4">
                                                                <div className="grid gap-4 md:grid-cols-2">
                                                                    <div className="grid gap-2">
                                                                        <Label>Module Tagline</Label>
                                                                        <Input name="testimonials_tag" defaultValue={homeContent.testimonials_tag} placeholder="e.g. Wall of Love" />
                                                                    </div>
                                                                    <div className="grid gap-2">
                                                                        <Label>Module Subtitle</Label>
                                                                        <Input name="testimonials_subtitle" defaultValue={homeContent.testimonials_subtitle} placeholder="Subtitle text..." />
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-4">
                                                                    {testimonials.map((t, idx) => (
                                                                        <div key={idx} className="relative p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:bg-slate-900/20 dark:border-slate-800">
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                onClick={() => removeTestimonial(idx)}
                                                                                className="absolute top-2 right-2 h-7 w-7 text-slate-400 hover:text-red-500"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                            <div className="grid gap-4 md:grid-cols-2 mb-4">
                                                                                <div className="grid gap-2">
                                                                                    <Label className="text-xs">User Name</Label>
                                                                                    <Input value={t.name} onChange={(e) => updateTestimonial(idx, 'name', e.target.value)} placeholder="Jane Doe" />
                                                                                </div>
                                                                                <div className="grid gap-2">
                                                                                    <Label className="text-xs">Role/Company</Label>
                                                                                    <Input value={t.role} onChange={(e) => updateTestimonial(idx, 'role', e.target.value)} placeholder="CEO at TechCo" />
                                                                                </div>
                                                                            </div>
                                                                            <div className="grid gap-2">
                                                                                <Label className="text-xs">Testimonial Text</Label>
                                                                                <RichTextEditor
                                                                                    value={t.text}
                                                                                    onChange={(val) => updateTestimonial(idx, 'text', val)}
                                                                                    className="min-h-[150px]"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <input type="hidden" name="testimonials_json" value={JSON.stringify(testimonials)} />
                                                            </div>
                                                        </div>

                                                        {/* FAQ Section */}
                                                        <div className="border-t pt-6 space-y-4">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2 text-purple-600 font-semibold">
                                                                    <HelpCircle className="h-4 w-4" />
                                                                    <span>Frequently Asked Questions</span>
                                                                </div>
                                                                <Button type="button" variant="outline" size="sm" onClick={addFaq} className="h-8 border-purple-200 text-purple-600 hover:bg-purple-50">
                                                                    <Plus className="h-3 w-3 mr-1" /> Add FAQ
                                                                </Button>
                                                            </div>

                                                            <div className="grid gap-4">
                                                                <div className="grid gap-4 md:grid-cols-2">
                                                                    <div className="grid gap-2">
                                                                        <Label>Module Tagline</Label>
                                                                        <Input name="faq_tag" defaultValue={homeContent.faq_tag} placeholder="e.g. FAQs" />
                                                                    </div>
                                                                    <div className="grid gap-2">
                                                                        <Label>Module Subtitle</Label>
                                                                        <Input name="faq_subtitle" defaultValue={homeContent.faq_subtitle} placeholder="Subtitle text..." />
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-4">
                                                                    {faqs.map((f, idx) => (
                                                                        <div key={idx} className="relative p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:bg-slate-900/20 dark:border-slate-800">
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                onClick={() => removeFaq(idx)}
                                                                                className="absolute top-2 right-2 h-7 w-7 text-slate-400 hover:text-red-500"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                            <div className="grid gap-2 mb-4">
                                                                                <Label className="text-xs">Question</Label>
                                                                                <Input value={f.q} onChange={(e) => updateFaq(idx, 'q', e.target.value)} placeholder="How does it work?" />
                                                                            </div>
                                                                            <div className="grid gap-2">
                                                                                <Label className="text-xs">Answer</Label>
                                                                                <RichTextEditor
                                                                                    value={f.a}
                                                                                    onChange={(val) => updateFaq(idx, 'a', val)}
                                                                                    className="min-h-[150px]"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <input type="hidden" name="faqs_json" value={JSON.stringify(faqs)} />
                                                            </div>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="grid gap-2">
                                            <CMSContentEditor
                                                key={`${selectedSlug}-${selectedLang}`}
                                                initialValue={selectedPage.content}
                                                name="content"
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

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
                        <h3 className="text-lg font-semibold">Select a page to edit</h3>
                        <p className="text-sm text-muted-foreground max-w-xs">Choose a page from the sidebar to modify its public content.</p>
                    </div>
                )}
            </div>
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

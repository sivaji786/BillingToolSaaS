import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { InvoiceTemplate, CompanyProfile } from '../types/invoice';
import { TemplateDesignLayout } from '../components/invoice/TemplateDesignLayout';
import { toast } from 'sonner';
import { invoiceTemplateService, companyProfileService } from '../services/api';

export function DesignLayoutPage() {
    const [template, setTemplate] = useState<InvoiceTemplate | null>(null);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const queryClient = useQueryClient();

    useEffect(() => {
        // Get template ID from hash (e.g., #designLayout/123 or #designLayout/new)
        const hash = window.location.hash;
        const match = hash.match(/#designLayout\/(.+)/);
        const templateId = match ? match[1] : null;

        const loadData = async () => {
            if (!templateId) {
                toast.error('No template ID provided');
                window.location.hash = 'templates';
                return;
            }

            try {
                let fetchedProfile = null;
                try {
                    const profiles = await companyProfileService.getAll();
                    if (profiles && profiles.length > 0) {
                        fetchedProfile = profiles[0];
                        setProfile(fetchedProfile);
                    }
                } catch (e) {
                    console.error('Failed to load profile', e);
                }

                // Handle new template case
                if (templateId === 'new') {
                    // Create a minimal template object for new templates using profile defaults
                    setTemplate({
                        id: '',
                        name: 'New Template',
                        description: '',
                        seller: {
                            name: fetchedProfile?.name || '',
                            vatId: fetchedProfile?.vatId || '',
                            address: fetchedProfile?.address || { street: '', city: '', postalCode: '', country: '' },
                            contactEmail: fetchedProfile?.email || '',
                            contactPhone: fetchedProfile?.phone || ''
                        },
                        defaultCurrency: fetchedProfile?.defaultCurrency || 'EUR',
                        defaultTaxCategory: fetchedProfile?.defaultTaxRate === 0 ? 'Z' : 'S',
                        defaultTaxPercent: fetchedProfile?.defaultTaxRate ?? 19,
                        defaultPaymentTerms: {
                            note: fetchedProfile?.paymentTermsDays ? `Payment due within ${fetchedProfile.paymentTermsDays} days` : 'Payment due within 30 days'
                        },
                        logoUrl: fetchedProfile?.logoUrl || '',
                        headerText: fetchedProfile?.headerText || '',
                        footerText: fetchedProfile?.footerText || '',
                        layout: []
                    });
                    setLoading(false);
                    return;
                }

                const templates = await invoiceTemplateService.getAll();
                const found = templates.find((t: InvoiceTemplate) => t.id === templateId);

                if (found) {
                    setTemplate(found);
                } else {
                    toast.error('Template not found');
                    window.location.hash = 'templates';
                }
            } catch (error) {
                console.error('Error loading template:', error);
                toast.error('Failed to load template');
                window.location.hash = 'templates';
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const handleLayoutChange = async (newLayout: any) => {
        if (!template) return;

        // Update template with new layout
        const updatedTemplate = { ...template, layout: newLayout };
        setTemplate(updatedTemplate);

        // Save to API
        try {
            if (template.id) {
                await invoiceTemplateService.update(template.id, updatedTemplate);
            }
        } catch (error) {
            console.error('Error saving template:', error);
            toast.error('Failed to save layout');
        }
    };

    const handleSave = async () => {
        if (!template) return;

        try {
            if (template.id) {
                await invoiceTemplateService.update(template.id, template);
                queryClient.invalidateQueries({ queryKey: ['templates'] });
                toast.success('Layout saved successfully');
                window.location.hash = 'templates';
            }
        } catch (error) {
            console.error('Error saving template:', error);
            toast.error('Failed to save layout');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading template...</p>
                </div>
            </div>
        );
    }

    if (!template) {
        return null;
    }

    return (
        <div className="w-full h-full overflow-hidden">
            <TemplateDesignLayout
                template={template}
                profile={profile}
                onLayoutChange={handleLayoutChange}
                onSave={handleSave}
                onCancel={() => window.location.hash = 'templates'}
            />
        </div>
    );
}

export default DesignLayoutPage;

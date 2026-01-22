import { useState, useEffect } from 'react';
import { InvoiceTemplate } from '../types/invoice';
import { TemplateDesignLayout } from '../components/invoice/TemplateDesignLayout';
import { Button } from '../components/ui/button';
import { ArrowLeft, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { invoiceTemplateService } from '../services/api';

export function DesignLayoutPage() {
    const [template, setTemplate] = useState<InvoiceTemplate | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get template ID from hash (e.g., #designLayout/123 or #designLayout/new)
        const hash = window.location.hash;
        const match = hash.match(/#designLayout\/(.+)/);
        const templateId = match ? match[1] : null;

        const loadTemplate = async () => {
            if (!templateId) {
                toast.error('No template ID provided');
                window.location.hash = 'templates';
                return;
            }

            // Handle new template case
            if (templateId === 'new') {
                // Create a minimal template object for new templates
                setTemplate({
                    id: '',
                    name: 'New Template',
                    description: '',
                    seller: {
                        name: '',
                        address: { street: '', city: '', postalCode: '', country: '' }
                    },
                    defaultCurrency: 'EUR',
                    defaultTaxCategory: 'Standard',
                    defaultTaxPercent: 0,
                    defaultPaymentTerms: {},
                    logoUrl: '',
                    headerText: '',
                    footerText: '',
                    layout: []
                });
                setLoading(false);
                return;
            }

            try {
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

        loadTemplate();
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
        <div className="relative">
            {/* Design Layout Component */}
            < div className="pt-20" >
                <TemplateDesignLayout
                    template={template}
                    onLayoutChange={handleLayoutChange}
                />
            </div >
            {/* Floating Header */}
            <div className="top-0 left-0 right-0 z-50">
                <div className="flex gap-4">
                    <Button
                        variant="outline"
                        onClick={() => window.location.hash = 'templates'}
                        className="gap-2"
                    >
                        <X className="h-4 w-4" />
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-lg gap-2"
                    >
                        <Save className="h-4 w-4" />
                        Save
                    </Button>
                </div>
            </div >


        </div >
    );
}

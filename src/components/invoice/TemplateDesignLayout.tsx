import { useState } from 'react';
import { InvoiceTemplate, TemplateLayoutElement, CompanyProfile } from '../../types/invoice';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Layout as LayoutIcon, Settings as SettingsIcon, Eye, EyeOff, RotateCcw, Grid3X3, ZoomIn, Minus, Plus } from 'lucide-react';
import { InvoiceQRCode } from './InvoiceQRCode';
import { useLanguage } from '../../contexts/LanguageContext';
import { DEFAULT_LAYOUT, DEFAULT_LETTER_LAYOUT } from '../../utils/invoice-templates-defaults';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';

// DEFAULT_LAYOUT moved to src/utils/invoice-templates-defaults.ts

interface TemplateDesignLayoutProps {
    template: InvoiceTemplate;
    profile?: CompanyProfile | null;
    onLayoutChange: (layout: TemplateLayoutElement[]) => void;
    onSave?: () => void;
    onCancel?: () => void;
}

export function TemplateDesignLayout({ template, profile, onLayoutChange, onSave, onCancel }: TemplateDesignLayoutProps) {
    const { t } = useLanguage();
    const isLetterTemplate = template.templateType === 'business_letter';
    const defaultLayoutForType = isLetterTemplate ? DEFAULT_LETTER_LAYOUT : DEFAULT_LAYOUT;

    const [layout, setLayout] = useState<TemplateLayoutElement[]>(
        template.layout && template.layout.length > 0 ? template.layout : defaultLayoutForType
    );
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [zoom, setZoom] = useState(1.2);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
    const [elementStartPos, setElementStartPos] = useState({ x: 0, y: 0 });
    const GRID_SIZE = 10;
    const CANVAS_W = 595;
    const CANVAS_H = 842;

    // Professional Light Theme
    const DESIGN_THEME = {
        primary: '#4f46e5', // Indigo 600
        primaryLight: 'rgba(79, 70, 229, 0.05)',
        border: '#e2e8f0', // Slate 200
        surface: '#ffffff', // White
        canvasBg: '#f1f5f9', // Slate 100
        textPrimary: '#0f172a', // Slate 900
        textSecondary: '#64748b', // Slate 500
        elementTints: {
            logo: 'rgba(37, 99, 235, 0.08)', // Blue (slightly more saturated)
            header: 'rgba(37, 99, 235, 0.12)',
            seller: 'rgba(79, 70, 229, 0.08)', // Indigo
            buyer: 'rgba(79, 70, 229, 0.08)',
            items: 'rgba(5, 150, 105, 0.08)', // Emerald
            totals: 'rgba(124, 58, 237, 0.08)', // Violet
            notes: 'rgba(217, 119, 6, 0.08)', // Amber
            footer: 'rgba(71, 85, 105, 0.08)', // Slate
            default: 'rgba(100, 116, 139, 0.08)'
        }
    };

    const handleLayoutChange = (id: string, updates: Partial<TemplateLayoutElement>) => {
        let finalUpdates = { ...updates };

        // Apply snapping if enabled
        if (snapToGrid) {
            if (updates.x !== undefined) finalUpdates.x = Math.round(updates.x / GRID_SIZE) * GRID_SIZE;
            if (updates.y !== undefined) finalUpdates.y = Math.round(updates.y / GRID_SIZE) * GRID_SIZE;
        }

        const newLayout = layout.map(el =>
            el.id === id ? { ...el, ...finalUpdates } : el
        );
        setLayout(newLayout);
        onLayoutChange(newLayout);
    };

    const handlePointerDown = (e: React.PointerEvent, el: TemplateLayoutElement) => {
        if (['items', 'notes', 'footer', 'tax_summary', 'header', 'description'].includes(el.type)) return;

        e.stopPropagation();
        setSelectedId(el.id);
        setDraggingId(el.id);
        setDragStartPos({ x: e.clientX, y: e.clientY });
        setElementStartPos({ x: el.x, y: el.y });
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!draggingId) return;

        const deltaX = (e.clientX - dragStartPos.x) / zoom;
        const deltaY = (e.clientY - dragStartPos.y) / zoom;

        let newX = elementStartPos.x + deltaX;
        let newY = elementStartPos.y + deltaY;

        // Snapping logic during drag
        if (snapToGrid) {
            newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
            newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
        }

        // Boundary enforcement using element dimensions so the element stays fully inside the canvas
        const draggingEl = layout.find(el => el.id === draggingId);
        const elW = draggingEl?.w ?? 100;
        const elH = draggingEl?.h ?? 40;
        newX = Math.max(0, Math.min(newX, CANVAS_W - elW));
        newY = Math.max(0, Math.min(newY, CANVAS_H - elH));

        handleLayoutChange(draggingId, { x: Math.round(newX), y: Math.round(newY) });
    };

    const handlePointerUp = () => {
        setDraggingId(null);
    };

    const toggleVisibility = (id: string) => {
        const newLayout = layout.map(el =>
            el.id === id ? { ...el, visible: !el.visible } : el
        );
        setLayout(newLayout);
        onLayoutChange(newLayout);
    };

    const resetLayout = () => {
        const defaultLayout = template.templateType === 'business_letter' ? DEFAULT_LETTER_LAYOUT : DEFAULT_LAYOUT;
        setLayout(defaultLayout);
        onLayoutChange(defaultLayout);
        setSelectedId(null);
    };

    const selectedElement = layout.find(el => el.id === selectedId);

    return (
        <div className="relative w-full h-full bg-slate-100 flex flex-col font-sans antialiased text-slate-900 overflow-hidden">
            {/* Top Bar: Template Name - Sticky and Professional */}
            <div className="h-20 bg-white/95 border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-05 shadow-sm sticky top-0 backdrop-blur-md">
                <div className="flex items-center gap-5">
                    <div className="h-11 w-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 ring-4 ring-indigo-50">
                        <LayoutIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-heading-3 font-black uppercase tracking-tight text-slate-900 leading-none">
                                {template.name || t('designLayout.newTemplate')}
                            </h2>
                            <Badge variant="outline" className="h-5 px-2 text-[8px] font-black tracking-widest border-indigo-200 bg-indigo-50 text-indigo-600 border-none shadow-sm uppercase">
                                {t('designLayout.designMode') || 'Design Mode'}
                            </Badge>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5 font-bold uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {t('designLayout.editingLayout') || 'Pixel-Perfect Coordinate Editor'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        className="h-11 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        onClick={onSave}
                        className="h-11 px-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:shadow-indigo-600/40 hover:-translate-y-0.5"
                    >
                        {t('common.save')}
                    </Button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden">

                {/* Left Sidebar: Element Library */}
                <div className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-[20px_0_50px_-20px_rgba(0,0,0,0.05)] z-0">
                    <div className="p-7 border-b border-slate-100 bg-slate-50/50 space-y-2">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                            <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                                <LayoutIcon className="h-3.5 w-3.5 text-indigo-600" />
                            </div>
                            {t('designLayout.elementLibrary')}
                        </h3>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            isLetterTemplate
                                ? 'bg-purple-50 text-purple-600 border border-purple-200'
                                : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isLetterTemplate ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                            {isLetterTemplate ? (t('nav.letters') || 'Business Letter') : (t('nav.invoices') || 'Invoice')} {t('templates.templateType') || 'Template'}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-2 custom-scrollbar bg-white">
                        {(() => {
                            const commonTypes = ['logo', 'header', 'title', 'dates', 'signature', 'qr', 'footer'];
                            const specificTypes = isLetterTemplate
                                ? ['sender', 'to', 'description']
                                : ['seller', 'buyer', 'items', 'tax_summary', 'totals', 'notes'];
                            const specificLabel = isLetterTemplate ? 'Letter' : 'Invoice';

                            const groups = [
                                { label: 'Common', types: commonTypes },
                                { label: specificLabel, types: specificTypes },
                            ];

                            return groups.map(group => {
                                const groupEls = layout.filter(el => group.types.includes(el.type));
                                if (groupEls.length === 0) return null;
                                return (
                                    <div key={group.label} className="space-y-2">
                                        <div className="px-1 pt-3 pb-1">
                                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
                                                {group.label} Elements
                                            </span>
                                        </div>
                                        {groupEls.map(el => (
                                            <div
                                                key={el.id}
                                                className={`group flex flex-col gap-3 p-5 rounded-2xl transition-all duration-300 border relative overflow-hidden ${
                                                    selectedId === el.id
                                                        ? 'bg-indigo-50/50 border-indigo-200 shadow-[0_4px_25px_rgba(79,70,229,0.1)] ring-1 ring-indigo-500/10'
                                                        : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200 hover:shadow-md'
                                                }`}
                                                onClick={() => setSelectedId(el.id)}
                                            >
                                                {selectedId === el.id && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600 rounded-r-full shadow-[2px_0_10px_rgba(79,70,229,0.3)]" />
                                                )}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3.5">
                                                        <div className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ${el.visible ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]' : 'bg-slate-200'}`} />
                                                        <span className={`text-[12px] font-black uppercase tracking-widest transition-colors ${selectedId === el.id ? 'text-indigo-900' : 'text-slate-500 group-hover:text-slate-900'}`}>
                                                            {t(`designLayout.elements.${el.type}`)}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={`h-8 w-8 rounded-xl transition-all ${el.visible ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                                                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleVisibility(el.id); }}
                                                    >
                                                        {el.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                                <div className="flex items-center justify-between mt-1 px-1">
                                                    <span className="text-[10px] text-slate-400 font-mono font-black italic tracking-tighter">
                                                        POS: {el.x}, {el.y}
                                                    </span>
                                                    {selectedId === el.id && (
                                                        <Badge className="h-5 px-2 text-[9px] bg-indigo-600 text-white font-black tracking-[0.2em] shadow-lg shadow-indigo-600/20 border-none animate-in zoom-in-75">SELECTED</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            });
                        })()}
                    </div>

                    <div className="p-7 border-t border-slate-100 bg-slate-50/50 space-y-4">
                        <Button
                            variant="outline"
                            className="w-full h-12 gap-3 text-[11px] font-black uppercase tracking-[0.25em] bg-white border-slate-200 hover:bg-indigo-600 hover:border-indigo-600 text-slate-500 hover:text-white transition-all duration-300 rounded-2xl shadow-sm hover:shadow-xl group"
                            onClick={resetLayout}
                        >
                            <RotateCcw className="h-4 w-4 group-hover:rotate-[-90deg] transition-transform duration-500" />
                            {t('designLayout.resetLayout')}
                        </Button>
                    </div>
                </div>

                {/* Center: Canvas Area */}
                <div className="flex-1 overflow-auto bg-slate-100 relative">
                    {/* Top Ruler Helper */}
                    <div className="sticky top-0 h-8 w-full bg-white/90 border-b border-slate-200 backdrop-blur-md z-40 flex items-center px-[calc(50%-297px)] shadow-sm">
                        <div className="w-[595px] h-full relative flex items-end overflow-hidden">
                            {[0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550].map(val => (
                                <div
                                    key={val}
                                    className={`absolute border-l border-slate-200 transition-all ${val % 100 === 0 ? 'h-4' : 'h-2'}`}
                                    style={{ left: `${val}px` }}
                                >
                                    {val % 100 === 0 && (
                                        <span className="absolute -top-1 left-2 text-[8px] font-black text-slate-400/60 font-mono tracking-tighter italic">
                                            {val}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="w-full h-full pb-32 pt-20 flex items-start justify-center min-w-[850px]">
                        <div
                            style={{
                                transform: `scale(${zoom})`,
                                transformOrigin: 'top center',
                                width: '595px',
                                height: '842px'
                            }}
                            className="bg-white relative shadow-[0_40px_120px_-10px_rgba(15,23,42,0.15)] ring-1 ring-slate-200/50 rounded-sm transition-transform duration-500 ease-out p-0"
                            onClick={() => setSelectedId(null)}
                        >
                            {/* Grid background */}
                            <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
                                backgroundImage: `repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent ${GRID_SIZE}px),
                                  repeating-linear-gradient(90deg, #000 0px, #000 1px, transparent 1px, transparent ${GRID_SIZE}px)`
                            }} />

                            {/* Elements */}
                            {layout.map(el => (
                                <div
                                    key={el.id}
                                    style={{
                                        position: 'absolute',
                                        left: ['items', 'notes', 'footer', 'tax_summary', 'header'].includes(el.type) ? '40px' : `${el.x}px`,
                                        top: `${el.y}px`,
                                        width: ({
                                            logo: '120px',
                                            header: '515px',
                                            title: '250px',
                                            dates: '150px',
                                            seller: '220px',
                                            buyer: '220px',
                                            items: '515px',
                                            totals: '210px',
                                            tax_summary: '515px',
                                            notes: '515px',
                                            signature: '180px',
                                            qr: '130px',
                                            footer: '515px',
                                            to: '280px',
                                            description: '515px',
                                        } as Record<string, string>)[el.type] || 'auto',
                                        maxWidth: ['items', 'notes', 'footer', 'tax_summary', 'header'].includes(el.type) ? '515px' : `${555 - el.x}px`,
                                        height: 'auto',
                                        minWidth: '40px',
                                        minHeight: '40px',
                                        display: el.visible ? 'flex' : 'none',
                                        border: selectedId === el.id ? `2px solid ${DESIGN_THEME.primary}` : '1px dashed #e2e8f0',
                                        backgroundColor: selectedId === el.id
                                            ? 'white'
                                            : ((DESIGN_THEME.elementTints as any)[el.type] || DESIGN_THEME.elementTints.default),
                                        boxShadow: selectedId === el.id ? '0 20px 50px -15px rgba(79,70,229,0.3)' : 'none',
                                        zIndex: selectedId === el.id ? 100 : (el.zIndex || 10),
                                        transition: 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
                                        opacity: selectedId && selectedId !== el.id ? 0.35 : 1
                                    }}
                                    className={`group cursor-pointer select-none ring-offset-0 ${selectedId === el.id ? 'ring-4 ring-indigo-500/5' : 'hover:border-indigo-400 hover:bg-white'} ${draggingId === el.id ? 'shadow-2xl z-[150] opacity-100 scale-[1.02] cursor-grabbing transition-none' : ''}`}
                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedId(el.id); }}
                                    onPointerDown={(e) => handlePointerDown(e, el)}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onPointerCancel={handlePointerUp}
                                >
                                    {/* Selection Badge Overlay */}
                                    {selectedId === el.id && (
                                        <div className="absolute -top-9 left-0 bg-indigo-600 text-white text-[10px] font-black px-3.5 py-1.5 rounded-xl shadow-2xl flex items-center gap-2.5 whitespace-nowrap z-[110] animate-in slide-in-from-bottom-2 duration-300">
                                            <div className="h-2 w-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]" />
                                            {t(`designLayout.elements.${el.type}`)}
                                            <span className="opacity-70 font-mono ml-1 text-[9px]">{el.x},{el.y}</span>
                                        </div>
                                    )}

                                    <div className={`flex flex-col items-center justify-center w-full h-full p-2 overflow-hidden relative
                                        ${selectedId === el.id ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}>

                                        {/* Background Subtle Label (only when not selected) */}
                                        {!selectedId && (
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] absolute top-2 left-2.5 text-slate-400/60 pointer-events-none group-hover:text-indigo-400 transition-colors">
                                                {t(`designLayout.elements.${el.type}`)}
                                            </span>
                                        )}

                                        {/* Element Content Preview */}
                                        {el.type === 'logo' && (template.logoUrl || profile?.logoUrl) && (
                                            <img src={(template.logoUrl || profile?.logoUrl) as string} className="h-20 object-contain mt-1 z-[2]" alt="Logo" />
                                        )}

                                        {(['seller', 'buyer', 'header', 'title', 'items', 'totals', 'notes', 'dates', 'footer', 'to', 'description'].includes(el.type)) && (
                                            <div className="w-full h-full overflow-hidden flex z-[2] opacity-90 transition-opacity duration-300" style={{ fontSize: `${el.fontSize || 10}px` }}>
                                                {(() => {
                                                    const sellerName = template.seller?.name || profile?.name || 'Organization Details';
                                                    const sellerStreet = template.seller?.address?.street || profile?.address?.street || '123 Business Avenue';
                                                    const sellerCity = template.seller?.address?.city || profile?.address?.city || 'Enterprise City';

                                                    const buyerName = 'Acme Corporation';
                                                    const buyerStreet = '456 Client Road';
                                                    const buyerCity = 'Client City, 90210';

                                                    const headerText = template.headerText || profile?.headerText || 'Organization Header';
                                                    const footerText = template.footerText || profile?.footerText || '';
                                                    const paymentTerms = template.defaultPaymentTerms?.note || (profile?.paymentTermsDays ? `Payment due within ${profile.paymentTermsDays} days` : 'Payment due within 30 days');
                                                    const currency = template.defaultCurrency || profile?.defaultCurrency || 'EUR';

                                                    if (el.type === 'seller') return (
                                                        <div className="w-full h-full text-left flex flex-col justify-start items-start p-[0.8em] bg-white/40 rounded shadow-sm">
                                                            <div className="text-[1.2em] font-bold text-slate-800">{el.content || sellerName}</div>
                                                            <div className="text-[1em] text-slate-600 mt-[0.2em]">{sellerStreet}</div>
                                                            <div className="text-[1em] text-slate-600">{sellerCity}</div>
                                                        </div>
                                                    );

                                                    if (el.type === 'buyer') return (
                                                        <div className="w-full h-full text-left flex flex-col justify-start items-start p-[0.8em] bg-white/40 rounded shadow-sm">
                                                            <div className="text-[0.9em] font-bold text-indigo-600 mb-[0.2em] uppercase tracking-widest">{el.content ? 'Bill To' : 'Bill To'}</div>
                                                            <div className="text-[1.2em] font-bold text-slate-800">{el.content || buyerName}</div>
                                                            <div className="text-[1em] text-slate-600 mt-[0.2em]">{buyerStreet}</div>
                                                            <div className="text-[1em] text-slate-600">{buyerCity}</div>
                                                        </div>
                                                    );

                                                    if (el.type === 'title') return (
                                                        <div className="w-full h-full text-right flex flex-col justify-start items-end p-[0.8em] border-r-[3px] border-indigo-600 pr-[1em]">
                                                            <div className="text-[2.4em] font-black text-slate-800 uppercase tracking-widest">{el.content || 'INVOICE'}</div>
                                                            <div className="text-[1.1em] text-slate-500 font-mono font-semibold mt-[0.2em]">INV-2026-00001</div>
                                                        </div>
                                                    );

                                                    if (el.type === 'dates') return (
                                                        <div className="w-full h-full text-right flex flex-col justify-start items-end gap-[0.4em] p-[0.8em] pt-[1em]">
                                                            <div className="flex justify-between w-full max-w-[15em] border-b border-white/50 pb-[0.2em]">
                                                                <span className="text-[0.9em] font-bold text-slate-500 uppercase tracking-wider">Issue Date</span>
                                                                <span className="text-[1em] text-slate-800 font-mono font-semibold">14 Apr 2026</span>
                                                            </div>
                                                            <div className="flex justify-between w-full max-w-[15em]">
                                                                <span className="text-[0.9em] font-bold text-indigo-500 uppercase tracking-wider">Due Date</span>
                                                                <span className="text-[1em] text-indigo-900 font-mono font-bold">14 May 2026</span>
                                                            </div>
                                                        </div>
                                                    );

                                                    if (el.type === 'header') return (
                                                        <div className="w-full h-full text-center flex flex-col justify-start items-center p-[0.8em] opacity-60">
                                                            <div className="text-[1em] text-slate-600 italic font-medium" dangerouslySetInnerHTML={{ __html: el.content || headerText }}></div>
                                                        </div>
                                                    );

                                                    if (el.type === 'footer') return (
                                                        <div className="w-full h-full text-center flex flex-col justify-start items-center p-[0.8em] border-t border-slate-300/50 mt-[0.2em]">
                                                            <div className="text-[0.9em] text-slate-500 font-medium tracking-wide mt-[0.4em]" dangerouslySetInnerHTML={{ __html: el.content || footerText || 'Company Registration: 12345 • VAT: DE123456789' }}></div>
                                                        </div>
                                                    );

                                                    if (el.type === 'items') return (
                                                        <div className="w-full h-full flex flex-col justify-start p-[0.4em] bg-white/50 rounded shadow-sm border border-slate-200/50">
                                                            <div className="w-full border-b border-slate-300 pb-[0.4em] mb-[0.4em] flex text-[0.9em] font-bold text-slate-500 uppercase tracking-widest px-[0.4em] pt-[0.4em]">
                                                                <div className="flex-1 text-left">Description</div>
                                                                <div className="w-[10%] text-right">Qty</div>
                                                                <div className="w-[16%] text-right">Price</div>
                                                                <div className="w-[12%] text-right">Tax</div>
                                                                <div className="w-[18%] text-right">Total</div>
                                                            </div>
                                                            <div className="w-full flex text-[1em] text-slate-700 py-[0.4em] border-b border-slate-200/60 px-[0.4em] transition-colors hover:bg-white/80">
                                                                <div className="flex-1 text-left font-medium truncate pr-[0.4em]">Premium Subscription - Annual</div>
                                                                <div className="w-[10%] text-right font-mono">1</div>
                                                                <div className="w-[16%] text-right font-mono">1,200.00</div>
                                                                <div className="w-[12%] text-right font-mono">{template.defaultTaxPercent || 19}%</div>
                                                                <div className="w-[18%] text-right font-mono font-medium">1,200.00</div>
                                                            </div>
                                                            <div className="w-full flex text-[1em] text-slate-600 py-[0.4em] px-[0.4em] transition-colors hover:bg-white/80">
                                                                <div className="flex-1 text-left truncate pr-[0.4em]">Setup & Onboarding Fee</div>
                                                                <div className="w-[10%] text-right font-mono">1</div>
                                                                <div className="w-[16%] text-right font-mono">500.00</div>
                                                                <div className="w-[12%] text-right font-mono">{template.defaultTaxPercent || 19}%</div>
                                                                <div className="w-[18%] text-right font-mono font-medium">500.00</div>
                                                            </div>
                                                        </div>
                                                    );

                                                    if (el.type === 'totals') return (
                                                        <div className="w-full h-full flex flex-col justify-start items-end gap-[0.4em] p-[0.8em] bg-indigo-50/80 rounded shadow-sm">
                                                            <div className="flex justify-between w-full max-w-[20em]">
                                                                <span className="text-[1em] text-slate-500 font-medium">Subtotal</span>
                                                                <span className="text-[1.1em] text-slate-700 font-mono">1,700.00 {currency}</span>
                                                            </div>
                                                            <div className="flex justify-between w-full max-w-[20em]">
                                                                <span className="text-[1em] text-slate-500 font-medium">Tax ({template.defaultTaxPercent || 19}%)</span>
                                                                <span className="text-[1.1em] text-slate-700 font-mono">{((1700 * (template.defaultTaxPercent || 19)) / 100).toFixed(2)} {currency}</span>
                                                            </div>
                                                            <div className="flex justify-between w-full max-w-[20em] border-t-2 border-indigo-200 pt-[0.4em] mt-[0.2em]">
                                                                <span className="text-[1.1em] font-black text-indigo-900 uppercase">Total</span>
                                                                <span className="text-[1.2em] font-black text-indigo-700 font-mono">{(1700 + (1700 * (template.defaultTaxPercent || 19)) / 100).toFixed(2)} {currency}</span>
                                                            </div>
                                                        </div>
                                                    );

                                                    if (el.type === 'notes') return (
                                                        <div className="w-full h-full flex flex-col justify-start items-start p-[0.8em] bg-amber-50/80 rounded border-l-[0.2em] border-amber-400">
                                                            <div className="text-[0.9em] font-bold text-amber-700 mb-[0.2em] uppercase tracking-widest">Payment Terms & Notes</div>
                                                            <div className="text-[1em] text-slate-700 font-medium leading-relaxed">{el.content || paymentTerms}</div>
                                                        </div>
                                                    );

                                                    if (el.type === 'signature') return (
                                                        <div className="w-full h-full flex flex-col justify-end items-center p-[0.8em] border-t-2 border-slate-200 mt-[1em]">
                                                            <div className="text-[0.8em] font-bold text-slate-400 uppercase tracking-widest">{el.content || 'Authorized Signature'}</div>
                                                            <div className="h-[2em]"></div>
                                                        </div>
                                                    );

                                                    if (el.type === 'qr') {
                                                        const qrInvoice = {
                                                            ...template,
                                                            currency: template.defaultCurrency || 'EUR',
                                                            payableAmount: 1700,
                                                            invoiceNumber: 'INV-2026-00001',
                                                            paymentMeans: profile?.bankAccount ? {
                                                                type: 'BankTransfer' as const,
                                                                iban: profile.bankAccount.iban,
                                                                bic: profile.bankAccount.bic,
                                                                accountName: profile.bankAccount.accountName,
                                                            } : undefined
                                                        } as any;
                                                        return (
                                                            <div className="w-full h-full flex flex-col items-center justify-center p-[0.5em] bg-white rounded-xl shadow-sm border border-slate-100">
                                                                <InvoiceQRCode invoice={qrInvoice} size={84} showLabel={false} />
                                                                <div className="text-[0.7em] font-bold text-indigo-600 mt-[0.4em]">GiroCode</div>
                                                            </div>
                                                        );
                                                    }

                                                    if (el.type === 'sender') return (
                                                        <div className="w-full h-full text-left flex flex-col justify-start items-start p-[0.8em] bg-white/40 rounded shadow-sm">
                                                            <div className="text-[0.9em] font-bold text-indigo-600 mb-[0.2em] uppercase tracking-widest">From</div>
                                                            <div className="text-[1.1em] font-bold text-slate-800">Your Company</div>
                                                            <div className="text-[0.9em] text-slate-500 mt-[0.2em]">123 Business Ave</div>
                                                            <div className="text-[0.9em] text-slate-500">City, 12345</div>
                                                        </div>
                                                    );

                                                    if (el.type === 'to') return (
                                                        <div className="w-full h-full text-left flex flex-col justify-start items-start p-[0.8em] bg-white/40 rounded shadow-sm">
                                                            <div className="text-[0.9em] font-bold text-indigo-600 mb-[0.2em] uppercase tracking-widest">{el.content ? 'To' : 'Recipient'}</div>
                                                            <div className="text-[1.2em] font-bold text-slate-800">{el.content || 'John Doe'}</div>
                                                            <div className="text-[1em] text-slate-600 mt-[0.2em]">789 Recipient Street</div>
                                                            <div className="text-[1em] text-slate-600">Recipient City, 54321</div>
                                                        </div>
                                                    );

                                                    if (el.type === 'description') return (
                                                        <div className="w-full h-full text-left flex flex-col justify-start items-start p-[1.2em] bg-white/20 rounded-xl border border-indigo-100/30">
                                                            <div className="text-[1.1em] text-slate-700 leading-relaxed italic whitespace-pre-wrap">
                                                                {el.content || "Dear Customer,\n\nThis is a sample business letter body. You can edit this content in the inspector on the right.\n\nBest regards,\nYour Organization"}
                                                            </div>
                                                        </div>
                                                    );

                                                    return null;
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Property Inspector */}
                <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-[-20px_0_50px_-20px_rgba(0,0,0,0.05)] z-0">
                    <div className="p-7 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                            <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                                <SettingsIcon className="h-3.5 w-3.5 text-indigo-600" />
                            </div>
                            {t('designLayout.inspector')}
                        </h3>
                        {selectedId && (
                            <Badge className="h-5 px-2 text-[9px] bg-slate-900 shadow-lg text-white border-none uppercase tracking-widest font-black">
                                {selectedElement?.type}
                            </Badge>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-7 space-y-12 custom-scrollbar bg-white">
                        {selectedElement ? (
                            <div className="space-y-12 animate-in fade-in slide-in-from-right-8 duration-600 ease-out">
                                <div className="space-y-7">
                                    <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
                                        <div className="h-5 w-1.5 bg-indigo-600 rounded-full shadow-[0_0_12px_rgba(79,70,229,0.4)]" />
                                        <Label className="text-[11px] text-slate-900 uppercase font-black tracking-widest">
                                            {t('designLayout.positionAndSize')}
                                        </Label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-8 pt-2">
                                        {[
                                            { label: t('designLayout.xPosition'), key: 'x', val: selectedElement.x, icon: 'X', max: CANVAS_W - (selectedElement.w ?? 100) },
                                            { label: t('designLayout.yPosition'), key: 'y', val: selectedElement.y, icon: 'Y', max: CANVAS_H - (selectedElement.h ?? 40) }
                                        ].map(field => (
                                            <div key={field.label} className="space-y-3.5 group/field">
                                                <div className="flex items-center justify-between px-1">
                                                    <Label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] transition-colors group-hover/field:text-indigo-600">{field.label}</Label>
                                                    <span className="text-[11px] text-slate-200 font-black pointer-events-none">{field.icon}</span>
                                                </div>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        value={Math.round(field.val)}
                                                        onChange={(e) => {
                                                            const val = Math.max(0, Math.min(parseInt(e.target.value) || 0, field.max));
                                                            handleLayoutChange(selectedElement.id, { [field.key]: val });
                                                        }}
                                                        className="h-12 bg-white border-slate-200 text-slate-900 text-body font-bold transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 rounded-2xl pl-5 shadow-sm"
                                                    />
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 pointer-events-none group-hover/field:text-indigo-300">PX</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-6 border-t border-slate-100 space-y-4">
                                        <div className="flex items-center gap-3.5 pb-2">
                                            <div className="h-4 w-1.5 bg-indigo-600 rounded-full shadow-[0_0_12px_rgba(79,70,229,0.4)]" />
                                            <Label className="text-[11px] text-slate-900 uppercase font-black tracking-widest">
                                                {t('designLayout.typography') || 'Typography'}
                                            </Label>
                                        </div>
                                        <div className="space-y-3.5 group/field">
                                            <div className="flex items-center justify-between px-1">
                                                <Label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] transition-colors group-hover/field:text-indigo-600">{t('designLayout.fontSize') || 'Font Size'}</Label>
                                                <span className="text-[11px] text-slate-200 font-black pointer-events-none">AT</span>
                                            </div>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={selectedElement.fontSize || 10}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 10;
                                                        handleLayoutChange(selectedElement.id, { fontSize: val });
                                                    }}
                                                    className="h-12 bg-white border-slate-200 text-slate-900 text-body font-bold transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 rounded-2xl pl-5 shadow-sm"
                                                    min="6" max="72"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 pointer-events-none group-hover/field:text-indigo-300">PX</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Element Content Editor */}
                                    {!['items', 'qr', 'tax_summary', 'logo', 'dates', 'totals'].includes(selectedElement.type) && (
                                        <div className="pt-6 border-t border-slate-100 space-y-4">
                                            <div className="flex items-center gap-3.5 pb-2">
                                                <div className="h-4 w-1.5 bg-indigo-600 rounded-full shadow-[0_0_12px_rgba(79,70,229,0.4)]" />
                                                <Label className="text-[11px] text-slate-900 uppercase font-black tracking-widest">
                                                    {t('designLayout.content') || 'Element Content'}
                                                </Label>
                                            </div>
                                            <div className="space-y-3.5 group/field">
                                                <div className="flex items-center justify-between px-1">
                                                    <Label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] transition-colors group-hover/field:text-indigo-600">{t('designLayout.textContent') || 'Text / Value'}</Label>
                                                </div>
                                                <Textarea
                                                    value={selectedElement.content || ''}
                                                    onChange={(e) => handleLayoutChange(selectedElement.id, { content: e.target.value })}
                                                    placeholder={t('designLayout.contentPlaceholder') || "Enter custom text for this element..."}
                                                    className="min-h-[100px] bg-white border-slate-200 text-slate-900 text-body font-medium transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 rounded-2xl p-4 shadow-sm"
                                                />
                                                <p className="text-[10px] text-slate-400 font-semibold italic px-1">
                                                    Overwrites the default value for this element.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-6 border-t border-slate-100 space-y-6">
                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100/50 group transition-all hover:bg-indigo-50/50">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2.5 rounded-xl transition-all duration-500 ${snapToGrid ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                                    <Grid3X3 className="h-4.5 w-4.5" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] text-slate-900 font-black tracking-widest uppercase block cursor-pointer" onClick={() => setSnapToGrid(!snapToGrid)}>
                                                        {t('designLayout.gridSnapping')}
                                                    </Label>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[8px] font-black uppercase tracking-widest ${snapToGrid ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                            {snapToGrid ? 'Active' : 'Disabled'}
                                                        </span>
                                                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                                                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">10PX GRID</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={snapToGrid}
                                                onCheckedChange={setSnapToGrid}
                                                className="data-[state=checked]:bg-indigo-600 shadow-sm"
                                            />
                                        </div>

                                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                                                        <ZoomIn className="h-4 w-4 text-slate-500" />
                                                    </div>
                                                    <Label className="text-[11px] text-slate-900 font-black tracking-widest uppercase italic">{t('designLayout.zoom')}</Label>
                                                </div>
                                                <div className="text-[11px] text-slate-900 font-black font-mono tracking-tighter bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-inner">
                                                    {Math.round(zoom * 100)}<span className="opacity-40 text-[9px] ml-0.5">%</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                                                    className="flex-1 h-10 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm"
                                                >
                                                    <Minus className="h-3.5 w-3.5 mr-2" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Out</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setZoom(1.2)}
                                                    className="h-10 px-3 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-600 rounded-xl transition-all shadow-sm"
                                                    title="Reset Zoom"
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                                                    className="flex-1 h-10 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm"
                                                >
                                                    <Plus className="h-3.5 w-3.5 mr-2" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">In</span>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-700">Pro Tip</h4>
                                        <p className="text-[11px] text-slate-500 leading-relaxed font-semibold italic">
                                            Manual precision is enabled. Each unit corresponds to roughly 0.26mm in the final A4 output.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-12 opacity-40 animate-pulse">
                                <div className="p-8 rounded-[2.5rem] bg-slate-50 mb-8 border border-slate-100 shadow-inner">
                                    <SettingsIcon className="h-16 w-16 text-slate-300 stroke-[1.5]" />
                                </div>
                                <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.5em] leading-relaxed">
                                    Ready for Selection<br />
                                    <span className="text-[8px] font-bold tracking-[0.2em] opacity-60">CHOOSE AN ELEMENT TO BEGIN EDITING</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

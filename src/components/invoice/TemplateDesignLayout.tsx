import { useState } from 'react';
import { InvoiceTemplate, TemplateLayoutElement } from '../../types/invoice';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Layout as LayoutIcon, Settings as SettingsIcon, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { DEFAULT_LAYOUT } from '../../utils/invoice-templates-defaults';

// DEFAULT_LAYOUT moved to src/utils/invoice-templates-defaults.ts

interface TemplateDesignLayoutProps {
    template: InvoiceTemplate;
    onLayoutChange: (layout: TemplateLayoutElement[]) => void;
    onSave?: () => void;
    onCancel?: () => void;
}

export function TemplateDesignLayout({ template, onLayoutChange, onSave, onCancel }: TemplateDesignLayoutProps) {
    const { t } = useLanguage();
    const [layout, setLayout] = useState<TemplateLayoutElement[]>(
        template.layout && template.layout.length > 0 ? template.layout : DEFAULT_LAYOUT
    );
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [zoom, setZoom] = useState(1.2);
    const GRID_SIZE = 10;

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
        const newLayout = layout.map(el =>
            el.id === id ? { ...el, ...updates } : el
        );
        setLayout(newLayout);
        onLayoutChange(newLayout);
    };

    const toggleVisibility = (id: string) => {
        const newLayout = layout.map(el =>
            el.id === id ? { ...el, visible: !el.visible } : el
        );
        setLayout(newLayout);
        onLayoutChange(newLayout);
    };

    const resetLayout = () => {
        setLayout(DEFAULT_LAYOUT);
        onLayoutChange(DEFAULT_LAYOUT);
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
                            <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 leading-none">
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
                    <div className="p-7 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                            <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                                <LayoutIcon className="h-3.5 w-3.5 text-indigo-600" />
                            </div>
                            {t('designLayout.elementLibrary')}
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-white">
                        {layout.map(el => (
                            <div
                                key={el.id}
                                className={`group flex flex-col gap-3 p-5 rounded-2xl transition-all duration-300 border relative overflow-hidden ${selectedId === el.id
                                    ? 'bg-indigo-50/50 border-indigo-200 shadow-[0_4px_25px_rgba(79,70,229,0.1)] ring-1 ring-indigo-500/10'
                                    : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200 hover:shadow-md'
                                    }`}
                                onClick={() => setSelectedId(el.id)}
                            >
                                {/* Active Indicator Bar */}
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
                                        {el.w}<span className="text-[8px] opacity-40 px-0.5 font-sans">PX</span> × {el.h}<span className="text-[8px] opacity-40 px-0.5 font-sans">PX</span>
                                    </span>
                                    {selectedId === el.id && (
                                        <Badge className="h-5 px-2 text-[9px] bg-indigo-600 text-white font-black tracking-[0.2em] shadow-lg shadow-indigo-600/20 border-none animate-in zoom-in-75">SELECTED</Badge>
                                    )}
                                </div>
                            </div>
                        ))}
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
                                        left: `${el.x}px`,
                                        top: `${el.y}px`,
                                        width: `${el.w}px`,
                                        height: `${el.h}px`,
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
                                    className={`group cursor-pointer select-none ring-offset-0 ${selectedId === el.id ? 'ring-4 ring-indigo-500/5' : 'hover:border-indigo-400 hover:bg-white'}`}
                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedId(el.id); }}
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
                                        {el.type === 'logo' && template.logoUrl && (
                                            <img src={template.logoUrl} className="max-h-[85%] max-w-[85%] object-contain mt-1" alt="" />
                                        )}

                                        {(['seller', 'buyer', 'header', 'title', 'items', 'totals', 'notes'].includes(el.type)) && (
                                            <div className="flex flex-col items-center justify-center p-3 text-center w-full">
                                                <div className={`h-1.5 w-10 rounded-full mb-2.5 ${selectedId === el.id ? 'bg-indigo-100' : 'bg-slate-100 group-hover:bg-indigo-50'}`} />
                                                <span className={`text-[10px] font-black tracking-tight leading-tight uppercase transition-colors ${selectedId === el.id ? 'text-indigo-700' : 'text-slate-400 group-hover:text-indigo-500'}`}>
                                                    {el.type === 'seller' ? (template.seller.name || 'Organization Details') :
                                                        el.type === 'buyer' ? 'Client Info Block' :
                                                            el.type === 'title' ? 'Invoice Title' :
                                                                el.type === 'items' ? 'Dynamic Items Grid' :
                                                                    el.type === 'totals' ? 'Financial Totals' :
                                                                        el.type === 'notes' ? 'Payment Terms' :
                                                                            (template.headerText || 'Organization Header')}
                                                </span>
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
                                            { label: t('designLayout.width'), key: 'w', val: selectedElement.w, icon: '↔' },
                                            { label: t('designLayout.height'), key: 'h', val: selectedElement.h, icon: '↕' },
                                            { label: t('designLayout.xPosition'), key: 'x', val: selectedElement.x, icon: 'X' },
                                            { label: t('designLayout.yPosition'), key: 'y', val: selectedElement.y, icon: 'Y' }
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
                                                            const val = parseInt(e.target.value) || 0;
                                                            handleLayoutChange(selectedElement.id, { [field.key]: val });
                                                        }}
                                                        className="h-12 bg-white border-slate-200 text-slate-900 text-sm font-bold transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 rounded-2xl pl-5 shadow-sm"
                                                    />
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 pointer-events-none group-hover/field:text-indigo-300">PX</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-700">Pro Tip</h4>
                                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold italic">
                                        Manual precision is enabled. Each unit corresponds to roughly 0.26mm in the final A4 output.
                                    </p>
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

                    {/* Bottom Controls Area */}
                    <div className="p-7 border-t border-slate-100 bg-white space-y-6">
                        <div className="flex items-center justify-between group cursor-pointer" onClick={() => setSnapToGrid(!snapToGrid)}>
                            <div className="space-y-1.5">
                                <Label className="text-[11px] text-slate-900 font-black tracking-widest uppercase transition-colors group-hover:text-indigo-600 cursor-pointer">
                                    {t('designLayout.gridSnapping')}
                                </Label>
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest opacity-80">PRO 10px CANVAS GRID</div>
                            </div>
                            <div className={`w-12 h-6.5 rounded-full transition-all duration-500 relative border-2 ${snapToGrid ? 'bg-indigo-600 border-indigo-600 shadow-[0_4px_15px_rgba(79,70,229,0.4)]' : 'bg-slate-100 border-slate-200 shadow-inner'}`}>
                                <div className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-500 shadow-md ${snapToGrid ? 'left-6.5 bg-white' : 'left-1 bg-slate-400'}`} />
                            </div>
                        </div>

                        <div className="h-[1px] w-full bg-slate-100" />

                        <div className="flex items-center justify-between">
                            <Label className="text-[11px] text-slate-900 font-black tracking-widest uppercase italic">{t('designLayout.zoom')}</Label>
                            <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-1.5 border border-slate-100 shadow-inner">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                                    className="h-9 w-9 p-0 text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-md rounded-xl transition-all"
                                >
                                    -
                                </Button>
                                <div className="text-[11px] text-slate-900 font-black min-w-[55px] text-center font-mono tracking-tighter">
                                    {Math.round(zoom * 100)}<span className="opacity-40 text-[9px] ml-0.5">%</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                                    className="h-9 w-9 p-0 text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-md rounded-xl transition-all"
                                >
                                    +
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

import { useState } from 'react';
import { InvoiceTemplate, TemplateLayoutElement } from '../../types/invoice';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Layout as LayoutIcon, Settings as SettingsIcon, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const DEFAULT_LAYOUT: TemplateLayoutElement[] = [
    { id: 'logo', type: 'logo', x: 40, y: 40, w: 120, h: 50, visible: true, zIndex: 10 },
    { id: 'header', type: 'header', x: 180, y: 40, w: 375, h: 50, visible: true, zIndex: 10 },
    { id: 'title', type: 'title', x: 40, y: 120, w: 220, h: 40, visible: true, zIndex: 10 },
    { id: 'dates', type: 'dates', x: 340, y: 120, w: 215, h: 60, visible: true, zIndex: 10 },
    { id: 'seller', type: 'seller', x: 40, y: 200, w: 240, h: 100, visible: true, zIndex: 10 },
    { id: 'buyer', type: 'buyer', x: 315, y: 200, w: 240, h: 100, visible: true, zIndex: 10 },
    { id: 'items', type: 'items', x: 40, y: 320, w: 515, h: 240, visible: true, zIndex: 10 },
    { id: 'tax_summary', type: 'tax_summary', x: 40, y: 575, w: 260, h: 90, visible: true, zIndex: 10 },
    { id: 'totals', type: 'totals', x: 325, y: 575, w: 230, h: 110, visible: true, zIndex: 10 },
    { id: 'notes', type: 'notes', x: 40, y: 700, w: 310, h: 70, visible: true, zIndex: 10 },
    { id: 'signature', type: 'signature', x: 380, y: 700, w: 175, h: 60, visible: true, zIndex: 10 },
    { id: 'qr', type: 'qr', x: 510, y: 775, w: 45, h: 45, visible: true, zIndex: 10 },
    { id: 'footer', type: 'footer', x: 40, y: 790, w: 460, h: 30, visible: true, zIndex: 10 },
];

interface TemplateDesignLayoutProps {
    template: InvoiceTemplate;
    onLayoutChange: (layout: TemplateLayoutElement[]) => void;
}

export function TemplateDesignLayout({ template, onLayoutChange }: TemplateDesignLayoutProps) {
    const { t } = useLanguage();
    const [layout, setLayout] = useState<TemplateLayoutElement[]>(
        template.layout && template.layout.length > 0 ? template.layout : DEFAULT_LAYOUT
    );
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [zoom, setZoom] = useState(1.2);
    const GRID_SIZE = 10;

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
        <div className="relative w-full h-screen bg-background flex flex-col">
            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar: Element Library */}
                <div className="w-48 bg-gradient-to-b flex flex-col">
                    <div className="p-6 bg-gradient-to-r from-slate-800 to-slate-900">
                        <h3 className="text-xs font-bold tracking-wider flex items-center gap-2">
                            <LayoutIcon className="h-4 w-4" />
                            {t('designLayout.elementLibrary')}
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2">
                        {layout.map(el => (
                            <div
                                key={el.id}
                                className={`group flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer ${selectedId === el.id
                                    ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white'
                                    : 'bg-slate-800/50 border border-transparent hover:border-slate-600 hover:bg-slate-800'
                                    }`}
                                onClick={() => setSelectedId(el.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`h-2 w-2 rounded-full ${el.visible ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                    <span className={`text-xs font-semibold uppercase tracking-wide ${selectedId === el.id ? 'text-purple-900' : 'text-slate-400'
                                        }`}>
                                        {t(`designLayout.elements.${el.type}`)}
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleVisibility(el.id); }}
                                >
                                    {el.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-slate-700/50">
                        <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={resetLayout}
                        >
                            <RotateCcw className="h-4 w-4" />
                            {t('designLayout.resetLayout')}
                        </Button>
                    </div>
                </div>

                {/* Center: Canvas */}
                <div className="flex-1 overflow-auto">
                    <div className="w-full h-full py-12 flex items-center justify-center">
                        <div
                            style={{
                                transform: `scale(${zoom})`,
                                transformOrigin: 'center center',
                                width: '595px',
                                height: '842px'
                            }}
                            className="bg-background relative shadow-2xl ring-4 ring-purple-500/30 rounded-sm transition-transform duration-300"
                            onClick={() => setSelectedId(null)}
                        >
                            {/* Grid background */}
                            <div className="absolute inset-0 opacity-5" style={{
                                backgroundImage: `repeating-linear-gradient(0deg, #eee  0px, #eee 1px, transparent 1px, transparent ${GRID_SIZE}px),
                                  repeating-linear-gradient(90deg, #eee 0px, #eee 1px, transparent 1px, transparent ${GRID_SIZE}px)`
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
                                        border: selectedId === el.id ? '2px solid #a855f7' : '1.5px solid #cbd5e1',
                                        backgroundColor: selectedId === el.id ? 'rgba(168, 85, 247, 0.05)' : 'transparent',
                                        zIndex: el.zIndex || 10,
                                    }}
                                    className="cursor-pointer"
                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedId(el.id); }}
                                >
                                    <div className="flex flex-col items-center justify-center w-full h-full p-2 overflow-hidden select-none">
                                        <span className={`text-[8px] font-bold uppercase tracking-wider ${selectedId === el.id ? 'text-purple-700' : 'text-slate-600'
                                            }`}>
                                            {t(`designLayout.elements.${el.type}`)}
                                        </span>

                                        {/* Element preview content */}
                                        {el.type === 'logo' && template.logoUrl && (
                                            <img src={template.logoUrl} className="max-h-[80%] max-w-[80%] object-contain mt-1" alt="" />
                                        )}
                                        {(el.type === 'seller' || el.type === 'buyer' || el.type === 'header' || el.type === 'title') && (
                                            <div className="text-center text-[9px] text-slate-700 font-medium mt-1">
                                                {el.type === 'seller' ? template.seller.name || 'Company Name' :
                                                    el.type === 'buyer' ? 'Client Information' :
                                                        el.type === 'title' ? 'TAX INVOICE' :
                                                            template.headerText || 'Header Text'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Property Inspector */}
                <div className="w-64 bg-gradient-to-b from-slate-900 to-slate-950 border-l border-slate-700/50 flex flex-col shadow-2xl">
                    <div className="p-6 bg-gradient-to-r from-slate-800 to-slate-900">
                        <h3 className="text-xs font-bold tracking-wider flex items-center gap-2">
                            <SettingsIcon className="h-4 w-4 text-purple-400" />
                            {t('designLayout.inspector')}
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {selectedElement ? (
                            <div className="space-y-6">
                                <div>
                                    <Label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-3 block">
                                        {t(`designLayout.elements.${selectedElement.type}`)}
                                    </Label>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">{t('designLayout.positionAndSize')}</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: t('designLayout.width'), key: 'w', val: selectedElement.w },
                                            { label: t('designLayout.height'), key: 'h', val: selectedElement.h },
                                            { label: t('designLayout.xPosition'), key: 'x', val: selectedElement.x },
                                            { label: t('designLayout.yPosition'), key: 'y', val: selectedElement.y }
                                        ].map(field => (
                                            <div key={field.label} className="space-y-2">
                                                <Label className="text-[10px] text-slate-400 font-semibold">{field.label}</Label>
                                                <Input
                                                    type="number"
                                                    value={Math.round(field.val)}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        handleLayoutChange(selectedElement.id, { [field.key]: val });
                                                    }}
                                                    className="h-9 bg-slate-800 border-slate-600 text-slate-100 text-sm font-medium"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <SettingsIcon className="h-12 w-12 text-slate-700 mb-3" />
                                <p className="text-sm text-slate-500 font-medium">{t('designLayout.selectElement')}</p>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-slate-700/50 space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-slate-400 font-semibold">{t('designLayout.gridSnapping')}</Label>
                            <Button
                                variant={snapToGrid ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSnapToGrid(!snapToGrid)}
                                className="h-8"
                            >
                                {snapToGrid ? t('designLayout.on') : t('designLayout.off')}
                            </Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-slate-400 font-semibold">{t('designLayout.zoom')}</Label>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="h-8 w-8 p-0">-</Button>
                                <span className="text-xs text-white font-mono bg-slate-800 px-3 py-1.5 rounded">{Math.round(zoom * 100)}%</span>
                                <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="h-8 w-8 p-0">+</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDockSlot } from '../hooks/useDockSlot';
import {
    MessageSquarePlus, X, Loader2, Pencil, Eraser, Trash2, Hand,
    Square, Circle, ArrowUpRight, Undo2, Redo2, BugIcon, HelpCircle,
    MessagesSquare, Paperclip, FileText, Maximize2, Minimize2, GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { createTicket } from '../services/ticketService';

interface TicketingWidgetProps {
    apiKey: string;
    apiBaseUrl?: string;
    userId?: string | null;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    screenshotEnabled?: boolean;
    zIndex?: number;
    launcherIcon?: 'message' | 'bug' | 'help' | 'chat';
    launcherLabel?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
    low: '#6b7280',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
};

const ANNOTATION_COLORS = ['#ef4444', '#f97316', '#3b82f6', '#22c55e', '#ffffff'];

const LAUNCHER_ICONS = {
    message: MessageSquarePlus,
    bug: BugIcon,
    help: HelpCircle,
    chat: MessagesSquare,
};

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function TicketingWidget({
    apiKey,
    apiBaseUrl,
    userId: propUserId,
    position = 'bottom-right',
    screenshotEnabled = true,
    zIndex = 9999,
    launcherIcon = 'message',
    launcherLabel = 'Support',
}: TicketingWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [capturing, setCapturing] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [includeScreenshot, setIncludeScreenshot] = useState(true);
    const [screenshotError, setScreenshotError] = useState<string | null>(null);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [formData, setFormData] = useState({
        subject: '',
        description: '',
        priority: 'low',
        type: 'bug',
    });
    const [annotationColor, setAnnotationColor] = useState('#ef4444');
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentTool, setCurrentTool] = useState<'pencil' | 'eraser' | 'move' | 'rectangle' | 'circle' | 'arrow'>('pencil');
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [hasBeenOpened, setHasBeenOpened] = useState(() => localStorage.getItem('twgt_opened') === '1');
    const [compact, setCompact] = useState(() => localStorage.getItem('twgt_submitted') === '1');
    const [showDiscardWarning, setShowDiscardWarning] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [toolbarPos, setToolbarPos] = useState({ left: 8, top: 8 });

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const startPos = useRef<{ x: number; y: number } | null>(null);
    const snapshot = useRef<ImageData | null>(null);
    const undoStack = useRef<ImageData[]>([]);
    const redoStack = useRef<ImageData[]>([]);
    const toolbarDragRef = useRef<{ mx: number; my: number; lx: number; ly: number } | null>(null);

    useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

    // Init canvas when screenshot loaded
    useEffect(() => {
        if (isOpen && screenshot && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx?.drawImage(img, 0, 0);
            };
            img.src = screenshot;
        }
    }, [isOpen, screenshot]);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.altKey && e.shiftKey && e.key === 'S' && !isOpen) handleOpen();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') attemptClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, formData]);

    const isDirty = () => !!(formData.subject || formData.description || attachments.length);

    const attemptClose = () => {
        if (isDirty()) { setShowDiscardWarning(true); return; }
        doClose();
    };

    const doClose = () => {
        setIsOpen(false);
        setScreenshot(null);
        setScreenshotError(null);
        setIncludeScreenshot(true);
        setAttachments([]);
        setShowDiscardWarning(false);
        setFormData({ subject: '', description: '', priority: 'low', type: 'bug' });
        undoStack.current = [];
        redoStack.current = [];
        setCanUndo(false);
        setCanRedo(false);
        setToolbarPos({ left: 8, top: 8 });
    };

    const handleOpen = async () => {
        localStorage.setItem('twgt_opened', '1');
        setHasBeenOpened(true);

        if (!screenshotEnabled) {
            setIsOpen(true);
            return;
        }

        setCapturing(true);
        const colors = ['red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose','slate','gray','zinc','neutral','stone'];
        const shades = ['50','100','200','300','400','500','600','700','800','900','950'];
        const overrides: string[] = [];
        colors.forEach(c => shades.forEach(s => {
            const v = `--color-${c}-${s}`;
            document.documentElement.style.setProperty(v, '#808080');
            overrides.push(v);
        }));

        try {
            setScreenshotError(null);
            const dataUrl = await toPng(document.body, { cacheBust: true });
            setScreenshot(dataUrl);
            setIsOpen(true);
        } catch (error: unknown) {
            const msg = (error as Error)?.message || 'Unknown error';
            console.error('Screenshot failed:', error);
            setScreenshotError(msg);
            setIsOpen(true);
        } finally {
            overrides.forEach(v => document.documentElement.style.removeProperty(v));
            setCapturing(false);
        }
    };

    // Canvas helpers
    const saveState = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        undoStack.current.push(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
        if (undoStack.current.length > 20) undoStack.current.shift();
        redoStack.current = [];
        setCanUndo(true);
        setCanRedo(false);
    };

    const undo = () => {
        if (!canvasRef.current || !undoStack.current.length) return;
        const ctx = canvasRef.current.getContext('2d')!;
        redoStack.current.push(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
        ctx.putImageData(undoStack.current.pop()!, 0, 0);
        setCanUndo(undoStack.current.length > 0);
        setCanRedo(true);
    };

    const redo = () => {
        if (!canvasRef.current || !redoStack.current.length) return;
        const ctx = canvasRef.current.getContext('2d')!;
        undoStack.current.push(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
        ctx.putImageData(redoStack.current.pop()!, 0, 0);
        setCanUndo(true);
        setCanRedo(redoStack.current.length > 0);
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current || currentTool === 'move') return;
        saveState();
        setIsDrawing(true);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d')!;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;
        startPos.current = { x, y };
        if (['rectangle', 'circle', 'arrow'].includes(currentTool)) {
            snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineWidth = currentTool === 'eraser' ? 20 : 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : annotationColor;
        ctx.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !canvasRef.current || currentTool === 'move') return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d')!;
        if (!startPos.current) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let clientX: number, clientY: number;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            if (e.buttons !== 1) return;
            clientX = e.clientX;
            clientY = e.clientY;
        }
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;
        if (['rectangle', 'circle', 'arrow'].includes(currentTool) && snapshot.current) {
            ctx.putImageData(snapshot.current, 0, 0);
            if (currentTool === 'rectangle') {
                ctx.strokeRect(startPos.current.x, startPos.current.y, x - startPos.current.x, y - startPos.current.y);
            } else if (currentTool === 'circle') {
                const radius = Math.sqrt(Math.pow(x - startPos.current.x, 2) + Math.pow(y - startPos.current.y, 2));
                ctx.beginPath();
                ctx.arc(startPos.current.x, startPos.current.y, radius, 0, 2 * Math.PI);
                ctx.stroke();
            } else if (currentTool === 'arrow') {
                const angle = Math.atan2(y - startPos.current.y, x - startPos.current.x);
                const headLen = 15;
                ctx.beginPath();
                ctx.moveTo(startPos.current.x, startPos.current.y);
                ctx.lineTo(x, y);
                ctx.lineTo(x - headLen * Math.cos(angle - Math.PI / 6), y - headLen * Math.sin(angle - Math.PI / 6));
                ctx.moveTo(x, y);
                ctx.lineTo(x - headLen * Math.cos(angle + Math.PI / 6), y - headLen * Math.sin(angle + Math.PI / 6));
                ctx.stroke();
            }
        } else {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        snapshot.current = null;
        startPos.current = null;
    };

    const clearCanvas = () => {
        if (!screenshot || !canvasRef.current) return;
        saveState();
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d')!;
        const img = new Image();
        img.onload = () => { canvas.width = img.width; canvas.height = img.height; ctx.drawImage(img, 0, 0); };
        img.src = screenshot;
    };

    // File attachments
    const onFilesSelected = (files: FileList | null) => {
        if (!files) return;
        const candidates = Array.from(files).filter(
            f => f.type.startsWith('image/') || f.type === 'application/pdf'
        );
        const overLimit = candidates.filter(f => f.size > MAX_FILE_SIZE);
        if (overLimit.length) toast.error(`${overLimit.length} file(s) exceed 10 MB and were skipped.`);
        const valid = candidates.filter(f => f.size <= MAX_FILE_SIZE);
        setAttachments(prev => {
            const combined = [...prev, ...valid];
            if (combined.length > MAX_ATTACHMENTS) {
                toast.error(`Maximum ${MAX_ATTACHMENTS} attachments allowed.`);
                return combined.slice(0, MAX_ATTACHMENTS);
            }
            return combined;
        });
    };

    const removeAttachment = (index: number) => setAttachments(prev => prev.filter((_, i) => i !== index));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let finalScreenshot: string | null = null;
            if (includeScreenshot && screenshotEnabled) {
                finalScreenshot = canvasRef.current ? canvasRef.current.toDataURL('image/png') : screenshot;
            }
            await createTicket({
                ...formData,
                screenshot: finalScreenshot,
                domain: window.location.hostname,
                page: window.location.pathname,
                user_id: propUserId,
                attachments,
            }, { apiKey, baseUrl: apiBaseUrl });
            toast.success('Ticket submitted successfully!');
            localStorage.setItem('twgt_submitted', '1');
            setCompact(true);
            doClose();
        } catch (error) {
            console.error('Failed to submit ticket:', error);
            toast.error('Failed to submit ticket. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const LauncherIcon = LAUNCHER_ICONS[launcherIcon] ?? MessageSquarePlus;

    const onToolbarMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toolbarDragRef.current = { mx: e.clientX, my: e.clientY, lx: toolbarPos.left, ly: toolbarPos.top };
        const onMove = (ev: MouseEvent) => {
            if (!toolbarDragRef.current) return;
            setToolbarPos({
                left: Math.max(4, toolbarDragRef.current.lx + ev.clientX - toolbarDragRef.current.mx),
                top:  Math.max(4, toolbarDragRef.current.ly + ev.clientY - toolbarDragRef.current.my),
            });
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            toolbarDragRef.current = null;
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const toolBtn = (tool: typeof currentTool, Icon: React.ElementType, title: string) => (
        <button
            type="button"
            onClick={() => setCurrentTool(tool)}
            className={`p-1.5 rounded-md hover:bg-muted transition-colors ${currentTool === tool ? 'bg-primary/10 ring-1 ring-primary text-primary' : 'text-muted-foreground'}`}
            title={title}
        >
            <Icon className="w-3.5 h-3.5" />
        </button>
    );

    const hasScreenshotSection = screenshotEnabled && screenshot && includeScreenshot;

    // Register launcher in the FloatingDock (order 1 = bottom slot)
    const ping = useDockSlot('support-ticket', 1, () =>
        isOpen ? null : (
            <button
                onClick={handleOpen}
                disabled={capturing}
                className={`relative bg-primary text-primary-foreground hover:bg-primary/90
                    transition-all duration-200 hover:scale-105 shadow-lg
                    flex items-center gap-2 rounded-full
                    ${compact ? 'p-3' : 'pl-4 pr-5 py-3'}`}
                title="Report issue (Alt+Shift+S)"
            >
                {!hasBeenOpened && (
                    <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping pointer-events-none" />
                )}
                {capturing
                    ? <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                    : <LauncherIcon className="w-5 h-5 shrink-0" />
                }
                {!compact && (
                    <span className="text-body font-medium whitespace-nowrap">{launcherLabel}</span>
                )}
            </button>
        )
    );

    // Keep dock in sync when launcher appearance changes
    useEffect(() => { ping(); }, [isOpen, capturing, hasBeenOpened, compact]);

    const panelStyle: React.CSSProperties = isFullscreen
        ? { position: 'fixed', inset: 12, zIndex }
        : { position: 'fixed', bottom: 24, right: 24, zIndex };

    if (!mounted) return null;

    return createPortal(
        <>
            {/* Widget panel */}
            {isOpen && (
                <div style={panelStyle}>
                <div className={`bg-background border rounded-lg shadow-2xl flex flex-col
                    animate-in slide-in-from-bottom-2 fade-in duration-300 transition-all duration-300
                    ${isFullscreen
                        ? 'w-full h-full'
                        : `max-h-[85vh] w-[95vw] ${hasScreenshotSection ? 'md:w-[720px]' : 'md:w-[420px]'}`
                    }`}>

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 rounded-t-lg border-l-4 shrink-0"
                        style={{ borderLeftColor: PRIORITY_COLORS[formData.priority] }}>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-heading-3">Support Ticket</h3>
                            <p className="text-micro text-muted-foreground truncate max-w-[280px]">
                                {window.location.pathname}
                            </p>
                        </div>
                        {/* Inline discard warning — shown in header for both modes */}
                        {showDiscardWarning && (
                            <div className="flex items-center gap-2 mr-3 bg-amber-50 border border-amber-300 rounded-lg px-3 py-1.5">
                                <span className="text-micro text-amber-800 whitespace-nowrap">Discard ticket?</span>
                                <button onClick={() => setShowDiscardWarning(false)} className="text-micro px-2 py-0.5 rounded border border-amber-300 text-amber-700 hover:bg-amber-100">Keep</button>
                                <button onClick={doClose} className="text-micro px-2 py-0.5 rounded bg-amber-600 text-white hover:bg-amber-700">Discard</button>
                            </div>
                        )}
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                            <button
                                onClick={() => setIsFullscreen(f => !f)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
                                title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Expand to fullscreen'}
                            >
                                {isFullscreen
                                    ? <Minimize2 className="w-4 h-4" />
                                    : <Maximize2 className="w-4 h-4" />
                                }
                            </button>
                            <button onClick={attemptClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className={`p-4 flex-1 min-h-0 ${hasScreenshotSection ? 'flex flex-row gap-4 overflow-hidden' : 'flex flex-col space-y-4 overflow-y-auto'}`}>

                        {/* Screenshot column */}
                        {hasScreenshotSection && (
                            <div className="flex-[3] min-w-0 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-micro font-medium text-muted-foreground uppercase tracking-wide">
                                        {currentTool === 'move' ? 'Scroll to pan' : 'Draw to annotate'}
                                    </span>
                                </div>
                                <div className="relative border rounded-md overflow-auto bg-muted/20 flex-1">
                                    {/* Draggable toolbar */}
                                    <div
                                        className="absolute z-10 flex flex-col gap-0.5 bg-background/90 backdrop-blur-md border rounded-lg shadow-xl p-1"
                                        style={{ left: toolbarPos.left, top: toolbarPos.top }}
                                    >
                                        {/* Drag handle */}
                                        <div
                                            onMouseDown={onToolbarMouseDown}
                                            className="flex justify-center py-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground rounded"
                                            title="Drag to move toolbar"
                                        >
                                            <GripVertical className="w-3 h-3" />
                                        </div>
                                        <div className="h-px bg-border mb-0.5" />
                                        <button type="button" onClick={undo} disabled={!canUndo}
                                            className={`p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors ${canUndo ? 'text-foreground' : 'text-muted-foreground'}`}
                                            title="Undo">
                                            <Undo2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button type="button" onClick={redo} disabled={!canRedo}
                                            className={`p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors ${canRedo ? 'text-foreground' : 'text-muted-foreground'}`}
                                            title="Redo">
                                            <Redo2 className="w-3.5 h-3.5" />
                                        </button>
                                        <div className="h-px bg-border my-0.5" />
                                        {toolBtn('pencil',    Pencil,       'Pencil')}
                                        {toolBtn('eraser',    Eraser,       'Eraser')}
                                        {toolBtn('rectangle', Square,       'Rectangle')}
                                        {toolBtn('circle',    Circle,       'Circle')}
                                        {toolBtn('arrow',     ArrowUpRight, 'Arrow')}
                                        {toolBtn('move',      Hand,         'Pan')}
                                        <div className="h-px bg-border my-0.5" />
                                        <button type="button" onClick={clearCanvas}
                                            className="p-1.5 rounded-md hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                                            title="Clear All">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                        {/* Colour swatch */}
                                        <div className="h-px bg-border my-0.5" />
                                        {ANNOTATION_COLORS.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => { setAnnotationColor(color); if (currentTool === 'eraser') setCurrentTool('pencil'); }}
                                                className={`w-6 h-6 rounded-full mx-auto border-2 transition-transform hover:scale-110 ${annotationColor === color ? 'border-primary scale-110' : 'border-transparent'}`}
                                                style={{ backgroundColor: color === '#ffffff' ? '#e5e7eb' : color }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                    <canvas
                                        ref={canvasRef}
                                        className={`w-full h-auto ${currentTool === 'move' ? 'cursor-grab touch-pan-y' : 'cursor-crosshair touch-none'}`}
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Form column */}
                        <div className={hasScreenshotSection ? 'flex-[2] min-w-0 flex flex-col gap-3 overflow-y-auto' : 'w-full'}>
                            {/* Screenshot error */}
                            {screenshotError && (
                                <div className="p-2 text-micro text-red-500 bg-red-50 border border-red-200 rounded">
                                    Screenshot failed: {screenshotError}
                                </div>
                            )}

                            {/* Include screenshot toggle (only when screenshot was captured) */}
                            {screenshotEnabled && screenshot && (
                                <label className="flex items-center gap-2 text-body cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={includeScreenshot}
                                        onChange={(e) => setIncludeScreenshot(e.target.checked)}
                                        className="rounded border-input"
                                    />
                                    Include page screenshot
                                </label>
                            )}

                            <form id="ticket-form" onSubmit={handleSubmit} className="space-y-3">
                                {/* Type */}
                                <div className="space-y-1">
                                    <label htmlFor="type" className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
                                        Type
                                    </label>
                                    <select
                                        id="type"
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="bug">Bug</option>
                                        <option value="feature">Feature Request</option>
                                        <option value="billing">Billing Question</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                {/* Subject */}
                                <div className="space-y-1">
                                    <label htmlFor="subject" className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
                                        Subject
                                    </label>
                                    <input
                                        id="subject"
                                        required
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-body ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                                        placeholder="Brief summary of the issue"
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label htmlFor="description" className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
                                            Description
                                        </label>
                                        <span className={`text-micro ${formData.description.length > 1800 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                            {formData.description.length}/2000
                                        </span>
                                    </div>
                                    <textarea
                                        id="description"
                                        required
                                        maxLength={2000}
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-body ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 resize-y"
                                        placeholder="Detailed explanation..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                {/* Priority */}
                                <div className="space-y-1">
                                    <label htmlFor="priority" className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
                                        Priority
                                    </label>
                                    <select
                                        id="priority"
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>

                                {/* File attachments */}
                                <div className="space-y-1">
                                    <label className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
                                        Attachments <span className="normal-case font-normal">(max {MAX_ATTACHMENTS}, 10 MB each)</span>
                                    </label>
                                    <label
                                        htmlFor="file-upload"
                                        className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-input rounded-md p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => { e.preventDefault(); onFilesSelected(e.dataTransfer.files); }}
                                    >
                                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-body text-muted-foreground text-center">
                                            Drop files or <span className="text-primary underline">browse</span>
                                        </span>
                                        <span className="text-micro text-muted-foreground">PNG, JPG, GIF, WEBP, PDF</span>
                                        <input
                                            id="file-upload"
                                            type="file"
                                            accept="image/*,.pdf"
                                            multiple
                                            className="hidden"
                                            onChange={(e) => onFilesSelected(e.target.files)}
                                        />
                                    </label>
                                    {attachments.length > 0 && (
                                        <ul className="space-y-1 mt-1">
                                            {attachments.map((file, i) => (
                                                <li key={i} className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                                                    {file.type === 'application/pdf'
                                                        ? <FileText className="w-4 h-4 text-red-500 shrink-0" />
                                                        : <img src={URL.createObjectURL(file)} alt={file.name} className="w-7 h-7 object-cover rounded shrink-0" />
                                                    }
                                                    <span className="text-body truncate flex-1 min-w-0">{file.name}</span>
                                                    <span className="text-micro text-muted-foreground shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                                                    <button type="button" onClick={() => removeAttachment(i)}
                                                        className="text-muted-foreground hover:text-destructive shrink-0 transition-colors">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t bg-muted/30 flex gap-2 shrink-0 rounded-b-lg">
                        <button
                            type="button"
                            onClick={attemptClose}
                            className="flex-1 inline-flex items-center justify-center rounded-md text-body font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="ticket-form"
                            disabled={loading}
                            className="flex-1 inline-flex items-center justify-center rounded-md text-body font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                        >
                            {loading ? (
                                <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Submitting...</>
                            ) : 'Submit Ticket'}
                        </button>
                    </div>
                </div>
                </div>
            )}
        </>,
        document.body
    );
}

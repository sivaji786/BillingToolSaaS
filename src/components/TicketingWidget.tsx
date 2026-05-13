import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquarePlus, X, Loader2, Pencil, Eraser, Trash2, Hand, Square, Circle, ArrowUpRight, Undo2, Redo2 } from 'lucide-react';

import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { createTicket } from '../services/ticketService';

interface TicketingWidgetProps {
    apiKey: string;
    apiBaseUrl?: string;
    userId?: string | null;
}

export function TicketingWidget({ apiKey, apiBaseUrl, userId: propUserId }: TicketingWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        subject: '',
        description: '',
        priority: 'low',
    });

    const [isDrawing, setIsDrawing] = useState(false);
    const [currentTool, setCurrentTool] = useState<'pencil' | 'eraser' | 'move' | 'rectangle' | 'circle' | 'arrow'>('pencil');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const startPos = useRef<{ x: number, y: number } | null>(null);
    const snapshot = useRef<ImageData | null>(null);
    const undoStack = useRef<ImageData[]>([]);
    const redoStack = useRef<ImageData[]>([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [screenshotError, setScreenshotError] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Initialize canvas when screenshot is loaded
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

    const handleOpen = async () => {
        // Workaround for html-to-image not supporting oklch colors in Tailwind v4
        const colors = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose', 'slate', 'gray', 'zinc', 'neutral', 'stone'];
        const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
        const overrides: string[] = [];

        // Override all potential color variables with a safe fallback
        colors.forEach(color => {
            shades.forEach(shade => {
                const varName = `--color-${color}-${shade}`;
                document.documentElement.style.setProperty(varName, '#808080');
                overrides.push(varName);
            });
        });

        // Capture screenshot of the viewport before opening the form
        try {
            setScreenshotError(null);
            const dataUrl = await toPng(document.body, { cacheBust: true });
            setScreenshot(dataUrl);
            setIsOpen(true);
        } catch (error: unknown) {
            console.error('Failed to capture screenshot:', error);
            setScreenshotError(error?.message || 'Unknown error');
            // Open anyway even if screenshot fails
            setIsOpen(true);
        } finally {
            // Restore styles
            overrides.forEach(varName => {
                document.documentElement.style.removeProperty(varName);
            });
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setScreenshot(null);
        setScreenshotError(null);
        setFormData({ subject: '', description: '', priority: 'low' });
    };

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
        if (!canvasRef.current || undoStack.current.length === 0) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        redoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        const prevState = undoStack.current.pop();
        if (prevState) ctx.putImageData(prevState, 0, 0);

        setCanUndo(undoStack.current.length > 0);
        setCanRedo(true);
    };

    const redo = () => {
        if (!canvasRef.current || redoStack.current.length === 0) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        undoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        const nextState = redoStack.current.pop();
        if (nextState) ctx.putImageData(nextState, 0, 0);

        setCanUndo(true);
        setCanRedo(redoStack.current.length > 0);
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current || currentTool === 'move') return;

        saveState();
        setIsDrawing(true);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

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
        ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : '#ef4444';

        ctx.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';
    };

    const drawRectangle = (ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number) => {
        ctx.strokeRect(startX, startY, endX - startX, endY - startY);
    };

    const drawCircle = (ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number) => {
        const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
    };

    const drawArrow = (ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number) => {
        const headLength = 15;
        const angle = Math.atan2(endY - startY, endX - startX);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !canvasRef.current || currentTool === 'move') return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx || !startPos.current) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            if ('buttons' in e && e.buttons !== 1) return;
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        if (['rectangle', 'circle', 'arrow'].includes(currentTool) && snapshot.current) {
            ctx.putImageData(snapshot.current, 0, 0);
            if (currentTool === 'rectangle') drawRectangle(ctx, startPos.current.x, startPos.current.y, x, y);
            else if (currentTool === 'circle') drawCircle(ctx, startPos.current.x, startPos.current.y, x, y);
            else if (currentTool === 'arrow') drawArrow(ctx, startPos.current.x, startPos.current.y, x, y);
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
        if (screenshot && canvasRef.current) {
            saveState();
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
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Get final image from canvas if it exists
            let finalScreenshot = screenshot;
            if (canvasRef.current) {
                const canvas = canvasRef.current;
                finalScreenshot = canvas.toDataURL('image/png');
            }

            const postData = {
                ...formData,
                screenshot: finalScreenshot,
                domain: window.location.hostname,
                page: window.location.pathname,
                user_id: propUserId
            };

            await createTicket(postData, {
                apiKey,
                baseUrl: apiBaseUrl
            });
            toast.success('Ticket submitted successfully!');
            handleClose();
        } catch (error) {
            console.error('Failed to submit ticket:', error);
            toast.error('Failed to submit ticket. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return createPortal(
        <div className="fixed" style={{ bottom: '24px', right: '24px', zIndex: 9999, overflow: 'auto', maxHeight: 'calc(100vh - 100px)', maxWidth: 'calc(100vw - 200px)', overflowY: 'auto', overflowX: 'hidden' }}>
            {!isOpen && (
                <button
                    onClick={handleOpen}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110 flex items-center justify-center"
                    title="Report a Bug / Request Support"
                >
                    <MessageSquarePlus className="w-6 h-6" />
                </button>
            )}

            {isOpen && (
                <div className="bg-background border rounded-lg shadow-2xl w-[95vw] md:w-[450px] flex flex-col animate-in slide-in-from-bottom-2 fade-in duration-300 mb-2 mr-2 md:mb-0 md:mr-0 max-h-[85vh]">
                    <div className="flex items-center justify-between p-4 border-b bg-muted/50">
                        <h3 className="font-semibold text-lg">Support Ticket</h3>
                        <button
                            onClick={handleClose}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="overflow-y-auto p-4 space-y-4 flex-1 min-h-0">
                        {screenshotError && (
                            <div className="p-2 text-xs text-red-500 bg-red-50 border border-red-200 rounded">
                                Screenshot failed: {screenshotError}
                            </div>
                        )}
                        {screenshot && (
                            <div className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground">Screenshot Preview ({currentTool === 'move' ? 'Scroll enabled' : 'Draw to annotate'})</span>
                                <div className="relative border rounded-md overflow-auto max-h-[350px] bg-muted/20">
                                    <div className="sticky top-2 right-2 z-10 flex gap-1 bg-background/90 p-1.5 rounded-lg shadow-xl border backdrop-blur-md ml-auto w-fit mr-2 -mb-12">
                                        <button
                                            type="button"
                                            onClick={undo}
                                            disabled={!canUndo}
                                            className={`p-2 rounded-md hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent ${canUndo ? 'text-foreground' : 'text-muted-foreground'}`}
                                            title="Undo"
                                        >
                                            <Undo2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={redo}
                                            disabled={!canRedo}
                                            className={`p-2 rounded-md hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent ${canRedo ? 'text-foreground' : 'text-muted-foreground'}`}
                                            title="Redo"
                                        >
                                            <Redo2 className="w-5 h-5" />
                                        </button>
                                        <div className="w-px bg-border mx-1 my-1"></div>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentTool('pencil')}
                                            className={`p-2 rounded-md hover:bg-muted ${currentTool === 'pencil' ? 'bg-muted text-primary shadow-sm' : 'text-muted-foreground'}`}
                                            title="Pencil"
                                        >
                                            <Pencil className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentTool('eraser')}
                                            className={`p-2 rounded-md hover:bg-muted ${currentTool === 'eraser' ? 'bg-muted text-primary shadow-sm' : 'text-muted-foreground'}`}
                                            title="Eraser"
                                        >
                                            <Eraser className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentTool('move')}
                                            className={`p-2 rounded-md hover:bg-muted ${currentTool === 'move' ? 'bg-muted text-primary shadow-sm' : 'text-muted-foreground'}`}
                                            title="Move/Scroll"
                                        >
                                            <Hand className="w-5 h-5" />
                                        </button>
                                        <div className="w-px bg-border mx-1 my-1"></div>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentTool('rectangle')}
                                            className={`p-2 rounded-md hover:bg-muted ${currentTool === 'rectangle' ? 'bg-muted text-primary shadow-sm' : 'text-muted-foreground'}`}
                                            title="Rectangle"
                                        >
                                            <Square className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentTool('circle')}
                                            className={`p-2 rounded-md hover:bg-muted ${currentTool === 'circle' ? 'bg-muted text-primary shadow-sm' : 'text-muted-foreground'}`}
                                            title="Circle"
                                        >
                                            <Circle className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentTool('arrow')}
                                            className={`p-2 rounded-md hover:bg-muted ${currentTool === 'arrow' ? 'bg-muted text-primary shadow-sm' : 'text-muted-foreground'}`}
                                            title="Arrow"
                                        >
                                            <ArrowUpRight className="w-5 h-5" />
                                        </button>
                                        <div className="w-px bg-border mx-1 my-1"></div>
                                        <button
                                            type="button"
                                            onClick={clearCanvas}
                                            className="p-2 rounded-md hover:bg-red-100 text-muted-foreground hover:text-red-600"
                                            title="Clear All"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
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

                        <form id="ticket-form" onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="subject" className="text-sm font-medium">
                                    Subject
                                </label>
                                <input
                                    id="subject"
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Brief summary of the issue"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="description" className="text-sm font-medium">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    required
                                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                                    placeholder="Detailed explanation..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="priority" className="text-sm font-medium">
                                    Priority
                                </label>
                                <select
                                    id="priority"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>
                        </form>
                    </div>

                    <div className="p-4 border-t bg-muted/50 flex gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="ticket-form"
                            disabled={loading}
                            className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                'Submit Ticket'
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}

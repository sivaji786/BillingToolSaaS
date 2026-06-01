import { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, Check } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';

interface Props {
    label: string;
    legalNotice?: string;
    onSign: (svgData: string, signerName: string) => void;
    onClear?: () => void;
    readOnly?: boolean;
    existingData?: string;
}

export function SignaturePad({ label, legalNotice, onSign, onClear, readOnly = false, existingData }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [signerName, setSignerName] = useState('');
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasMark, setHasMark] = useState(false);
    const [signed, setSigned] = useState(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    // Render existing signature if provided
    useEffect(() => {
        if (existingData && canvasRef.current) {
            const img = new Image();
            img.onload = () => {
                const ctx = canvasRef.current?.getContext('2d');
                ctx?.drawImage(img, 0, 0);
            };
            img.src = existingData;
            setSigned(true);
        }
    }, [existingData]);

    const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            const t = e.touches[0];
            return { x: t.clientX - rect.left, y: t.clientY - rect.top };
        }
        return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
    };

    const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (readOnly || signed) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        setIsDrawing(true);
        lastPos.current = getPos(e, canvas);
    }, [readOnly, signed]);

    const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const pos = getPos(e, canvas);
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1a1a1a';
        ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastPos.current = pos;
        setHasMark(true);
    }, [isDrawing]);

    const endDraw = useCallback(() => setIsDrawing(false), []);

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
        setHasMark(false);
        setSigned(false);
        onClear?.();
    };

    const hasEnoughPixels = (): boolean => {
        const canvas = canvasRef.current;
        if (!canvas) return false;
        const data = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data;
        if (!data) return false;
        let nonZero = 0;
        for (let i = 3; i < data.length; i += 4) { if (data[i] > 0) nonZero++; }
        return nonZero > 200;
    };

    const handleDone = () => {
        if (!signerName.trim()) {
            alert('Please enter your name.');
            return;
        }
        if (!hasEnoughPixels()) {
            alert('Please draw a signature in the box.');
            return;
        }
        const canvas = canvasRef.current!;
        // Export as PNG data URL (base64)
        const data = canvas.toDataURL('image/png');
        setSigned(true);
        onSign(data, signerName.trim());
    };

    return (
        <div className="space-y-3">
            <Label>{label}</Label>

            {!signed && (
                <div>
                    <Input
                        placeholder="Full name"
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        disabled={readOnly}
                        className="mb-2"
                    />
                </div>
            )}

            <div className="relative border-2 rounded-lg overflow-hidden bg-white"
                 style={{ borderColor: signed ? '#16a34a' : '#e2e8f0' }}>
                <canvas
                    ref={canvasRef}
                    width={560}
                    height={160}
                    className="w-full touch-none cursor-crosshair"
                    style={{ cursor: readOnly || signed ? 'default' : 'crosshair' }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                />
                {!hasMark && !existingData && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground text-caption select-none">
                        Sign here
                    </div>
                )}
            </div>

            {legalNotice && (
                <p className="text-caption text-muted-foreground border-l-2 border-purple-200 pl-2">
                    {legalNotice}
                </p>
            )}

            {!readOnly && !signed && (
                <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={handleClear} disabled={!hasMark}>
                        <RotateCcw className="w-3.5 h-3.5" /> Clear
                    </Button>
                    <Button type="button" size="sm" className="gap-1 bg-purple-600 hover:bg-purple-700" onClick={handleDone}>
                        <Check className="w-3.5 h-3.5" /> Done
                    </Button>
                </div>
            )}

            {signed && (
                <div className="flex items-center gap-2">
                    <span className="text-caption text-green-700 font-medium">✓ Signed: {signerName}</span>
                    {!readOnly && (
                        <Button type="button" variant="ghost" size="sm" className="gap-1 text-caption" onClick={handleClear}>
                            <RotateCcw className="w-3 h-3" /> Re-sign
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}


import { useState, useRef, useEffect, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Trash2, Move } from 'lucide-react';
import { clsx } from 'clsx';

export interface RedactionRegion {
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
    width: number; // Percentage 0-100
    height: number; // Percentage 0-100
}

interface RedactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    screenshots: string[]; // 5 URLs
    initialRedactions?: Record<number, RedactionRegion[]>;
    onSave: (redactions: Record<number, RedactionRegion[]>) => void;
}

export function RedactionModal({ isOpen, onClose, screenshots, initialRedactions = {}, onSave }: RedactionModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [redactions, setRedactions] = useState<Record<number, RedactionRegion[]>>(initialRedactions);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);
    const [currentRect, setCurrentRect] = useState<RedactionRegion | null>(null);
    const [activeTool, setActiveTool] = useState<'draw' | 'erase'>('draw');

    const imageRef = useRef<HTMLImageElement>(null);

    // Initialize state when opening
    useEffect(() => {
        if (isOpen) {
            setRedactions(initialRedactions || {});
            setCurrentIndex(0);
        }
    }, [isOpen, initialRedactions]);

    if (!isOpen) return null;

    const getRelativeCoords = (e: MouseEvent) => {
        if (!imageRef.current) return { x: 0, y: 0 };
        const rect = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        return { x, y };
    };

    const handleMouseDown = (e: MouseEvent) => {
        if (!imageRef.current || activeTool !== 'draw') return;
        setIsDrawing(true);
        const coords = getRelativeCoords(e);
        setStartPos(coords);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDrawing || !startPos || !imageRef.current) return;
        const coords = getRelativeCoords(e);

        const width = Math.abs(coords.x - startPos.x);
        const height = Math.abs(coords.y - startPos.y);
        const x = Math.min(coords.x, startPos.x);
        const y = Math.min(coords.y, startPos.y);

        setCurrentRect({ x, y, width, height });
    };

    const handleMouseUp = () => {
        if (isDrawing && currentRect) {
            setRedactions(prev => {
                const currentList = prev[currentIndex] || [];
                return {
                    ...prev,
                    [currentIndex]: [...currentList, currentRect]
                };
            });
        }
        setIsDrawing(false);
        setStartPos(null);
        setCurrentRect(null);
    };

    const handleDeleteRegion = (regionIndex: number) => {
        setRedactions(prev => {
            const currentList = prev[currentIndex] || [];
            const newList = currentList.filter((_, idx) => idx !== regionIndex);
            return {
                ...prev,
                [currentIndex]: newList
            };
        });
    };

    const handleSave = () => {
        onSave(redactions);
        onClose();
    };

    const handleClearCurrent = () => {
        if (confirm('Clear all redactions for this screenshot?')) {
            setRedactions(prev => ({
                ...prev,
                [currentIndex]: []
            }));
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border border-white/10 rounded-xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/50">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-white">Redaction Tool</h2>
                        <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                            <button
                                onClick={() => setActiveTool('draw')}
                                className={clsx(
                                    "px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors",
                                    activeTool === 'draw' ? "bg-primary text-white" : "text-gray-400 hover:text-white"
                                )}
                            >
                                <Move size={16} /> Draw Box
                            </button>
                            {/* Erase mode could handle clicking boxes to delete, but for now we put X buttons on boxes */}
                            {/* <button
                                onClick={() => setActiveTool('erase')}
                                className={clsx(
                                    "px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors",
                                    activeTool === 'erase' ? "bg-red-500 text-white" : "text-gray-400 hover:text-white"
                                )}
                            >
                                <Eraser size={16} /> Erase
                            </button> */}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleClearCurrent}
                            className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                            <Trash2 size={18} /> Clear Current
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 flex items-center gap-2"
                        >
                            <Save size={18} /> Save Redactions
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex min-h-0">
                    {/* Screenshot Thumbnails Sidebar */}
                    <div className="w-48 bg-black/30 border-r border-white/10 overflow-y-auto p-4 flex flex-col gap-3">
                        {screenshots.map((url, idx) => {
                            const hasRedactions = (redactions[idx]?.length || 0) > 0;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={clsx(
                                        "relative aspect-video rounded border-2 overflow-hidden transition-all group shrink-0",
                                        currentIndex === idx ? "border-primary ring-2 ring-primary/30" : "border-white/10 hover:border-white/30"
                                    )}
                                >
                                    <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" />

                                    <div className="absolute top-1 left-1 bg-black/70 px-1.5 rounded text-xs text-white font-bold">
                                        #{idx + 1}
                                    </div>

                                    {hasRedactions && (
                                        <div className="absolute inset-0 bg-red-500/10 pointer-events-none" />
                                    )}
                                    {hasRedactions && (
                                        <div className="absolute bottom-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                                            {redactions[idx].length} boxes
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Canvas Area */}
                    <div className="flex-1 bg-[#1a1a1a] p-8 flex items-center justify-center overflow-auto relative select-none">
                        <div
                            className="relative shadow-2xl border border-white/10 inline-block"
                            style={{ cursor: activeTool === 'draw' ? 'crosshair' : 'default' }}
                        >
                            <img
                                ref={imageRef}
                                src={screenshots[currentIndex]}
                                alt="Editing Area"
                                className="max-w-full max-h-[75vh] object-contain pointer-events-none select-none"
                                draggable={false}
                            />

                            {/* Drawing Layer */}
                            <div
                                className="absolute inset-0 z-10"
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                {/* Existing Regions */}
                                {(redactions[currentIndex] || []).map((region, idx) => (
                                    <div
                                        key={idx}
                                        className="absolute border-2 border-red-500 bg-black/80 hover:bg-red-500/20 group"
                                        style={{
                                            left: `${region.x}%`,
                                            top: `${region.y}%`,
                                            width: `${region.width}%`,
                                            height: `${region.height}%`
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()} // Prevent drawing when clicking existing box
                                    >
                                        <button
                                            onClick={() => handleDeleteRegion(idx)}
                                            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110"
                                            title="Remove Box"
                                        >
                                            <X size={12} />
                                        </button>

                                        {/* Box Dimensions/Info (Optional) */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                            <span className="text-[10px] text-white font-mono bg-black/50 px-1 rounded">
                                                {Math.round(region.width)}% x {Math.round(region.height)}%
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                {/* Currently Drawing Rect */}
                                {isDrawing && currentRect && (
                                    <div
                                        className="absolute border-2 border-primary bg-primary/20"
                                        style={{
                                            left: `${currentRect.x}%`,
                                            top: `${currentRect.y}%`,
                                            width: `${currentRect.width}%`,
                                            height: `${currentRect.height}%`
                                        }}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Instructions overlay */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur text-white px-4 py-2 rounded-full text-sm border border-white/10 pointer-events-none">
                            Drag to draw black boxes over spoilers (titles, names)
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}


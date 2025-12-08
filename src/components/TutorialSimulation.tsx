
import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Search, X, Check } from 'lucide-react';

// Hardcoded assets for "The Last of Us"
const SCREENSHOTS = [
    "https://images.igdb.com/igdb/image/upload/t_720p/scxnly.jpg", // Image 1
    "https://images.igdb.com/igdb/image/upload/t_720p/scxnlz.jpg", // Image 2
    "https://images.igdb.com/igdb/image/upload/t_720p/scxnm0.jpg", // Image 3
];

const CROP_POSITIONS = [
    { x: 61, y: 53 },
    { x: 75, y: 20 },
    { x: 99, y: 89 },
];

interface SimulationState {
    step: 'start' | 'typing1' | 'submit1' | 'reveal1' | 'typing2' | 'submit2' | 'reveal2' | 'typing3' | 'submit3' | 'won' | 'reset';
    text: string;
    guesses: Array<{ text: string, type: 'wrong' | 'similar' | 'correct' }>;
    zoomLevel: number; // 500, 400, 300, etc.
    imageIndex: number; // 0, 1, 2
}

export function TutorialSimulation() {
    const [state, setState] = useState<SimulationState>({
        step: 'start',
        text: '',
        guesses: [],
        zoomLevel: 500,
        imageIndex: 0
    });

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;

        const typeVariable = (targetText: string, nextStep: SimulationState['step']) => {
            if (state.text.length < targetText.length) {
                timer = setTimeout(() => {
                    setState(prev => ({ ...prev, text: targetText.slice(0, prev.text.length + 1) }));
                }, 50 + Math.random() * 50); // Random typing speed
            } else {
                timer = setTimeout(() => {
                    setState(prev => ({ ...prev, step: nextStep }));
                }, 400); // Pause before submit
            }
        };

        switch (state.step) {
            case 'start':
                timer = setTimeout(() => {
                    setState(prev => ({ ...prev, step: 'typing1' }));
                }, 1000);
                break;

            case 'typing1':
                typeVariable("Resident Evil", 'submit1');
                break;

            case 'submit1':
                timer = setTimeout(() => {
                    setState(prev => ({
                        ...prev,
                        text: '',
                        guesses: [{ text: "Resident Evil", type: 'wrong' }],
                        step: 'reveal1'
                    }));
                }, 200);
                break;

            case 'reveal1':
                timer = setTimeout(() => {
                    setState(prev => ({
                        ...prev,
                        zoomLevel: 400,
                        imageIndex: 1,
                        step: 'typing2'
                    }));
                }, 1000); // Wait for zoom animation
                break;

            case 'typing2':
                typeVariable("The Last Guardian", 'submit2');
                break;

            case 'submit2':
                timer = setTimeout(() => {
                    setState(prev => ({
                        ...prev,
                        text: '',
                        guesses: [
                            { text: "Resident Evil", type: 'wrong' },
                            { text: "The Last Guardian", type: 'wrong' }
                        ],
                        step: 'reveal2'
                    }));
                }, 200);
                break;

            case 'reveal2':
                timer = setTimeout(() => {
                    setState(prev => ({
                        ...prev,
                        zoomLevel: 300,
                        imageIndex: 2,
                        step: 'typing3'
                    }));
                }, 1000);
                break;

            case 'typing3':
                typeVariable("The Last of Us", 'submit3');
                break;

            case 'submit3':
                timer = setTimeout(() => {
                    setState(prev => ({
                        ...prev,
                        text: '',
                        guesses: [
                            { text: "Resident Evil", type: 'wrong' },
                            { text: "The Last Guardian", type: 'wrong' },
                            { text: "The Last of Us", type: 'correct' }
                        ],
                        step: 'won'
                    }));
                }, 200);
                break;

            case 'won':
                timer = setTimeout(() => {
                    setState({
                        step: 'start',
                        text: '',
                        guesses: [],
                        zoomLevel: 500,
                        imageIndex: 0
                    });
                }, 2500); // Show win state for a bit
                break;
        }

        return () => clearTimeout(timer);
    }, [state.step, state.text, state.guesses]);


    return (
        <div className="w-full h-full md:h-auto bg-black/40 rounded-xl overflow-hidden border border-white/10 shadow-xl flex flex-col md:flex-row md:min-h-[280px]">
            {/* Image Area - flex-1 on mobile, fixed on desktop */}
            <div className="relative flex-1 md:flex-1 bg-black/50 overflow-hidden group min-h-[120px] md:h-auto">
                {/* Background Image with Zoom/Crop */}
                <div
                    className="absolute inset-0 w-full h-full transition-all duration-700 ease-in-out"
                    style={{
                        backgroundImage: `url(${SCREENSHOTS[state.imageIndex]})`,
                        backgroundPosition: `${CROP_POSITIONS[state.imageIndex].x}% ${CROP_POSITIONS[state.imageIndex].y}%`,
                        backgroundSize: `${state.zoomLevel}%`,
                        backgroundRepeat: 'no-repeat'
                    }}
                />

                {/* Zoom Badge */}
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur px-3 py-1 rounded-full text-xs font-bold border border-white/20 text-white shadow-lg transition-transform hover:scale-105">
                    Zoom: {state.zoomLevel}%
                </div>

                {/* Win Overlay */}
                {state.step === 'won' && (
                    <div className="absolute inset-0 bg-green-500/20 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300">
                        <div className="bg-green-500 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 transform animate-in zoom-in slide-in-from-bottom-4">
                            <Check size={24} strokeWidth={3} />
                            <span>Correct!</span>
                        </div>
                    </div>
                )}

                {/* Reveal Flash Overlay */}
                {(state.step === 'reveal1' || state.step === 'reveal2') && (
                    <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />
                )}
            </div>

            {/* UI Simulation - compact on mobile, larger on desktop */}
            <div className="w-full md:w-64 bg-surface flex flex-col p-2 md:p-4 border-t md:border-t-0 md:border-l border-white/5 gap-2 md:gap-4 flex-shrink-0">
                {/* Simulated Input */}
                <div className="relative">
                    <div className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-9 flex items-center text-sm text-white/90 font-medium">
                        {state.text}
                        {state.step.startsWith('typing') && (
                            <span className="w-0.5 h-4 bg-green-400 ml-0.5 animate-pulse" />
                        )}
                    </div>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                </div>

                {/* Guess List */}
                <div className="flex-1 space-y-2 overflow-hidden">
                    <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Guesses</div>
                    {state.guesses.slice().reverse().map((guess, idx) => (
                        <div
                            key={idx}
                            className={clsx(
                                "flex items-center justify-between p-2 rounded bg-white/5 border text-xs animate-in slide-in-from-top-2 fade-in duration-300",
                                guess.type === 'correct' ? "border-green-500/30 text-green-400 bg-green-500/5" :
                                    guess.type === 'wrong' ? "border-red-500/30 text-red-400 bg-red-500/5" :
                                        "border-yellow-500/30 text-yellow-400 bg-yellow-500/5"
                            )}
                        >
                            <span className="font-medium truncate pr-2">{guess.text}</span>
                            {guess.type === 'correct' ? <Check size={14} /> : <X size={14} />}
                        </div>
                    ))}

                    {state.guesses.length === 0 && (
                        <div className="text-center text-gray-600 text-xs py-4 italic">
                            No guesses yet...
                        </div>
                    )}
                </div>

                {/* Tutorial Text */}
                <div className="text-xs text-gray-400 border-t border-white/5 pt-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={clsx(
                            "w-1.5 h-1.5 rounded-full transition-colors duration-300",
                            state.zoomLevel === 500 ? "bg-green-400" : "bg-gray-600"
                        )} />
                        <span className={state.zoomLevel === 500 ? "text-gray-200" : ""}>Start at 500% zoom</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={clsx(
                            "w-1.5 h-1.5 rounded-full transition-colors duration-300",
                            state.zoomLevel < 500 ? "bg-green-400" : "bg-gray-600"
                        )} />
                        <span className={state.zoomLevel < 500 ? "text-gray-200" : ""}>Wrong guess reveals more</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

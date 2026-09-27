
import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Search, X, Check } from 'lucide-react';
import { motion, AnimatePresence, animate, useAnimationControls, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { buildTransition } from '../utils/motion';

// Hardcoded assets for "The Last of Us" (1080p so the 5x crop stays crisp)
const SCREENSHOTS = [
    "https://images.igdb.com/igdb/image/upload/t_1080p/scxnly.jpg", // Image 1
    "https://images.igdb.com/igdb/image/upload/t_1080p/scxnlz.jpg", // Image 2
    "https://images.igdb.com/igdb/image/upload/t_1080p/scxnm0.jpg", // Image 3
];

const CROP_POSITIONS = [
    { x: 61, y: 53 },
    { x: 75, y: 20 },
    { x: 99, y: 89 },
];

// Everything moves like a camera lens: strong ease-out, long pull-back on the win
const LENS_EASE = [0.16, 1, 0.3, 1] as const;
const PULL_BACK_SECONDS = 1.6;
const REFOCUS_SECONDS = 0.55;
const PRELOAD_TIMEOUT_MS = 1500;

// Viewfinder inset (% of frame): tight at 500% zoom, near the frame edges at 100%
const bracketInset = (zoom: number) => 4 + ((zoom - 100) / 400) * 24;

interface SimulationState {
    step: 'start' | 'typing1' | 'submit1' | 'reveal1' | 'typing2' | 'submit2' | 'reveal2' | 'typing3' | 'submit3' | 'won' | 'reset';
    text: string;
    guesses: Array<{ text: string, type: 'wrong' | 'similar' | 'correct' }>;
    zoomLevel: number; // 500, 400, 300, etc.
    imageIndex: number; // 0, 1, 2
}

interface TutorialSimulationProps {
    className?: string;
    overlay?: React.ReactNode;
}

export function TutorialSimulation({ className, overlay }: TutorialSimulationProps) {
    const [state, setState] = useState<SimulationState>({
        step: 'start',
        text: '',
        guesses: [],
        zoomLevel: 500,
        imageIndex: 0
    });
    const [imagesReady, setImagesReady] = useState(false);
    const reduceMotion = !!useReducedMotion();
    const frameControls = useAnimationControls();
    const isMissReveal = state.step === 'reveal1' || state.step === 'reveal2';

    // Preload all screenshots so the first frame never pops in (with a fallback so a slow CDN can't stall the demo)
    useEffect(() => {
        let cancelled = false;
        const markReady = () => { if (!cancelled) setImagesReady(true); };
        const fallback = setTimeout(markReady, PRELOAD_TIMEOUT_MS);
        Promise.all(SCREENSHOTS.map(src => new Promise<void>(resolve => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
        }))).then(markReady);
        return () => {
            cancelled = true;
            clearTimeout(fallback);
        };
    }, []);

    // Wrong guess: the frame jolts sideways
    useEffect(() => {
        if (!isMissReveal || reduceMotion) return;
        frameControls.start({ x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.3, ease: 'easeOut' } });
    }, [isMissReveal, reduceMotion, frameControls]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;

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
                if (!imagesReady) break;
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
                }, 900); // Let the miss land before refocusing
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
                }, 900);
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
                        zoomLevel: 100, // Pull back to the full screenshot
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
                }, 4200); // Pull-back plus a beat to take in the full shot
                break;
        }

        return () => clearTimeout(timer);
    }, [state.step, state.text, state.guesses, imagesReady]);


    return (
        <div className={clsx("w-full h-full md:h-auto bg-black/40 rounded-xl overflow-hidden border border-white/10 shadow-xl flex flex-col md:flex-row md:min-h-[280px]", className)}>
            {/* Image Area - flex-1 on mobile, fixed on desktop */}
            <motion.div
                animate={frameControls}
                className="relative flex-1 md:flex-1 bg-black/50 overflow-hidden group min-h-[120px] md:h-auto"
            >
                {/* Screenshot layers: each new shot refocuses in over the last one */}
                <AnimatePresence>
                    {imagesReady && (
                        <motion.div
                            key={state.imageIndex}
                            className="absolute inset-0"
                            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: 'blur(10px)', scale: 1.04 }}
                            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                            exit={{ opacity: 0, transition: buildTransition(0.35, reduceMotion) }}
                            transition={buildTransition(REFOCUS_SECONDS, reduceMotion, LENS_EASE)}
                        >
                            {/* Zoom is a scale around the crop point, so the win can dolly out to the full shot */}
                            <motion.img
                                src={SCREENSHOTS[state.imageIndex]}
                                alt=""
                                draggable={false}
                                className="absolute inset-0 w-full h-full object-cover select-none"
                                style={{ transformOrigin: `${CROP_POSITIONS[state.imageIndex].x}% ${CROP_POSITIONS[state.imageIndex].y}%` }}
                                initial={{ scale: state.zoomLevel / 100 }}
                                animate={{ scale: state.zoomLevel / 100 }}
                                transition={buildTransition(PULL_BACK_SECONDS, reduceMotion, LENS_EASE)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                <ViewfinderBrackets zoom={state.zoomLevel} solved={state.step === 'won'} reduced={reduceMotion} />

                {/* Zoom Badge */}
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur px-3 py-1 rounded-full text-xs font-bold border border-white/20 text-white shadow-lg transition-transform hover:scale-105">
                    Zoom: <ZoomReadout zoom={state.zoomLevel} reduced={reduceMotion} />
                </div>

                {/* Miss: brief red edge on a wrong guess */}
                <AnimatePresence>
                    {isMissReveal && (
                        <motion.div
                            key={state.step}
                            className="absolute inset-0 pointer-events-none"
                            style={{ boxShadow: 'inset 0 0 0 2px rgb(var(--error) / 0.7), inset 0 0 48px rgb(var(--error) / 0.35)' }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={buildTransition(0.25, reduceMotion)}
                        />
                    )}
                </AnimatePresence>

                {/* Win: lower-third caption once the pull-back has mostly settled */}
                <AnimatePresence>
                    {state.step === 'won' && (
                        <motion.div
                            key="solved"
                            className="absolute inset-x-0 bottom-0 px-4 pt-12 pb-3 md:px-5 md:pb-16 bg-gradient-to-t from-black/85 via-black/50 to-transparent pointer-events-none"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1, transition: { duration: reduceMotion ? 0.01 : 0.5, delay: reduceMotion ? 0 : PULL_BACK_SECONDS * 0.7 } }}
                            exit={{ opacity: 0, transition: buildTransition(0.3, reduceMotion) }}
                        >
                            <motion.div
                                initial={reduceMotion ? false : { y: 12 }}
                                animate={{ y: 0 }}
                                transition={{ duration: 0.6, delay: PULL_BACK_SECONDS * 0.7, ease: LENS_EASE }}
                            >
                                <div className="font-display text-2xl md:text-3xl font-bold leading-none text-white drop-shadow">
                                    The Last of Us
                                </div>
                                <div className="mt-2 flex items-center gap-1.5 text-xs md:text-sm font-semibold text-success">
                                    <Check size={14} strokeWidth={3} />
                                    Solved on guess 3 for +3 points
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Optional overlay (e.g. glass panel with content) */}
                {overlay}
            </motion.div>

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

/* Corner marks that open up as the crop widens and lock to the frame on a solve */
function ViewfinderBrackets({ zoom, solved, reduced }: { zoom: number; solved: boolean; reduced: boolean }) {
    const inset = `${bracketInset(zoom)}%`;
    const corner = 'absolute w-4 h-4 md:w-5 md:h-5 border-current';
    return (
        <motion.div
            aria-hidden
            className={clsx(
                'absolute pointer-events-none transition-colors duration-500',
                solved ? 'text-success' : 'text-white/70'
            )}
            initial={false}
            animate={{ top: inset, right: inset, bottom: inset, left: inset }}
            transition={buildTransition(solved ? PULL_BACK_SECONDS : REFOCUS_SECONDS, reduced, LENS_EASE)}
        >
            <span className={clsx(corner, 'top-0 left-0 border-t-2 border-l-2')} />
            <span className={clsx(corner, 'top-0 right-0 border-t-2 border-r-2')} />
            <span className={clsx(corner, 'bottom-0 left-0 border-b-2 border-l-2')} />
            <span className={clsx(corner, 'bottom-0 right-0 border-b-2 border-r-2')} />
        </motion.div>
    );
}

/* Zoom percentage that rolls to its new value in step with the lens */
function ZoomReadout({ zoom, reduced }: { zoom: number; reduced: boolean }) {
    const value = useMotionValue(zoom);
    const label = useTransform(value, v => `${Math.round(v)}%`);

    useEffect(() => {
        const controls = animate(value, zoom, buildTransition(zoom === 100 ? PULL_BACK_SECONDS : REFOCUS_SECONDS, reduced, LENS_EASE));
        return () => controls.stop();
    }, [value, zoom, reduced]);

    return <motion.span className="tabular-nums">{label}</motion.span>;
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Eye,
    SkipForward,
    Shuffle,
    HelpCircle,
    Gamepad2,
    ZoomOut,
    FileText,
    ChevronLeft,
    ChevronRight,
    X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { TutorialSimulation } from './TutorialSimulation';
import { useIsMobile } from '../hooks/useIsMobile';

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

const TOTAL_STEPS = 4;
const SWIPE_THRESHOLD = 50;

const lifelines = [
    { icon: Eye, name: 'Cover Peek', color: 'text-purple-400' },
    { icon: SkipForward, name: 'Skip', color: 'text-red-400' },
    { icon: Shuffle, name: 'Anagram', color: 'text-purple-400' },
    { icon: HelpCircle, name: 'Consultant', color: 'text-green-400' },
    { icon: Gamepad2, name: 'Double Trouble', color: 'text-yellow-400' },
    { icon: ZoomOut, name: 'Zoom Out', color: 'text-blue-400' },
    { icon: FileText, name: 'Synopsis', color: 'text-green-400' },
];

const contentVariants = {
    enter: { opacity: 0, y: 10 },
    center: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
    },
    exit: {
        opacity: 0,
        y: -6,
        transition: { duration: 0.12 },
    },
};

export function TutorialModal({ isOpen, onClose, onComplete }: TutorialModalProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const isMobile = useIsMobile();
    const touchStartX = useRef(0);

    useEffect(() => {
        if (isOpen) setCurrentStep(0);
    }, [isOpen]);

    const handleNext = useCallback(() => {
        if (currentStep < TOTAL_STEPS - 1) {
            setCurrentStep(s => s + 1);
        } else {
            onComplete();
            onClose();
        }
    }, [currentStep, onComplete, onClose]);

    const handlePrev = useCallback(() => {
        if (currentStep > 0) setCurrentStep(s => s - 1);
    }, [currentStep]);

    // Keyboard: ArrowRight / ArrowLeft / Enter / Escape
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowRight':
                case 'Enter':
                    e.preventDefault();
                    handleNext();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    handlePrev();
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, handleNext, handlePrev, onClose]);

    if (!isOpen) return null;

    const isLastStep = currentStep === TOTAL_STEPS - 1;

    // Mobile swipe handlers (content zone)
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        const diff = e.changedTouches[0].clientX - touchStartX.current;
        if (diff < -SWIPE_THRESHOLD) handleNext();
        else if (diff > SWIPE_THRESHOLD) handlePrev();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center md:p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/85 backdrop-blur-md"
                onClick={onClose}
            />

            {/* ── Cinema Frame ── */}
            <div
                className={clsx(
                    'relative w-full flex flex-col overflow-hidden bg-background',
                    // Mobile: full-screen
                    'h-full',
                    // Desktop: fixed cinema dimensions
                    'md:h-[520px] md:max-w-2xl md:rounded-2xl md:border md:border-white/10 md:shadow-2xl'
                )}
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-20 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Close tutorial"
                >
                    <X size={18} />
                </button>

                {/* ── Simulation Zone ── */}
                <div className="relative flex-none basis-[60%] md:flex-1 md:basis-0 overflow-hidden bg-black">
                    <TutorialSimulation
                        className="!rounded-none !border-0 !shadow-none !min-h-0 !h-full"
                    />

                    {/* Dim overlay on steps 1-3 */}
                    <AnimatePresence>
                        {currentStep > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="absolute inset-0 bg-black/35 backdrop-blur-[2px] pointer-events-none"
                            />
                        )}
                    </AnimatePresence>

                    {/* Bottom fade into content zone */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                </div>

                {/* ── Content Zone ── */}
                <div
                    className="flex-1 md:flex-none md:h-[170px] overflow-hidden bg-background"
                    onTouchStart={isMobile ? handleTouchStart : undefined}
                    onTouchEnd={isMobile ? handleTouchEnd : undefined}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            variants={contentVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="h-full"
                        >
                            {currentStep === 0 && <WelcomeStep />}
                            {currentStep === 1 && <TwoModesStep />}
                            {currentStep === 2 && <LifelinesStep />}
                            {currentStep === 3 && <ShopStep />}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* ── Nav Bar (pinned) ── */}
                <div className="flex-none h-[52px] flex items-center justify-between px-4 md:px-6 border-t border-white/5 bg-background">
                    {/* Back — always rendered, invisible on step 0 */}
                    <button
                        onClick={handlePrev}
                        className={clsx(
                            'flex items-center gap-1 px-3 h-[36px] rounded-lg text-sm font-medium transition-all',
                            currentStep === 0
                                ? 'opacity-0 pointer-events-none'
                                : 'text-muted hover:text-text hover:bg-white/5'
                        )}
                        aria-label="Previous step"
                    >
                        <ChevronLeft size={16} />
                        Back
                    </button>

                    {/* Step dots */}
                    <div className="flex gap-1.5">
                        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                            <div
                                key={i}
                                className={clsx(
                                    'rounded-full transition-all duration-300',
                                    i === currentStep
                                        ? 'w-5 h-1.5 bg-primary'
                                        : 'w-1.5 h-1.5 bg-white/20'
                                )}
                            />
                        ))}
                    </div>

                    {/* Next / Let's Play — fixed size, never moves */}
                    <button
                        onClick={handleNext}
                        className={clsx(
                            'w-[120px] h-[44px] rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all',
                            isLastStep
                                ? 'bg-primary text-white hover:brightness-110'
                                : 'bg-white/10 text-text hover:bg-white/15 border border-white/10'
                        )}
                    >
                        {isLastStep ? "Let's Play!" : 'Next'}
                        {!isLastStep && <ChevronRight size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Step 0: Welcome ── */
function WelcomeStep() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <h1
                className="text-3xl md:text-4xl font-black tracking-wider uppercase text-text"
                style={{ fontFamily: 'var(--font-display)' }}
            >
                Guess The Game
            </h1>
            <p className="text-muted text-sm md:text-base mt-2 max-w-xs">
                4000+ games. Wrong guesses reveal more.
            </p>
        </div>
    );
}

/* ── Step 1: Two Modes ── */
function TwoModesStep() {
    return (
        <div className="h-full flex flex-col justify-center px-5 md:px-8">
            <h2
                className="text-lg md:text-xl font-bold tracking-wide uppercase text-text mb-4"
                style={{ fontFamily: 'var(--font-display)' }}
            >
                Two Ways to Play
            </h2>
            <div className="flex gap-3">
                <div className="flex-1 glass-panel-soft rounded-xl p-3 md:p-4">
                    <div className="text-base md:text-lg font-bold text-primary">Standard</div>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                        Relaxed. No penalties. Play at your own pace, progress saved automatically.
                    </p>
                </div>
                <div className="flex-1 glass-panel-soft rounded-xl p-3 md:p-4">
                    <div className="text-base md:text-lg font-bold text-accent">Endless</div>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                        Roguelike. 5 lives. Score 5/4/3/2/1 points by guess number.
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ── Step 2: Lifelines ── */
function LifelinesStep() {
    return (
        <div className="h-full flex flex-col justify-center px-5 md:px-8">
            <h2
                className="text-lg md:text-xl font-bold tracking-wide uppercase text-text mb-4 text-center"
                style={{ fontFamily: 'var(--font-display)' }}
            >
                Lifelines
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-2.5 justify-center">
                {lifelines.map((l) => (
                    <div key={l.name} className="flex items-center gap-1.5">
                        <l.icon size={16} className={l.color} />
                        <span className="text-xs text-muted font-medium">{l.name}</span>
                    </div>
                ))}
            </div>
            <p className="text-[11px] text-white/30 text-center mt-3">
                Use lifelines in Endless Mode to survive tough rounds
            </p>
        </div>
    );
}

/* ── Step 3: Shop + Go ── */
function ShopStep() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <h2
                className="text-lg md:text-xl font-bold tracking-wide uppercase text-text mb-3"
                style={{ fontFamily: 'var(--font-display)' }}
            >
                The Shop
            </h2>
            <p className="text-sm text-muted max-w-sm leading-relaxed">
                Every <span className="text-primary font-semibold">5 levels</span> in Endless Mode,
                spend points on power-ups to extend your run.
            </p>
        </div>
    );
}

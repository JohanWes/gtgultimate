import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import {
    Gamepad2,
    BookOpen,
    Search,
    Flame,
    LifeBuoy,
    ShoppingCart,
    X,
    Sparkles,
    Target,
    Trophy,
    Coins,
    Eye,
    SkipForward,
    Shuffle,
    HelpCircle,
    ZoomOut,
    FileText
} from 'lucide-react';
import { clsx } from 'clsx';
import { TutorialSimulation } from './TutorialSimulation';

interface MobileTutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

interface TutorialStep {
    icon: React.ReactNode;
    title: string;
    content: React.ReactNode;
    accentColor: string;
}

const tutorialSteps: TutorialStep[] = [
    {
        icon: <Gamepad2 size={32} />,
        title: "Welcome!",
        accentColor: "from-purple-500 to-pink-500",
        content: (
            <div className="space-y-4">
                <p className="text-base text-gray-300">
                    Identify games from their screenshots.
                </p>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                    <Sparkles className="text-yellow-400 flex-shrink-0" size={20} />
                    <p className="text-xs text-gray-400">
                        Over <span className="text-white font-bold">2600+ games</span>!
                    </p>
                </div>
            </div>
        )
    },
    {
        icon: <BookOpen size={32} />,
        title: "Standard Mode",
        accentColor: "from-blue-500 to-cyan-500",
        content: (
            <div className="space-y-3 px-1">
                <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg border border-white/5">
                    <Target className="text-blue-400 flex-shrink-0" size={18} />
                    <div className="text-left">
                        <p className="text-white font-medium text-sm">Relaxed Play</p>
                        <p className="text-xs text-gray-400">No timers, no pressure</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg border border-white/5">
                    <Trophy className="text-yellow-400 flex-shrink-0" size={18} />
                    <div className="text-left">
                        <p className="text-white font-medium text-sm">Auto-Save</p>
                        <p className="text-xs text-gray-400">Continue anytime</p>
                    </div>
                </div>
            </div>
        )
    },
    {
        icon: <Search size={32} />,
        title: "Progressive Reveal",
        accentColor: "from-green-500 to-emerald-500",
        content: (
            <div className="space-y-2">
                <p className="text-gray-300 text-xs">
                    Wrong guesses reveal more of the image!
                </p>
                <div className="rounded-lg overflow-hidden border border-white/10">
                    <TutorialSimulation />
                </div>
            </div>
        )
    },
    {
        icon: <Flame size={32} />,
        title: "Endless Mode",
        accentColor: "from-orange-500 to-red-500",
        content: (
            <div className="space-y-4">
                <div className="p-3 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-xl border border-red-500/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-xl">
                            💀
                        </div>
                        <div className="text-left">
                            <p className="text-white font-bold text-sm">5 Violations = Over</p>
                            <p className="text-[10px] text-red-400">Survival of the fittest</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-5 gap-1 text-center">
                    {[5, 4, 3, 2, 1].map((pts, idx) => (
                        <div key={pts} className="p-1.5 bg-white/5 rounded">
                            <p className="text-sm font-bold text-orange-400">+{pts}</p>
                            <p className="text-[8px] text-gray-500">G{idx + 1}</p>
                        </div>
                    ))}
                </div>
            </div>
        )
    },
    {
        icon: <LifeBuoy size={32} />,
        title: "Lifelines",
        accentColor: "from-cyan-500 to-blue-500",
        content: (
            <div className="grid grid-cols-2 gap-2 text-left">
                <div className="p-2 bg-white/5 rounded flex items-center gap-2">
                    <Eye className="text-purple-400" size={14} />
                    <span className="text-[10px] text-white">Cover Peek</span>
                </div>
                <div className="p-2 bg-white/5 rounded flex items-center gap-2">
                    <SkipForward className="text-red-400" size={14} />
                    <span className="text-[10px] text-white">Skip Level</span>
                </div>
                <div className="p-2 bg-white/5 rounded flex items-center gap-2">
                    <Shuffle className="text-purple-400" size={14} />
                    <span className="text-[10px] text-white">Anagram</span>
                </div>
                <div className="p-2 bg-white/5 rounded flex items-center gap-2">
                    <HelpCircle className="text-green-400" size={14} />
                    <span className="text-[10px] text-white">Consultant</span>
                </div>
                <div className="p-2 bg-white/5 rounded flex items-center gap-2">
                    <Gamepad2 className="text-yellow-400" size={14} />
                    <span className="text-[10px] text-white">Double Trouble</span>
                </div>
                <div className="p-2 bg-white/5 rounded flex items-center gap-2">
                    <ZoomOut className="text-blue-400" size={14} />
                    <span className="text-[10px] text-white">Zoom Out</span>
                </div>
                <div className="p-2 bg-white/5 rounded flex items-center gap-2 col-span-2">
                    <FileText className="text-green-400" size={14} />
                    <span className="text-[10px] text-white">Synopsis</span>
                </div>
            </div>
        )
    },
    {
        icon: <ShoppingCart size={32} />,
        title: "The Shop",
        accentColor: "from-yellow-500 to-amber-500",
        content: (
            <div className="space-y-4">
                <p className="text-xs text-gray-400">
                    Appears every <span className="text-yellow-400 font-bold">5 levels</span> in Endless Mode.
                </p>
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-lg border border-yellow-500/20">
                    <Coins className="text-yellow-400" size={24} />
                    <div className="text-left">
                        <p className="text-white font-bold text-sm">Buy Power-ups</p>
                        <p className="text-[10px] text-gray-400">Spend points to survive</p>
                    </div>
                </div>
            </div>
        )
    }
];

const swipeThreshold = 50;

export function MobileTutorialModal({ isOpen, onClose, onComplete }: MobileTutorialModalProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setCurrentStep(0);
            setDirection(0);
        }
    }, [isOpen]);

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const { offset: { x } } = info;

        if (x < -swipeThreshold && currentStep < tutorialSteps.length - 1) {
            // Swiped left -> next
            setDirection(1);
            setCurrentStep(prev => prev + 1);
        } else if (x > swipeThreshold && currentStep > 0) {
            // Swiped right -> prev
            setDirection(-1);
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleComplete = () => {
        onComplete();
        onClose();
    };

    if (!isOpen) return null;

    const step = tutorialSteps[currentStep];
    const isLastStep = currentStep === tutorialSteps.length - 1;

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? '100%' : '-100%',
            opacity: 0,
            scale: 0.95
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1,
            transition: {
                type: "spring" as const,
                stiffness: 300,
                damping: 30
            }
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? '100%' : '-100%',
            opacity: 0,
            scale: 0.95,
            transition: {
                type: "spring" as const,
                stiffness: 300,
                damping: 30
            }
        })
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-xl">
            {/* Close button */}
            <div className="absolute top-4 right-4 z-30">
                <button
                    onClick={onClose}
                    className="p-2 text-white/50 hover:text-white"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Swipeable Content Area */}
            <div className="flex-1 relative w-full overflow-hidden flex flex-col justify-center">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={currentStep}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={handleDragEnd}
                        className="absolute inset-0 px-6 py-4 flex flex-col items-center justify-center text-center w-full h-full cursor-grab active:cursor-grabbing"
                    >
                        {/* Special full-height layout for simulation step (index 2) */}
                        {currentStep === 2 ? (
                            <div className="flex-1 flex flex-col w-full max-w-md px-2">
                                <p className="text-gray-300 text-xs text-center mb-2">
                                    Wrong guesses reveal more of the image!
                                </p>
                                <div className="flex-1 rounded-lg overflow-hidden border border-white/10 min-h-0">
                                    <TutorialSimulation />
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Icon Bubble */}
                                <div className={clsx(
                                    "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white mb-4 shadow-2xl relative",
                                    step.accentColor
                                )}>
                                    <div className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse"></div>
                                    {step.icon}
                                </div>

                                {/* Title */}
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight relative">
                                    {step.title}
                                    <span className={clsx("absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full opacity-50 bg-gradient-to-r", step.accentColor)}></span>
                                </h2>

                                {/* Content */}
                                <div className="w-full max-w-sm">
                                    {step.content}
                                </div>

                                {/* Tap to finish on last step */}
                                {isLastStep && (
                                    <button
                                        onClick={handleComplete}
                                        className="mt-6 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full shadow-lg flex items-center gap-2 active:scale-95 transition-transform"
                                    >
                                        Let's Play <Sparkles size={18} />
                                    </button>
                                )}
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Dot indicators at bottom */}
            <div className="pb-8 pt-4 z-20 flex justify-center gap-2">
                {tutorialSteps.map((_, idx) => (
                    <div
                        key={idx}
                        className={clsx(
                            "rounded-full transition-all duration-300",
                            idx === currentStep
                                ? "w-6 h-2 bg-white"
                                : "w-2 h-2 bg-white/30"
                        )}
                    />
                ))}
            </div>
        </div>
    );
}

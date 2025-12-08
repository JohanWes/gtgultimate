import { useState, useEffect } from 'react';
import {
    Gamepad2,
    BookOpen,
    Search,
    Flame,
    LifeBuoy,
    ShoppingCart,
    ChevronLeft,
    ChevronRight,
    X,
    Sparkles,
    Target,
    Trophy,
    HelpCircle,
    Shuffle,
    ZoomOut,
    SkipForward,
    Coins,
    Eye,
    FileText
} from 'lucide-react';
import { clsx } from 'clsx';
import { TutorialSimulation } from './TutorialSimulation';

interface TutorialModalProps {
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
        icon: <Gamepad2 size={48} />,
        title: "Welcome to Guess The Game Ultimate!",
        accentColor: "from-purple-500 to-pink-500",
        content: (
            <div className="space-y-4">
                <p className="text-lg text-gray-300">
                    Test your gaming knowledge by identifying games from their screenshots.
                </p>
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                    <Sparkles className="text-yellow-400 flex-shrink-0" size={24} />
                    <p className="text-sm text-gray-400">
                        Over <span className="text-white font-bold">2600+ games</span> to discover across all genres and eras!
                    </p>
                </div>
                <p className="text-gray-400 text-sm">
                    This quick guide will show you how to play both game modes.
                </p>
            </div>
        )
    },
    {
        icon: <BookOpen size={48} />,
        title: "Standard Mode",
        accentColor: "from-blue-500 to-cyan-500",
        content: (
            <div className="space-y-4">
                <p className="text-gray-300">
                    The relaxed way to play – no pressure, just fun!
                </p>
                <div className="grid gap-3">
                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                        <Target className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="text-white font-medium">Play at Your Own Pace</p>
                            <p className="text-sm text-gray-400">No time limits, no penalties</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                        <Trophy className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="text-white font-medium">Progress Saved Automatically</p>
                            <p className="text-sm text-gray-400">Come back anytime and continue</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                        <Gamepad2 className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="text-white font-medium">Jump to Any Level</p>
                            <p className="text-sm text-gray-400">Use the sidebar to select levels</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        icon: <Search size={48} />,
        title: "Progressive Reveal System",
        accentColor: "from-green-500 to-emerald-500",
        content: (
            <div className="space-y-4">
                <p className="text-gray-300 text-sm">
                    Each game starts with a zoomed-in screenshot. Wrong guesses zoom out and reveal more of the image!
                </p>

                {/* New Simulation Component */}
                <div className="mt-2 -mx-2">
                    <TutorialSimulation />
                </div>
            </div>
        )
    },
    {
        icon: <Flame size={48} />,
        title: "Endless Mode",
        accentColor: "from-orange-500 to-red-500",
        content: (
            <div className="space-y-4">
                <p className="text-gray-300">
                    The ultimate challenge – roguelike stakes with permadeath!
                </p>
                <div className="p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-xl border border-red-500/20">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                            <span className="text-2xl">💀</span>
                        </div>
                        <div>
                            <p className="text-white font-bold">5 Wrong Guesses = Game Over</p>
                            <p className="text-sm text-red-400">Your run ends, but glory awaits...</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center">
                    {[5, 4, 3, 2, 1].map((pts, idx) => (
                        <div key={pts} className="p-2 bg-white/5 rounded-lg">
                            <p className="text-lg font-bold text-orange-400">+{pts}</p>
                            <p className="text-[10px] text-gray-500">Guess {idx + 1}</p>
                        </div>
                    ))}
                </div>
                <p className="text-sm text-gray-400 text-center">
                    Points earned based on which guess gets it right
                </p>
            </div>
        )
    },
    {
        icon: <LifeBuoy size={48} />,
        title: "Lifelines",
        accentColor: "from-cyan-500 to-blue-500",
        content: (
            <div className="space-y-3">
                <p className="text-gray-300 text-sm">
                    Powerful tools to help you survive in Endless Mode:
                </p>
                <div className="grid gap-2">
                    <div className="flex items-center gap-3 p-2.5 bg-white/5 rounded-lg">
                        <Eye className="text-purple-400 flex-shrink-0" size={18} />
                        <div className="flex-1">
                            <span className="text-white font-medium text-sm">Cover Peek</span>
                            <span className="text-gray-500 text-xs ml-2">– Shows cover art briefly</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 bg-white/5 rounded-lg">
                        <SkipForward className="text-red-400 flex-shrink-0" size={18} />
                        <div className="flex-1">
                            <span className="text-white font-medium text-sm">Skip</span>
                            <span className="text-gray-500 text-xs ml-2">– Move to next (0 pts)</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 bg-white/5 rounded-lg">
                        <Shuffle className="text-purple-400 flex-shrink-0" size={18} />
                        <div className="flex-1">
                            <span className="text-white font-medium text-sm">Anagram</span>
                            <span className="text-gray-500 text-xs ml-2">– Scrambled title hint</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 bg-white/5 rounded-lg">
                        <HelpCircle className="text-green-400 flex-shrink-0" size={18} />
                        <div className="flex-1">
                            <span className="text-white font-medium text-sm">Consultant</span>
                            <span className="text-gray-500 text-xs ml-2">– Multiple choice (1 correct, 3 wrong)</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 bg-white/5 rounded-lg">
                        <Gamepad2 className="text-yellow-400 flex-shrink-0" size={18} />
                        <div className="flex-1">
                            <span className="text-white font-medium text-sm">Double Trouble</span>
                            <span className="text-gray-500 text-xs ml-2">– Blend 2 games, guess either</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 bg-white/5 rounded-lg">
                        <ZoomOut className="text-blue-400 flex-shrink-0" size={18} />
                        <div className="flex-1">
                            <span className="text-white font-medium text-sm">Zoom Out</span>
                            <span className="text-gray-500 text-xs ml-2">– Reveal full image</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 bg-white/5 rounded-lg">
                        <FileText className="text-green-400 flex-shrink-0" size={18} />
                        <div className="flex-1">
                            <span className="text-white font-medium text-sm">Synopsis</span>
                            <span className="text-gray-500 text-xs ml-2">– Read game summary</span>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        icon: <ShoppingCart size={48} />,
        title: "The Shop",
        accentColor: "from-yellow-500 to-amber-500",
        content: (
            <div className="space-y-4">
                <p className="text-gray-300">
                    Every <span className="text-yellow-400 font-bold">5 levels</span> in Endless Mode, the shop appears!
                </p>
                <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-xl border border-yellow-500/20">
                    <div className="flex items-center gap-3 mb-3">
                        <Coins className="text-yellow-400" size={28} />
                        <div>
                            <p className="text-white font-bold">Spend Points, Gain Power</p>
                            <p className="text-sm text-gray-400">Refill lifelines to extend your run</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <span className="text-xl">⚠️</span>
                    <div>
                        <p className="text-orange-300 font-medium text-sm">Greed is Good</p>
                        <p className="text-xs text-gray-400">
                            Risky choice: Get +10 points immediately, but locks all other shop items!
                        </p>
                    </div>
                </div>
                <p className="text-sm text-gray-400 text-center">
                    Manage your resources wisely – every point counts!
                </p>
            </div>
        )
    }
];

export function TutorialModal({ isOpen, onClose, onComplete }: TutorialModalProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState<'next' | 'prev'>('next');
    const [isAnimating, setIsAnimating] = useState(false);

    // Reset to first step when modal opens
    useEffect(() => {
        if (isOpen) {
            setCurrentStep(0);
            setDirection('next');
        }
    }, [isOpen]);

    const handleNext = () => {
        if (isAnimating) return;

        if (currentStep < tutorialSteps.length - 1) {
            setDirection('next');
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentStep(prev => prev + 1);
                setIsAnimating(false);
            }, 150);
        } else {
            onComplete();
            onClose();
        }
    };

    const handlePrev = () => {
        if (isAnimating || currentStep === 0) return;

        setDirection('prev');
        setIsAnimating(true);
        setTimeout(() => {
            setCurrentStep(prev => prev - 1);
            setIsAnimating(false);
        }, 150);
    };

    const handleStepClick = (index: number) => {
        if (isAnimating || index === currentStep) return;

        setDirection(index > currentStep ? 'next' : 'prev');
        setIsAnimating(true);
        setTimeout(() => {
            setCurrentStep(index);
            setIsAnimating(false);
        }, 150);
    };

    if (!isOpen) return null;

    const step = tutorialSteps[currentStep];
    const isLastStep = currentStep === tutorialSteps.length - 1;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/85 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                {/* Accent gradient bar */}
                <div className={clsx(
                    "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r transition-all duration-500",
                    step.accentColor
                )} />

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                    <X size={20} />
                </button>

                {/* Content */}
                <div className="p-4 sm:p-6 pt-12 sm:pt-8 overflow-y-auto custom-scrollbar">
                    {/* Icon and Title */}
                    <div className={clsx(
                        "flex flex-col items-center text-center mb-6 transition-all duration-300",
                        isAnimating && (direction === 'next' ? "opacity-0 -translate-x-4" : "opacity-0 translate-x-4")
                    )}>
                        <div className={clsx(
                            "w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white mb-4 shadow-lg",
                            step.accentColor
                        )}>
                            {step.icon}
                        </div>
                        <h2 className="text-2xl font-bold text-white">{step.title}</h2>
                    </div>

                    {/* Step Content */}
                    <div className={clsx(
                        "min-h-[240px] transition-all duration-300",
                        isAnimating && (direction === 'next' ? "opacity-0 translate-x-8" : "opacity-0 -translate-x-8")
                    )}>
                        {step.content}
                    </div>

                    {/* Step Indicators */}
                    <div className="flex justify-center gap-2 mt-6 mb-4">
                        {tutorialSteps.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => handleStepClick(index)}
                                className={clsx(
                                    "w-2.5 h-2.5 rounded-full transition-all duration-300",
                                    index === currentStep
                                        ? "bg-white scale-125"
                                        : "bg-white/30 hover:bg-white/50"
                                )}
                            />
                        ))}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between gap-4 mt-4">
                        <button
                            onClick={handlePrev}
                            disabled={currentStep === 0}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all",
                                currentStep === 0
                                    ? "text-gray-600 cursor-not-allowed"
                                    : "text-gray-300 hover:text-white hover:bg-white/10"
                            )}
                        >
                            <ChevronLeft size={20} />
                            <span>Back</span>
                        </button>

                        <span className="text-sm text-gray-500">
                            {currentStep + 1} / {tutorialSteps.length}
                        </span>

                        <button
                            onClick={handleNext}
                            className={clsx(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all",
                                isLastStep
                                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:scale-105 shadow-lg shadow-green-500/25"
                                    : "bg-white text-black hover:scale-105"
                            )}
                        >
                            <span>{isLastStep ? "Let's Play!" : "Next"}</span>
                            {!isLastStep && <ChevronRight size={20} />}
                            {isLastStep && <Sparkles size={20} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

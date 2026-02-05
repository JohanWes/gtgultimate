import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, useReducedMotion } from 'framer-motion';
import { clsx } from 'clsx';
import { getShopItems } from '../utils/endlessUtils';
import { buildTransition, motionDurations } from '../utils/motion';

interface ShopModalProps {
    score: number;
    onBuy: (itemId: string, cost?: number) => void;
    onContinue: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ score, onBuy, onContinue }) => {
    const items = getShopItems();
    const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());
    const [discountedItemIds, setDiscountedItemIds] = useState<Set<string>>(new Set());
    const shouldReduceMotion = useReducedMotion();

    const modalRef = React.useRef<HTMLDivElement>(null);

    // Randomize discounts on mount
    // Randomize discounts on mount
    useEffect(() => {
        const eligibleItems = items.filter(i => i.id !== 'greed');

        // Fisher-Yates shuffle
        const shuffled = [...eligibleItems];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const selected = new Set(shuffled.slice(0, 2).map(i => i.id));
        setDiscountedItemIds(selected);
    }, []);

    useEffect(() => {
        // Grand entrance effect
        const duration = 3000;
        const end = Date.now() + duration;

        const getOrigins = () => {
            if (!modalRef.current) return { left: 0, right: 1, top: 0.6 };
            const rect = modalRef.current.getBoundingClientRect();
            return {
                left: rect.left / window.innerWidth,
                right: rect.right / window.innerWidth,
                top: (rect.top + rect.height / 2) / window.innerHeight
            };
        };

        // 1. Central explosion
        confetti({
            particleCount: 75,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#FFA500', '#FFFFFF', '#FF0000'],
            zIndex: 55
        });

        // 2. Side cannons
        (function frame() {
            const origins = getOrigins();

            confetti({
                particleCount: 2,
                angle: 135, // Angle pointing slightly up and out from right side of modal (relative to origin)
                spread: 55,
                origin: { x: origins.left, y: origins.top }, // Left side of modal
                colors: ['#FFD700', '#FFA500'],
                zIndex: 55
            });

            confetti({
                particleCount: 2,
                angle: 40,
                spread: 55,
                origin: { x: origins.right, y: origins.top },
                colors: ['#FFD700', '#FFA500'],
                zIndex: 55
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }, []);

    // Check if "Greed is Good" has been purchased
    const greedPurchased = purchasedItems.has('greed');
    // Check if any other item has been purchased
    const otherItemPurchased = Array.from(purchasedItems).some(id => id !== 'greed');

    const handleBuy = (itemId: string, cost: number) => {
        // Mark item as purchased
        setPurchasedItems(prev => new Set(prev).add(itemId));
        // Call the original onBuy handler
        onBuy(itemId, cost);
    };

    const overlayTransition = buildTransition(motionDurations.standard, !!shouldReduceMotion);
    const panelTransition = buildTransition(motionDurations.standard, !!shouldReduceMotion);

    return (
        <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={overlayTransition}
        >
            <motion.div
                ref={modalRef}
                className="glass-panel-strong rounded-2xl p-6 max-w-2xl w-full animate-in fade-in zoom-in-95 relative z-[60]"
                initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.96, y: shouldReduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.98, y: shouldReduceMotion ? 0 : 6 }}
                transition={panelTransition}
            >
                <h2 className="text-3xl font-bold text-white mb-2 text-center">The Shop</h2>
                <p className="text-muted text-center mb-8">Spend your hard-earned points to survive longer.</p>

                <div className="flex justify-center mb-8">
                    <div className="glass-panel-soft px-6 py-3 rounded-xl border border-yellow-500/30">
                        <span className="text-muted mr-2">Current Score:</span>
                        <span className="text-2xl font-bold text-yellow-400">{score}</span>
                    </div>
                </div>

                {greedPurchased && (
                    <div className="mb-4 p-3 glass-panel-soft border border-orange-500/40 rounded-xl bg-orange-500/10">
                        <p className="text-orange-300 text-sm text-center font-medium">
                            ⚠️ You chose Greed is Good - all other shop items are now unavailable!
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {items.map((item) => {
                        const isDiscounted = discountedItemIds.has(item.id);
                        const originalCost = item.cost;
                        const finalCost = isDiscounted ? originalCost - 1 : originalCost;

                        const canAfford = score >= finalCost;
                        const isGreed = item.id === 'greed';
                        const alreadyPurchased = purchasedItems.has(item.id);

                        // Determine if item should be disabled
                        const isDisabled =
                            alreadyPurchased ||
                            !canAfford ||
                            (isGreed && otherItemPurchased) ||
                            (!isGreed && greedPurchased);

                        // Enhanced description for Greed is Good
                        const description = isGreed
                            ? `${item.description} ⚠️ WARNING: Choosing this will lock out all other shop items!`
                            : item.description;

                        return (
                            <div
                                key={item.id}
                                className={clsx(
                                    "glass-panel-soft border rounded-xl p-4 flex flex-col transition-all duration-200 relative overflow-hidden",
                                    isDisabled && !canAfford ? 'opacity-45' : isDisabled ? 'opacity-55' : 'opacity-100',
                                    isGreed && !isDisabled ? 'border-orange-500/50' : 'border-white/10',
                                    !isDisabled && "hover:border-white/20 hover:brightness-105"
                                )}
                            >
                                {isDiscounted && !isDisabled && !alreadyPurchased && (
                                    <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-bl-lg shadow-md animate-pulse">
                                        Discount!
                                    </div>
                                )}
                                <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                                <p className={`text-sm mb-4 flex-grow ${isGreed ? 'text-orange-300' : 'text-muted'}`}>
                                    {description}
                                </p>
                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex flex-col">
                                        {isDiscounted ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted/60 line-through">{originalCost} pts</span>
                                                <span className="font-bold text-green-400">{finalCost} pts</span>
                                            </div>
                                        ) : (
                                            <span className={`font-bold ${item.cost < 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                {item.cost < 0 ? `+${Math.abs(item.cost)}` : item.cost} pts
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleBuy(item.id, finalCost)}
                                        disabled={isDisabled}
                                        className={clsx(
                                            "px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ui-focus-ring",
                                            !isDisabled
                                                ? 'bg-primary text-onPrimary cursor-pointer hover:brightness-110 active:scale-[0.98]'
                                                : 'bg-surface/40 text-muted/60 border border-white/10 cursor-not-allowed'
                                        )}
                                    >
                                        {alreadyPurchased ? 'Purchased' : 'Buy'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={onContinue}
                        className="px-8 py-3 bg-success hover:brightness-110 text-onPrimary font-bold rounded-xl transition-all duration-200 text-lg active:scale-[0.98] ui-focus-ring"
                    >
                        Continue Run
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

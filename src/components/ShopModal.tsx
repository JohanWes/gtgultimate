import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { getShopItems } from '../utils/endlessUtils';

interface ShopModalProps {
    score: number;
    onBuy: (itemId: string, cost?: number) => void;
    onContinue: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ score, onBuy, onContinue }) => {
    const items = getShopItems();
    const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());
    const [discountedItemIds, setDiscountedItemIds] = useState<Set<string>>(new Set());

    const modalRef = React.useRef<HTMLDivElement>(null);

    // Randomize discounts on mount
    useEffect(() => {
        const eligibleItems = items.filter(i => i.id !== 'greed');
        const shuffled = [...eligibleItems].sort(() => 0.5 - Math.random());
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
            zIndex: 10000 // Higher than modal
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
                zIndex: 10000
            });

            confetti({
                particleCount: 2,
                angle: 40,
                spread: 55,
                origin: { x: origins.right, y: origins.top },
                colors: ['#FFD700', '#FFA500'],
                zIndex: 10000
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

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-40 p-4">
            <div ref={modalRef} className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-2xl w-full shadow-2xl">
                <h2 className="text-3xl font-bold text-white mb-2 text-center">The Shop</h2>
                <p className="text-gray-400 text-center mb-8">Spend your hard-earned points to survive longer.</p>

                <div className="flex justify-center mb-8">
                    <div className="bg-gray-800 px-6 py-3 rounded-lg border border-yellow-500/30">
                        <span className="text-gray-400 mr-2">Current Score:</span>
                        <span className="text-2xl font-bold text-yellow-400">{score}</span>
                    </div>
                </div>

                {greedPurchased && (
                    <div className="mb-4 p-3 bg-orange-900/30 border border-orange-500/50 rounded-lg">
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
                                className={`bg-gray-800 border rounded-lg p-4 flex flex-col transition-opacity ${isDisabled && !canAfford ? 'opacity-40' :
                                    isDisabled ? 'opacity-50' : 'opacity-100'
                                    } ${isGreed && !isDisabled ? 'border-orange-500/50' : 'border-gray-700'
                                    } relative overflow-hidden`}
                            >
                                {isDiscounted && !isDisabled && !alreadyPurchased && (
                                    <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-bl-lg shadow-md animate-pulse">
                                        Discount!
                                    </div>
                                )}
                                <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                                <p className={`text-sm mb-4 flex-grow ${isGreed ? 'text-orange-300' : 'text-gray-400'
                                    }`}>
                                    {description}
                                </p>
                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex flex-col">
                                        {isDiscounted ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500 line-through">{originalCost} pts</span>
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
                                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${!isDisabled
                                            ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                            }`}
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
                        className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors text-lg"
                    >
                        Continue Run
                    </button>
                </div>
            </div>
        </div>
    );
};

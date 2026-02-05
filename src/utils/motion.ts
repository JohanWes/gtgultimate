import type { Transition } from 'framer-motion';

export const motionDurations = {
    fast: 0.14,
    standard: 0.22,
    emphasis: 0.3
} as const;

export const motionEasing = {
    standard: [0.16, 1, 0.3, 1] as const,
    emphasis: [0.22, 1, 0.36, 1] as const
};

export const buildTransition = (
    duration: number,
    reduced: boolean,
    ease: readonly [number, number, number, number] = motionEasing.standard
): Transition => ({
    duration: reduced ? 0.01 : duration,
    ease
});

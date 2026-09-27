import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface PageTransitionProps {
    children: ReactNode;
    className?: string;
}

// Opacity-only fade-in on mount. No exit animation: the outgoing page unmounts
// immediately so a mode switch never waits on it.
export const PageTransition = ({ children, className }: PageTransitionProps) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

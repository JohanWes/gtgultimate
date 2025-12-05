import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface PageTransitionProps {
    children: ReactNode;
    className?: string;
}

const pageVariants = {
    initial: {
        opacity: 0,
        filter: "blur(10px)"
    },
    in: {
        opacity: 1,
        filter: "blur(0px)"
    },
    out: {
        opacity: 0,
        filter: "blur(10px)"
    }
};

export const PageTransition = ({ children, className }: PageTransitionProps) => {
    return (
        <motion.div
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={{
                type: "tween",
                ease: "easeInOut",
                duration: 0.1
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

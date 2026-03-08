import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const pageVariants = {
    initial: { opacity: 0, y: 10 },
    enter: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
};

const pageTransition = {
    duration: 0.25,
    ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
};

const PageTransition = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={location.pathname}
                initial="initial"
                animate="enter"
                exit="exit"
                variants={pageVariants}
                transition={pageTransition}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
};

export default PageTransition;

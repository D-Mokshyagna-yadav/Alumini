/**
 * Framer Motion Animation Configuration
 * Optimized for GPU acceleration and performance
 */

import { Variants } from 'framer-motion';
import { getAnimationConfig } from './performance';

const animConfig = getAnimationConfig();

/**
 * Fade in animation with GPU acceleration
 */
export const fadeInVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: animConfig.enableAnimations ? animConfig.durationFast : 0,
      ease: 'easeOut',
    },
  },
};

/**
 * Scale in animation with GPU acceleration
 */
export const scaleInVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: animConfig.enableAnimations ? animConfig.durationFast : 0,
      ease: 'easeOut',
    },
  },
};

/**
 * Slide in from left with GPU acceleration
 */
export const slideInLeftVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -30,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: animConfig.enableAnimations ? animConfig.durationMedium : 0,
      ease: 'easeOut',
    },
  },
};

/**
 * Slide in from right with GPU acceleration
 */
export const slideInRightVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 30,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: animConfig.enableAnimations ? animConfig.durationMedium : 0,
      ease: 'easeOut',
    },
  },
};

/**
 * Slide in from bottom with GPU acceleration
 */
export const slideInUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: animConfig.enableAnimations ? animConfig.durationMedium : 0,
      ease: 'easeOut',
    },
  },
};

/**
 * Stagger container for multiple children
 */
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: animConfig.enableAnimations ? 0.1 : 0,
      delayChildren: 0,
    },
  },
};\n\n/**\n * Modal backdrop animation\n */\nexport const modalBackdropVariants: Variants = {\n  hidden: { opacity: 0 },\n  visible: {\n    opacity: 1,\n    transition: {\n      duration: animConfig.enableAnimations ? animConfig.durationFast : 0,\n    },\n  },\n  exit: {\n    opacity: 0,\n    transition: {\n      duration: animConfig.enableAnimations ? animConfig.durationFast : 0,\n    },\n  },\n};\n\n/**\n * Modal content animation (with GPU transform)\n */\nexport const modalContentVariants: Variants = {\n  hidden: {\n    opacity: 0,\n    scale: 0.95,\n    y: 20,\n  },\n  visible: {\n    opacity: 1,\n    scale: 1,\n    y: 0,\n    transition: {\n      type: 'spring',\n      damping: 25,\n      stiffness: 300,\n      duration: animConfig.enableAnimations ? animConfig.durationMedium : 0,\n    },\n  },\n  exit: {\n    opacity: 0,\n    scale: 0.95,\n    y: 20,\n    transition: {\n      duration: animConfig.enableAnimations ? animConfig.durationFast : 0,\n    },\n  },\n};\n\n/**\n * Page transition animation\n */\nexport const pageTransitionVariants: Variants = {\n  hidden: { opacity: 0 },\n  visible: {\n    opacity: 1,\n    transition: {\n      duration: animConfig.enableAnimations ? animConfig.durationFast : 0,\n    },\n  },\n  exit: {\n    opacity: 0,\n    transition: {\n      duration: animConfig.enableAnimations ? animConfig.durationFast : 0,\n    },\n  },\n};\n\n/**\n * Card hover animation with GPU acceleration\n */\nexport const cardHoverVariants: Variants = {\n  initial: { y: 0 },\n  whileHover: animConfig.enableAnimations ? { y: -4 } : {},\n  whileTap: animConfig.enableAnimations ? { scale: 0.98 } : {},\n};\n\n/**\n * Button animation\n */\nexport const buttonVariants: Variants = {\n  initial: { scale: 1 },\n  whileHover: animConfig.enableAnimations ? { scale: 1.02 } : {},\n  whileTap: animConfig.enableAnimations ? { scale: 0.98 } : {},\n};\n\n/**\n * Drawer slide animation\n */\nexport const drawerVariants: Variants = {\n  hidden: { x: '100%' },\n  visible: {\n    x: 0,\n    transition: {\n      type: 'spring',\n      damping: 25,\n      stiffness: 300,\n      duration: animConfig.enableAnimations ? animConfig.durationMedium : 0,\n    },\n  },\n  exit: {\n    x: '100%',\n    transition: {\n      duration: animConfig.enableAnimations ? animConfig.durationFast : 0,\n    },\n  },\n};\n\n/**\n * Dropdown menu animation\n */\nexport const dropdownVariants: Variants = {\n  hidden: {\n    opacity: 0,\n    y: -10,\n    scale: 0.95,\n  },\n  visible: {\n    opacity: 1,\n    y: 0,\n    scale: 1,\n    transition: {\n      type: 'spring',\n      damping: 20,\n      stiffness: 200,\n      duration: animConfig.enableAnimations ? animConfig.durationFast : 0,\n    },\n  },\n  exit: {\n    opacity: 0,\n    y: -10,\n    scale: 0.95,\n    transition: {\n      duration: animConfig.enableAnimations ? animConfig.durationFast : 0,\n    },\n  },\n};\n\n/**\n * Tooltip animation\n */\nexport const tooltipVariants: Variants = {\n  hidden: { opacity: 0, scale: 0.8 },\n  visible: {\n    opacity: 1,\n    scale: 1,\n    transition: {\n      duration: animConfig.enableAnimations ? animConfig.durationFast : 0,\n    },\n  },\n};\n\n/**\n * Animate presence exit - reusable for multiple components\n */\nexport const getExitAnimation = (duration = animConfig.durationFast) => ({\n  opacity: 0,\n  transition: { duration },\n});\n\n/**\n * Get animation based on viewport visibility\n */\nexport const getViewportAnimation = (variants: Variants) => ({\n  initial: 'hidden',\n  whileInView: 'visible',\n  viewport: { once: true, margin: '-100px' },\n  variants,\n});\n
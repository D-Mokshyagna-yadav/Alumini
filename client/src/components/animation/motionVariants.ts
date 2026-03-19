export const modalVariant = {
  hidden: { opacity: 0, scale: 0.98, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as any } },
  exit: { opacity: 0, scale: 0.98, y: 6, transition: { duration: 0.14, ease: [0.22, 0.9, 0.36, 1] as any } },
};

export const feedListVariant = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } }
};

export const feedItemVariant = {
  hidden: { opacity: 0, y: 12, scale: 0.995 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as any } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16 } }
};

export const subtle = {
  fast: { duration: 0.14, ease: [0.22, 0.9, 0.36, 1] as any },
  medium: { duration: 0.26, ease: [0.16, 1, 0.3, 1] as any },
  slow: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as any }
};

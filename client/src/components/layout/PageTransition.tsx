import React from 'react'
import { motion } from 'framer-motion'

const container = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.26, ease: [0.16, 1, 0.3, 1] as any } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18, ease: [0.22, 0.9, 0.36, 1] as any } }
}

export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={container}
      style={{ minHeight: '100%', willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  )
}

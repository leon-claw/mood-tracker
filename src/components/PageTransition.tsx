import React from 'react';
import { motion } from 'motion/react';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  disableInitialAnimation?: boolean;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className,
  disableInitialAnimation = false,
}) => (
  <motion.div
    className={className}
    initial={disableInitialAnimation ? false : { opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
    transition={{ duration: 0.18, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);

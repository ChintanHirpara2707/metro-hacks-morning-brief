// One shared spring + reduced-motion helper for the whole app.
import { useReducedMotion } from 'motion/react';

export const SPRING = { type: 'spring', stiffness: 380, damping: 32 };

export function useMotionPrefs() {
  const reduce = useReducedMotion();
  return { reduce, spring: reduce ? { duration: 0 } : SPRING };
}

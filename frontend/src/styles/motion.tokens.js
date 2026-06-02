/**
 * NOIR Motion Tokens
 *
 * Framer Motion variants used by storefront sections, drawers, and lists.
 * Every variant honors `prefers-reduced-motion: reduce` via the
 * `getMotionVariants(reducedMotion)` selector — when reduced motion is on,
 * variants collapse to opacity-only transitions of duration 0.
 *
 * Consumers should call `useReducedMotion()` from `framer-motion` and pass
 * the result to `getMotionVariants()` (or import the helpers directly).
 *
 * Source spec: .kiro/specs/storefront-experience-redesign/design.md
 *   (Motion section + Accessibility checklist)
 */

import { duration, easing } from './noir.tokens';

const seconds = (ms) => ms / 1000;

// ---------------------------------------------------------------------------
// Full-motion variants
// ---------------------------------------------------------------------------

// Fade in (no translate)
export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: {
    duration: seconds(duration.base),
    ease: easing.standard,
  },
};

// Fade in + slide up from 16px below
export const slideUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 16 },
  transition: {
    duration: seconds(duration.slow),
    ease: easing.standard,
  },
};

// Drawer/sheet slide-in from the right (also used for cart drawer parity)
export const drawerSlide = {
  initial: { opacity: 0, x: '100%' },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: '100%' },
  transition: {
    duration: seconds(duration.base),
    ease: easing.standard,
  },
};

// Stagger container — children animate sequentially with `delay` between them
export const stagger = (delay = 0.06) => ({
  animate: {
    transition: {
      staggerChildren: delay,
    },
  },
});

// ---------------------------------------------------------------------------
// Reduced-motion fallbacks (opacity-only, duration 0)
// ---------------------------------------------------------------------------

export const reducedMotionFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0 },
};

export const reducedMotionSlideUp = reducedMotionFade;
export const reducedMotionDrawerSlide = reducedMotionFade;

export const reducedMotionStagger = () => ({
  animate: { transition: { staggerChildren: 0 } },
});

// ---------------------------------------------------------------------------
// Reduced-motion-aware selectors
// ---------------------------------------------------------------------------

/**
 * Select the appropriate variant given the current reduced-motion preference.
 *
 * @param {boolean} reducedMotion - typically `useReducedMotion()` from framer-motion
 * @returns {{ fade, slideUp, drawerSlide, stagger }} variants
 */
export function getMotionVariants(reducedMotion) {
  if (reducedMotion) {
    return {
      fade: reducedMotionFade,
      slideUp: reducedMotionSlideUp,
      drawerSlide: reducedMotionDrawerSlide,
      stagger: reducedMotionStagger,
    };
  }
  return { fade, slideUp, drawerSlide, stagger };
}

const motionTokens = {
  fade,
  slideUp,
  drawerSlide,
  stagger,
  reducedMotionFade,
  reducedMotionSlideUp,
  reducedMotionDrawerSlide,
  reducedMotionStagger,
  getMotionVariants,
};

export default motionTokens;

/**
 * useReducedMotion — re-export of Framer Motion's hook.
 *
 * The storefront respects `prefers-reduced-motion: reduce` by routing every
 * animated component through this hook (Requirement 1.6). We re-export
 * Framer's implementation rather than rolling our own so:
 *
 *   - We get Framer's correct media-query subscription semantics (it
 *     listens to `change` events and updates on the fly without a reload).
 *   - The animation library and the preference-detection live in the same
 *     dependency, which avoids subtle drift between what Framer animates
 *     and what we think we should animate.
 *   - There is one canonical import path inside the codebase
 *     (`hooks/useReducedMotion`) so a future swap to a custom implementation
 *     is a one-file change.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 1.6)
 *   .kiro/specs/storefront-experience-redesign/design.md       (Motion tokens)
 *   .kiro/specs/storefront-experience-redesign/tasks.md        (task 6.1)
 *
 * Usage:
 *   import { useReducedMotion } from "@/hooks/useReducedMotion";
 *   const reduced = useReducedMotion();
 *
 * Returns `true` when the user has expressed a preference for reduced motion,
 * `false` otherwise (and `null` during the very first render before the
 * media query has been read).
 */

export { useReducedMotion } from 'framer-motion';
export { useReducedMotion as default } from 'framer-motion';

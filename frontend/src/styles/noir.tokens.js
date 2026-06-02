/**
 * NOIR Design Tokens
 *
 * Single source of truth for color, typography, spacing, radius, elevation,
 * and motion duration values consumed by the storefront. These tokens are
 * surfaced to components only via Tailwind utility classes that resolve to
 * CSS variables declared on `:root` in `frontend/src/index.css`.
 *
 * Source spec: .kiro/specs/storefront-experience-redesign/design.md
 *   (Design System Tokens section)
 *
 * Color values are stored as raw HSL channel triples (no `hsl(...)` wrapper)
 * so they can be composed with Tailwind's `hsl(var(--token))` pattern and
 * with alpha modifiers (`hsl(var(--token) / 0.5)`).
 */

// ---------------------------------------------------------------------------
// Color tokens (HSL channel triples — paired with `hsl(var(--token))` in CSS)
// ---------------------------------------------------------------------------
export const colors = {
  background: '0 0% 100%',
  foreground: '0 0% 0%',

  card: '0 0% 100%',
  cardForeground: '0 0% 0%',

  popover: '0 0% 100%',
  popoverForeground: '0 0% 0%',

  primary: '0 0% 0%',
  primaryForeground: '0 0% 100%',

  secondary: '0 0% 96%',
  secondaryForeground: '0 0% 9%',

  muted: '0 0% 96%',
  // zinc-600 — passes WCAG AA on white at 14px (6.76:1)
  mutedForeground: '0 0% 45%',

  accent: '0 0% 96%',
  accentForeground: '0 0% 9%',

  destructive: '0 72% 51%',
  destructiveForeground: '0 0% 98%',

  // Stock OK, free-shipping reached
  success: '142 71% 45%',
  // Low stock, soft alerts
  warning: '38 92% 50%',

  border: '0 0% 90%',
  input: '0 0% 90%',
  ring: '0 0% 0%',
};

// ---------------------------------------------------------------------------
// Typography tokens
// ---------------------------------------------------------------------------
export const fontFamily = {
  // Display: Bodoni Moda — hero, section H2, product H1
  heading: "'Bodoni Moda', serif",
  // Body: Manrope — paragraphs, form labels
  body: "'Manrope', sans-serif",
  // Mono / caption: JetBrains Mono — prices, labels, micro-tags
  mono: "'JetBrains Mono', monospace",
};

export const fontSize = {
  // Fluid display, clamp(min, viewport, max) / line-height
  display: { size: 'clamp(2.5rem, 8vw, 7rem)', lineHeight: '0.9' },
  h1: { size: 'clamp(2rem, 5vw, 4rem)', lineHeight: '1.0' },
  h2: { size: 'clamp(1.5rem, 3vw, 2.5rem)', lineHeight: '1.1' },
  h3: { size: '1.25rem', lineHeight: '1.3' },
  body: { size: '1rem', lineHeight: '1.6' },
  caption: { size: '0.75rem', lineHeight: '1.4' },
  micro: { size: '0.6875rem', lineHeight: '1.3' },
};

// ---------------------------------------------------------------------------
// Spacing scale (rem) — Tailwind defaults retained; layout rules in design.md
// ---------------------------------------------------------------------------
export const spacing = {
  0: '0rem',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  6: '1.5rem',
  8: '2rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
};

// ---------------------------------------------------------------------------
// Radius — NOIR is a sharp-edge brand; flat 0 across the system.
// ---------------------------------------------------------------------------
export const radius = {
  base: '0rem',
};

// ---------------------------------------------------------------------------
// Elevation — flat by default; two soft levels for cards and modals.
// ---------------------------------------------------------------------------
export const elevation = {
  // Card hover, dropdown panels
  1: '0 1px 2px hsl(0 0% 0% / 0.06)',
  // Modals, mobile bottom sheets, dropdown menus
  2: '0 8px 24px hsl(0 0% 0% / 0.12)',
};

// ---------------------------------------------------------------------------
// Motion duration tokens (ms)
// ---------------------------------------------------------------------------
export const duration = {
  instant: 0,
  fast: 150,
  base: 250,
  slow: 400,
  slower: 600,
};

export const easing = {
  // Material-style standard easing
  standard: [0.4, 0, 0.2, 1],
  // Decelerate (entrances)
  decelerate: [0.0, 0.0, 0.2, 1],
  // Accelerate (exits)
  accelerate: [0.4, 0.0, 1, 1],
};

// ---------------------------------------------------------------------------
// Breakpoints (px) — kept in sync with `tailwind.config.js` `screens`.
// ---------------------------------------------------------------------------
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1400,
};

const tokens = {
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
  elevation,
  duration,
  easing,
  breakpoints,
};

export default tokens;

/**
 * NOIR branded toast notification system.
 *
 * Uses sonner's toast.custom() with inlined JSX — no separate React component
 * is passed as an object (which causes "Objects are not valid as a React child").
 *
 * Usage:
 *   import { noirToast } from '../lib/noir-toast';
 *   noirToast.success('Added to cart');
 *   noirToast.cart('Added to cart', 'Black Hoodie — Size M');
 *   noirToast.error('Payment failed', 'Try a different method');
 */

import { toast } from 'sonner';
import React from 'react';
import {
  Check, X, AlertCircle, Info,
  ShoppingCart, Heart, HeartOff,
  User, Mail, Package, Trash2, Star, Lock,
} from 'lucide-react';

// ── Accent colors per type ──────────────────────────────────────────────────
const ACCENTS = {
  success: '#16a34a',
  error:   '#dc2626',
  info:    '#2563eb',
  warning: '#d97706',
  neutral: '#52525b',
};

// ── Default icons per type ──────────────────────────────────────────────────
const TYPE_ICONS = {
  success: Check,
  error:   X,
  info:    Info,
  warning: AlertCircle,
  neutral: Info,
};

// ── Core fire function ──────────────────────────────────────────────────────
function fire(type, label, description, opts = {}) {
  const accent  = ACCENTS[type]     || ACCENTS.neutral;
  const Icon    = opts.icon         || TYPE_ICONS[type] || Info;
  const duration = type === 'error' ? 5000 : 3000;

  // Remove icon from opts before spreading so Sonner doesn't get confused
  const { icon: _icon, ...sonnerOpts } = opts;

  return toast.custom(
    // Sonner v2: first arg must be (toastId) => ReactNode — inline JSX only
    (_toastId) => (
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.625rem',
          width: '100%',
          minWidth: 0,
        },
      },
        // Left accent bar
        React.createElement('div', {
          style: {
            width: '3px',
            alignSelf: 'stretch',
            backgroundColor: accent,
            flexShrink: 0,
            borderRadius: '1px',
          },
        }),
        // Icon
        React.createElement('div', {
          style: {
            width: '1rem',
            height: '1rem',
            flexShrink: 0,
            marginTop: '0.125rem',
            color: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
        },
          React.createElement(Icon, { size: 14, strokeWidth: 2.5 })
        ),
        // Text block
        React.createElement('div', { style: { flex: 1, minWidth: 0 } },
          React.createElement('p', {
            style: {
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.6875rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#000',
              margin: 0,
              lineHeight: 1.4,
            },
          }, label),
          description
            ? React.createElement('p', {
                style: {
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: '0.8125rem',
                  color: '#52525b',
                  margin: '0.25rem 0 0 0',
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '280px',
                },
              }, description)
            : null
        )
      )
    ),
    {
      duration,
      style: {
        padding: '0.875rem 1rem',
        background: '#fff',
        border: '1px solid #e4e4e7',
        borderRadius: '0',
        boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
        minWidth: '320px',
        maxWidth: '420px',
      },
      ...sonnerOpts,
    }
  );
}

// ── Public API ──────────────────────────────────────────────────────────────
export const noirToast = {
  success:       (label, description, opts) => fire('success', label, description, opts),
  error:         (label, description, opts) => fire('error',   label, description, opts),
  info:          (label, description, opts) => fire('info',    label, description, opts),
  warning:       (label, description, opts) => fire('warning', label, description, opts),

  cart:          (label, description, opts) => fire('success', label, description, { icon: ShoppingCart, ...opts }),
  cartRemove:    (label = 'Removed from cart',      desc, opts) => fire('neutral', label, desc, { icon: Trash2,     ...opts }),
  wishlist:      (label = 'Saved to wishlist',      desc, opts) => fire('success', label, desc, { icon: Heart,      ...opts }),
  wishlistRemove:(label = 'Removed from wishlist',  desc, opts) => fire('neutral', label, desc, { icon: HeartOff,   ...opts }),
  auth:          (label, description, opts) => fire('success', label, description, { icon: User,         ...opts }),
  authError:     (label, description, opts) => fire('error',   label, description, { icon: Lock,         ...opts }),
  otp:           (label = 'Check your inbox',       desc, opts) => fire('info',    label, desc, { icon: Mail,       ...opts }),
  order:         (label = 'Order confirmed',        desc, opts) => fire('success', label, desc, { icon: Package,    ...opts }),
  featured:      (label, description, opts) => fire('success', label, description, { icon: Star,         ...opts }),
};

export default noirToast;

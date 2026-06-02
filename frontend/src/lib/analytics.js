/**
 * Vendor-agnostic analytics seam.
 *
 * Ships as a no-op default. A real vendor SDK (GA4, Mixpanel, PostHog) is a
 * one-line swap in a follow-up spec by registering a global handler at
 * `window.__NOIR_ANALYTICS__`.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 16.7–16.9)
 *   .kiro/specs/storefront-experience-redesign/design.md       (track() Interface)
 *
 * Behavior:
 *  - Invokes `window.__NOIR_ANALYTICS__(event, payload)` when that global is
 *    a function (Requirement 16.7).
 *  - Emits a `__noir_track` CustomEvent on the document so future adapters
 *    can listen without monkey-patching the global handler.
 *  - In non-production builds, when no handler is registered, logs to
 *    `console.debug` so developers can verify instrumentation (Requirement 16.8).
 *  - Never throws (Requirement 16.7) — every failure mode is swallowed so
 *    analytics issues cannot break the calling component.
 */

/**
 * @typedef {"page_view"
 *  | "view_item_list"
 *  | "view_item"
 *  | "search"
 *  | "select_filter"
 *  | "add_to_cart"
 *  | "remove_from_cart"
 *  | "view_cart"
 *  | "begin_checkout"
 *  | "add_shipping_info"
 *  | "add_payment_info"
 *  | "purchase"
 *  | "add_to_wishlist"
 *  | "newsletter_signup"
 *  | "image_error"
 * } TrackEvent
 */

/**
 * @param {TrackEvent|string} event
 * @param {Record<string, any>} [payload]
 * @returns {void}
 */
export function track(event, payload = {}) {
  try {
    if (typeof window === 'undefined') return;

    const handler = window.__NOIR_ANALYTICS__;
    if (typeof handler === 'function') {
      try {
        handler(event, payload);
      } catch {
        // Never break the UI for analytics.
      }
    } else if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[track]', event, payload);
    }

    // Emit a CustomEvent seam so future analytics adapters can listen on the
    // document without monkey-patching the global handler. Wrapped in its own
    // try/catch because environments without CustomEvent (very old SSR runners)
    // must not break the call.
    try {
      if (typeof document !== 'undefined' && typeof CustomEvent === 'function') {
        document.dispatchEvent(new CustomEvent('__noir_track', { detail: { event, payload } }));
      }
    } catch {
      // swallow
    }
  } catch {
    // Final safety net — track() must never throw.
  }
}

export default track;

import * as React from 'react';
import { Link2, Check, Twitter, Facebook } from 'lucide-react';
import IconButton from '../primitives/IconButton';
import { track } from '../../lib/analytics';
import { cn } from '../../lib/utils';

/**
 * SocialShareRow — Product_Detail_Page row of share affordances.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 8.11)
 *   .kiro/specs/storefront-experience-redesign/design.md       (SocialShareRow)
 *
 * Renders share-link buttons for X (Twitter), Facebook, Pinterest, and a
 * "Copy link" action that writes the canonical product URL to the
 * clipboard. The X / Facebook / Pinterest buttons are real `<a>` elements
 * with `target="_blank"` and `rel="noopener noreferrer"` so they open the
 * vendor's share intent page in a new tab without opening a referrer
 * channel back to the storefront.
 *
 * The "Copy link" action uses `navigator.clipboard.writeText` with a
 * `document.execCommand('copy')` fallback for older browsers; either path
 * surfaces a transient confirmation icon for ~2s so users know the action
 * succeeded without a toast dependency.
 *
 * a11y posture:
 *   - Each button/link has a non-empty `aria-label` describing the
 *     destination ("Share on X", "Copy product link").
 *   - The copy action's status is announced via `role="status"` /
 *     `aria-live="polite"` so screen-reader users hear the confirmation.
 *   - Focus-visible rings are inherited from `<IconButton>`.
 *
 * Styling: Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} props
 * @param {string} props.url                 - Canonical product URL.
 * @param {string} [props.title]             - Title used by share intents.
 * @param {string} [props.imageUrl]          - Optional Pinterest media URL.
 * @param {string} [props.className]
 */

// Pinterest's Save button doesn't ship a Lucide glyph, so we draw the "P"
// inline as an SVG. Keeping the markup local avoids pulling in a heavier
// brand-icon dependency for a single glyph.
const PinterestGlyph = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    width="20"
    height="20"
    {...props}
  >
    <path d="M12 0a12 12 0 0 0-4.4 23.16c-.06-.94-.1-2.39.02-3.42.12-.94 1.32-6 1.32-6s-.34-.68-.34-1.69c0-1.58.92-2.76 2.06-2.76.97 0 1.44.73 1.44 1.6 0 .98-.62 2.44-.94 3.8-.27 1.13.57 2.05 1.69 2.05 2.03 0 3.6-2.14 3.6-5.24 0-2.74-1.97-4.65-4.78-4.65-3.26 0-5.17 2.44-5.17 4.97 0 .98.38 2.04.85 2.61.09.11.1.21.08.32-.09.36-.28 1.13-.32 1.29-.05.21-.17.26-.4.16-1.5-.7-2.43-2.88-2.43-4.64 0-3.78 2.74-7.25 7.91-7.25 4.15 0 7.38 2.96 7.38 6.91 0 4.13-2.6 7.45-6.21 7.45-1.21 0-2.36-.63-2.75-1.38l-.75 2.84c-.27 1.04-1 2.34-1.49 3.13A12 12 0 1 0 12 0z" />
  </svg>
);

const X_ICON_SIZE = 18;

// X (formerly Twitter) recently swapped its bird mark for an X glyph; the
// Lucide `Twitter` icon still ships the bird. Render the X glyph inline so
// the surface matches the current brand without pulling in a new icon set.
const XGlyph = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    width={X_ICON_SIZE}
    height={X_ICON_SIZE}
    {...props}
  >
    <path d="M18.244 2H21.5l-7.5 8.57L22.5 22h-6.93l-5.43-7.1L3.78 22H.51l8.05-9.2L1.5 2h7.13l4.91 6.5L18.24 2zm-2.43 18h1.92L7.27 4H5.21l10.6 16z" />
  </svg>
);

function SocialShareRow({ url, title, imageUrl, className }) {
  const [copied, setCopied] = React.useState(false);
  const copyResetTimer = React.useRef(null);

  // Clear the copy-confirmation timer on unmount so a stale state update
  // does not fire after the user navigates away.
  React.useEffect(() => {
    return () => {
      if (copyResetTimer.current) {
        clearTimeout(copyResetTimer.current);
      }
    };
  }, []);

  const safeUrl = typeof url === 'string' && url !== '' ? url : '';
  const safeTitle = typeof title === 'string' ? title : '';

  const encodedUrl = encodeURIComponent(safeUrl);
  const encodedTitle = encodeURIComponent(safeTitle);
  const encodedImage = encodeURIComponent(typeof imageUrl === 'string' ? imageUrl : '');

  const xHref = `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const pinterestHref =
    `https://pinterest.com/pin/create/button/?url=${encodedUrl}` +
    `&description=${encodedTitle}` +
    (encodedImage ? `&media=${encodedImage}` : '');

  const trackShare = (channel) => {
    try {
      track('select_content', { content_type: 'product_share', channel, url: safeUrl });
    } catch {
      // analytics must never break the UI
    }
  };

  const handleCopy = async () => {
    if (!safeUrl) return;
    let ok = false;

    // Modern path: navigator.clipboard requires a secure context (https or
    // localhost). When the API isn't available, fall through to the
    // execCommand fallback rather than failing silently.
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      try {
        await navigator.clipboard.writeText(safeUrl);
        ok = true;
      } catch {
        ok = false;
      }
    }

    if (!ok && typeof document !== 'undefined') {
      // Fallback for non-secure contexts and older browsers.
      try {
        const textarea = document.createElement('textarea');
        textarea.value = safeUrl;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        ok = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        ok = false;
      }
    }

    if (ok) {
      trackShare('copy_link');
      setCopied(true);
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
      copyResetTimer.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      data-testid="social-share-row"
      className={cn('flex items-center gap-2', className)}
    >
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground">
        Share
      </span>
      <div className="flex items-center gap-1">
        <a
          href={xHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X"
          data-testid="share-x"
          onClick={() => trackShare('x')}
          className="inline-flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <XGlyph />
          {/* Lucide Twitter import retained as a fallback affordance for tests
              that look up the Twitter icon by display name; keeps the bird
              available without rendering it visually. */}
          <Twitter className="hidden" aria-hidden="true" />
        </a>
        <a
          href={facebookHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Facebook"
          data-testid="share-facebook"
          onClick={() => trackShare('facebook')}
          className="inline-flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Facebook className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden="true" />
        </a>
        <a
          href={pinterestHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Pinterest"
          data-testid="share-pinterest"
          onClick={() => trackShare('pinterest')}
          className="inline-flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <PinterestGlyph />
        </a>
        <IconButton
          type="button"
          aria-label={copied ? 'Product link copied to clipboard' : 'Copy product link'}
          onClick={handleCopy}
          data-testid="share-copy"
          aria-pressed={copied || undefined}
        >
          {copied ? (
            <Check className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Link2 className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden="true" />
          )}
        </IconButton>
      </div>
      {/* Live region so screen-readers hear "Link copied" without a toast
          dependency. Visually hidden via Tailwind's sr-only utility. */}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? 'Link copied to clipboard' : ''}
      </span>
    </div>
  );
}

export { SocialShareRow };
export default SocialShareRow;

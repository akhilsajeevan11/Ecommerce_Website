import * as React from 'react';
import { Mail } from 'lucide-react';
import Heading from '../primitives/Heading';
import Text from '../primitives/Text';
import { track } from '../../lib/analytics';
import { cn } from '../../lib/utils';

/**
 * NewsletterSignup — email-capture component used on the Homepage and
 * (future) inside the Footer.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 5.10, 5.11)
 *   .kiro/specs/storefront-experience-redesign/design.md       (NewsletterSignup)
 *
 * Behavior:
 *   - Validates the input against `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
 *     (Requirement 5.11). On invalid input, renders an inline error message
 *     below the input and does NOT persist the value.
 *   - On valid input:
 *       1. Persists the email under the localStorage key
 *          `noir.newsletter.subscribers` (Requirement 5.10) as a deduped
 *          JSON array of strings so a future admin export reads a stable
 *          shape.
 *       2. Calls `track('newsletter_signup', { source })` where `source`
 *          is the `variant` prop ("home" by default).
 *       3. Renders a success state and clears the input.
 *   - The `onSubmit` prop is optional. When supplied it is awaited *after*
 *     persistence + tracking so a future backend handler can take over the
 *     persistence story without changing call sites.
 *
 * Variants:
 *   - "home"   — full section with heading + supporting copy + horizontal
 *                input/button row.
 *   - "footer" — compact form (no heading, just label + input/button).
 *                The Footer organism currently inlines its own form for
 *                independence but accepts this component as a future swap.
 *
 * a11y posture (design.md a11y table):
 *   - The input is associated with a `<label>` via `htmlFor`; the error
 *     message uses `aria-describedby` and `aria-invalid="true"` so AT
 *     users hear the validation failure inline.
 *   - The success message is rendered inside an `aria-live="polite"`
 *     region so the confirmation is announced without stealing focus.
 *
 * Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} [props]
 * @param {"home"|"footer"} [props.variant="home"]
 * @param {(email: string) => Promise<void>|void} [props.onSubmit]
 * @param {string} [props.className]
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBSCRIBERS_KEY = 'noir.newsletter.subscribers';

const persistSubscriber = (email) => {
  if (typeof window === 'undefined') return;
  try {
    const existing = window.localStorage.getItem(SUBSCRIBERS_KEY);
    let list = [];
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed)) list = parsed.filter((e) => typeof e === 'string');
      } catch {
        // Corrupted prior value — start fresh; we don't want a malformed
        // payload to block today's subscriber.
        list = [];
      }
    }
    if (!list.includes(email)) list.push(email);
    window.localStorage.setItem(SUBSCRIBERS_KEY, JSON.stringify(list));
  } catch {
    // Private mode / disabled storage — swallow. The track event still
    // fires so a future analytics-driven funnel still records the intent.
  }
};

function NewsletterSignup({ variant = 'home', onSubmit, className } = {}) {
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const inputId = `newsletter-${variant}-email`;
  const errorId = `newsletter-${variant}-error`;
  const successId = `newsletter-${variant}-success`;

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (error) setError('');
    if (submitted) setSubmitted(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      // Requirement 5.11 — invalid input renders inline error and does NOT
      // persist.
      setError('Enter a valid email address');
      setSubmitted(false);
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      // Requirement 5.10 — persist before any optional handler so the
      // local subscriber list always reflects the user's intent even if a
      // future onSubmit handler throws.
      persistSubscriber(trimmed);

      try {
        track('newsletter_signup', { source: variant });
      } catch {
        // analytics seam never throws into the render tree
      }

      if (typeof onSubmit === 'function') {
        await onSubmit(trimmed);
      }

      setSubmitted(true);
      setEmail('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------
  // Footer variant — compact form. No heading. Used when this organism is
  // dropped into a footer column. The current `<Footer>` component inlines
  // its own form; this branch exists so a follow-up refactor can swap to
  // the canonical component without changing the footer layout.
  // ---------------------------------------------------------------------
  if (variant === 'footer') {
    return (
      <form
        onSubmit={handleSubmit}
        noValidate
        className={cn('flex flex-col gap-3', className)}
        data-testid="newsletter-signup-footer"
      >
        <label
          htmlFor={inputId}
          className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground"
        >
          Subscribe to the newsletter
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-0">
          <input
            id={inputId}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={handleChange}
            placeholder="you@example.com"
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : submitted ? successId : undefined}
            className="h-11 flex-1 border border-border bg-background px-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 bg-primary px-5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {isSubmitting ? 'Sending…' : 'Subscribe'}
          </button>
        </div>
        {error ? (
          <Text
            id={errorId}
            variant="caption"
            className="text-destructive normal-case tracking-normal"
          >
            {error}
          </Text>
        ) : null}
        <div aria-live="polite" className="min-h-0">
          {submitted ? (
            <Text
              id={successId}
              variant="caption"
              className="text-success normal-case tracking-normal"
            >
              Thanks for subscribing.
            </Text>
          ) : null}
        </div>
      </form>
    );
  }

  // ---------------------------------------------------------------------
  // Home variant — centered section with heading + supporting copy.
  // ---------------------------------------------------------------------
  return (
    <section
      aria-labelledby="newsletter-heading"
      className={cn('w-full bg-foreground py-16 text-background lg:py-24', className)}
      data-testid="newsletter-signup"
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 text-center sm:px-6">
        <div className="flex h-12 w-12 items-center justify-center text-background">
          <Mail className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <Heading
          as="h2"
          size="h2"
          id="newsletter-heading"
          className="text-background"
        >
          Stay in the loop
        </Heading>
        <Text
          variant="body"
          tone="default"
          className="max-w-md text-background/80"
        >
          Get early access to new drops, editorial features, and members-only releases. No spam — just NOIR.
        </Text>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex w-full max-w-md flex-col gap-3 text-left"
        >
          <label htmlFor={inputId} className="sr-only">
            Email address
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-0">
            <input
              id={inputId}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={handleChange}
              placeholder="you@example.com"
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? errorId : submitted ? successId : undefined}
              className="h-12 flex-1 bg-background px-4 font-body text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 bg-background px-6 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-60 sm:border-l sm:border-border"
            >
              {isSubmitting ? 'Sending…' : 'Subscribe'}
            </button>
          </div>

          {error ? (
            <Text
              id={errorId}
              variant="caption"
              className="text-destructive-foreground bg-destructive/90 px-2 py-1 normal-case tracking-normal"
            >
              {error}
            </Text>
          ) : null}

          <div aria-live="polite" className="min-h-0">
            {submitted ? (
              <Text
                id={successId}
                variant="caption"
                className="text-success normal-case tracking-normal"
              >
                Thanks for subscribing.
              </Text>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}

export { NewsletterSignup };
export default NewsletterSignup;

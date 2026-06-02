import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import * as Accordion from '@radix-ui/react-accordion';
import {
  ChevronDown,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Linkedin,
} from 'lucide-react';
import Heading from '../primitives/Heading';
import Text from '../primitives/Text';
import { cn } from '../../lib/utils';
import { track } from '../../lib/analytics';

/**
 * Footer — site-wide footer rendered at the bottom of every customer route.
 *
 * Spec: Requirements 2.5, 2.6, 2.7
 *   - 2.5: Render four columns (Shop, Help, About, Connect) at the `lg`
 *          breakpoint and above; render a single Radix Accordion of those
 *          four sections below `lg`.
 *   - 2.6: Render a legal row with links to `/privacy`, `/terms`, `/refunds`
 *          and a copyright line that includes the current year.
 *   - 2.7: Render Newsletter signup with `variant="footer"` and social-icon
 *          links sourced from the `footer_social_links` JSON site setting,
 *          omitting any icon whose URL is empty or null.
 *
 * Newsletter signup:
 *   The full `<NewsletterSignup variant="footer" />` organism is scheduled
 *   for task 9.1. To avoid blocking task 2.3 on it (and to avoid scaffolding
 *   a placeholder file 9.1 will rewrite), this Footer ships a small inline
 *   email-capture form that mirrors the contract of the future organism:
 *     - Validates `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (Requirement 5.11)
 *     - Persists to `localStorage["noir.newsletter.subscribers"]` (Req 5.10)
 *     - Calls `track('newsletter_signup', { source: 'footer' })` (Req 5.10)
 *   Task 9.1 may later replace this form with the imported organism without
 *   changing the Footer's external contract.
 *
 * Site settings:
 *   `footer_about_text` and `footer_social_links` are fetched from
 *   `GET /api/site-settings` once on mount, mirroring the AnnouncementBar
 *   pattern. Failures degrade gracefully — the static layout still ships.
 *
 * a11y posture (design.md a11y table):
 *   - Native `<footer>` element gives `role="contentinfo"` for free.
 *   - Each link gets the standard focus ring via the global focus-visible
 *     ring tokens; link contrast is text-foreground on white (≥ 4.5:1).
 *   - The accordion below `lg` uses Radix Accordion which manages
 *     `aria-expanded` / `aria-controls` automatically.
 *   - Social icon links carry an `aria-label` and an `aria-hidden` icon
 *     glyph so screen-reader users hear "Instagram" not "icon".
 *
 * Styling:
 *   - Tailwind utility classes only — no inline `style={}` (Requirement 1.3).
 */
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBSCRIBERS_KEY = 'noir.newsletter.subscribers';

// Map of social platform key → lucide-react icon component. Keys match the
// shape of the `footer_social_links` JSON string defined in design.md.
const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'twitter', label: 'Twitter', Icon: Twitter },
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'youtube', label: 'YouTube', Icon: Youtube },
  { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
];

// Parse the `footer_social_links` value into a `{key, label, url, Icon}[]`
// array, omitting any platform whose URL is empty/null/whitespace
// (Requirement 2.7). The setting is stored as a JSON string in the KV store
// so we tolerate malformed JSON by falling back to an empty list.
const parseSocialLinks = (raw) => {
  if (!raw || typeof raw !== 'string') return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== 'object') return [];
  return SOCIAL_PLATFORMS.map(({ key, label, Icon }) => {
    const url = typeof parsed[key] === 'string' ? parsed[key].trim() : '';
    return { key, label, Icon, url };
  }).filter((entry) => entry.url.length > 0);
};

// Persist a subscriber email under `noir.newsletter.subscribers`. Stored as a
// deduplicated JSON array of email strings so a future admin export reads a
// stable shape. Failures (private mode, storage disabled) are swallowed —
// successful client-side validation is the user-visible signal.
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
        list = [];
      }
    }
    if (!list.includes(email)) list.push(email);
    window.localStorage.setItem(SUBSCRIBERS_KEY, JSON.stringify(list));
  } catch {
    // Swallow — see comment above.
  }
};

/* -----------------------------------------------------------------------
 * Section data
 * --------------------------------------------------------------------- */

const SHOP_LINKS = [
  { label: 'All Products', to: '/shop' },
  { label: 'New Arrivals', to: '/shop?sort=newest' },
  { label: 'Featured', to: '/shop?featured=true' },
  { label: 'Wishlist', to: '/wishlist' },
];

// Routes for FAQ / shipping / returns / contact don't yet exist in the
// router. Per the task notes we use placeholder `#` hashes so the markup is
// stable; follow-up specs will swap these to real routes without touching
// Footer.js.
const HELP_LINKS = [
  { label: 'FAQ', href: '#faq' },
  { label: 'Shipping', href: '#shipping' },
  { label: 'Returns', href: '#returns' },
  { label: 'Contact', href: '#contact' },
];

const ABOUT_LINKS = [
  { label: 'Our Story', href: '#story' },
  { label: 'Sustainability', href: '#sustainability' },
];

/* -----------------------------------------------------------------------
 * Subcomponents
 * --------------------------------------------------------------------- */

const NavList = ({ links }) => (
  <ul className="flex flex-col gap-3">
    {links.map((link) => (
      <li key={link.label}>
        {link.to ? (
          <Link
            to={link.to}
            className="font-body text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
          >
            {link.label}
          </Link>
        ) : (
          <a
            href={link.href}
            className="font-body text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
          >
            {link.label}
          </a>
        )}
      </li>
    ))}
  </ul>
);

const ColumnHeading = ({ children, className }) => (
  <Heading
    as="h2"
    size="h3"
    className={cn(
      'font-mono text-xs font-semibold uppercase tracking-[0.2em] text-foreground',
      className
    )}
  >
    {children}
  </Heading>
);

const SocialLinks = ({ links }) => {
  if (!links.length) return null;
  return (
    <ul className="flex flex-wrap items-center gap-2">
      {links.map(({ key, label, Icon, url }) => (
        <li key={key}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="inline-flex h-9 w-9 items-center justify-center border border-border text-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
};

/**
 * Inline footer-variant newsletter form. Mirrors the contract of the future
 * `<NewsletterSignup variant="footer" />` organism (task 9.1):
 *   - regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
 *   - persists to localStorage["noir.newsletter.subscribers"]
 *   - tracks `newsletter_signup` with `{ source: 'footer' }`
 */
const FooterNewsletterForm = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a valid email address');
      setSubmitted(false);
      return;
    }
    setError('');
    persistSubscriber(trimmed);
    try {
      track('newsletter_signup', { source: 'footer' });
    } catch {
      // analytics seam never throws into the render tree
    }
    setSubmitted(true);
    setEmail('');
  };

  const inputId = 'footer-newsletter-email';
  const errorId = 'footer-newsletter-error';

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <label htmlFor={inputId} className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground">
        Subscribe to the newsletter
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-0">
        <input
          id={inputId}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError('');
            if (submitted) setSubmitted(false);
          }}
          placeholder="you@example.com"
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : undefined}
          className="h-11 flex-1 border border-border bg-background px-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
        />
        <button
          type="submit"
          className="h-11 bg-primary px-5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Subscribe
        </button>
      </div>
      {error ? (
        <Text id={errorId} variant="caption" className="text-destructive normal-case tracking-normal">
          {error}
        </Text>
      ) : null}
      {submitted ? (
        <Text variant="caption" className="text-success normal-case tracking-normal">
          Thanks for subscribing.
        </Text>
      ) : null}
    </form>
  );
};

/* -----------------------------------------------------------------------
 * Main Footer component
 * --------------------------------------------------------------------- */

const Footer = () => {
  const [aboutText, setAboutText] = useState('');
  const [socialRaw, setSocialRaw] = useState('');

  // Fetch site settings once on mount. Failure keeps the layout intact —
  // the About column simply omits the about-text paragraph and the social
  // icon row stays empty.
  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      try {
        const response = await axios.get(`${API}/site-settings`);
        if (cancelled) return;
        const data = response && response.data ? response.data : {};
        if (typeof data.footer_about_text === 'string') setAboutText(data.footer_about_text);
        if (typeof data.footer_social_links === 'string') setSocialRaw(data.footer_social_links);
      } catch {
        if (cancelled) return;
        // No-op: static layout still renders.
      }
    };
    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  // Recompute the social icon list whenever the raw setting changes.
  // useMemo so we don't re-parse JSON on every render.
  const socialLinks = useMemo(() => parseSocialLinks(socialRaw), [socialRaw]);

  const year = new Date().getFullYear();

  // Section bodies rendered both in the desktop columns and the mobile
  // accordion content, so we extract them as small render functions.
  const renderShop = () => <NavList links={SHOP_LINKS} />;
  const renderHelp = () => <NavList links={HELP_LINKS} />;
  const renderAbout = () => (
    <div className="flex flex-col gap-4">
      {aboutText ? (
        <Text variant="body" tone="muted" className="text-sm leading-relaxed">
          {aboutText}
        </Text>
      ) : null}
      <NavList links={ABOUT_LINKS} />
    </div>
  );
  const renderConnect = () => (
    <div className="flex flex-col gap-5">
      <FooterNewsletterForm />
      <SocialLinks links={socialLinks} />
    </div>
  );

  return (
    <footer className="mt-16 border-t border-border bg-background text-foreground">
      <div className="mx-auto max-w-screen-2xl px-4 py-12 sm:px-6 lg:px-12 lg:py-16">
        {/* Desktop: 4-column grid at lg+ (Requirement 2.5) */}
        <div className="hidden gap-8 lg:grid lg:grid-cols-4 lg:gap-12">
          <section className="flex flex-col gap-5">
            <ColumnHeading>Shop</ColumnHeading>
            {renderShop()}
          </section>
          <section className="flex flex-col gap-5">
            <ColumnHeading>Help</ColumnHeading>
            {renderHelp()}
          </section>
          <section className="flex flex-col gap-5">
            <ColumnHeading>About</ColumnHeading>
            {renderAbout()}
          </section>
          <section className="flex flex-col gap-5">
            <ColumnHeading>Connect</ColumnHeading>
            {renderConnect()}
          </section>
        </div>

        {/* Mobile: Radix Accordion below lg (Requirement 2.5) */}
        <Accordion.Root
          type="single"
          collapsible
          className="flex flex-col divide-y divide-border border-y border-border lg:hidden"
        >
          {[
            { value: 'shop', label: 'Shop', body: renderShop() },
            { value: 'help', label: 'Help', body: renderHelp() },
            { value: 'about', label: 'About', body: renderAbout() },
            { value: 'connect', label: 'Connect', body: renderConnect() },
          ].map(({ value, label, body }) => (
            <Accordion.Item key={value} value={value}>
              <Accordion.Header className="m-0">
                <Accordion.Trigger
                  className={cn(
                    'group flex w-full items-center justify-between py-4',
                    'font-mono text-xs font-semibold uppercase tracking-[0.2em] text-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  )}
                >
                  <span>{label}</span>
                  <ChevronDown
                    className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden data-[state=closed]:animate-none data-[state=open]:animate-none">
                <div className="pb-5 pt-1">{body}</div>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>

      {/* Legal row (Requirement 2.6) */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-12">
          <nav aria-label="Legal" className="order-2 lg:order-1">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <li>
                <Link
                  to="/privacy"
                  className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  to="/refunds"
                  className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                >
                  Refunds
                </Link>
              </li>
            </ul>
          </nav>
          <Text
            variant="micro"
            tone="muted"
            className="order-1 lg:order-2"
          >
            © {year} NOIR. All rights reserved.
          </Text>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

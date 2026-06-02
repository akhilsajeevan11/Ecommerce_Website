import { useEffect, useState } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import IconButton from '../primitives/IconButton';

/**
 * AnnouncementBar — sticky promotional bar above the Navigation.
 *
 * Spec: Requirements 2.2, 2.3, 2.4
 *   - 2.2: Render only when `announcement_bar_active === "true"` (string)
 *          AND localStorage `noir.ann.dismissed.v1` is unset.
 *   - 2.3: Dismiss writes `"1"` to `noir.ann.dismissed.v1` and removes
 *          the bar from the DOM without reloading.
 *   - 2.4: When `announcement_bar_active` is `"false"` or unset, render
 *          nothing.
 *
 * a11y posture (design.md component a11y table):
 *   - `role="region"` with `aria-label="Announcement"` so screen-reader
 *     users can locate the bar as a landmark.
 *   - Dismiss is rendered via the `IconButton` primitive which enforces
 *     a non-empty `aria-label`.
 *
 * SSR / safety:
 *   - localStorage access is guarded behind `typeof window !== 'undefined'`
 *     and a `try/catch` because some browsers throw on access (private
 *     mode, storage disabled).
 *   - The site-settings fetch is fire-and-forget; any error keeps the bar
 *     hidden rather than blocking the layout.
 *
 * Styling:
 *   - Tailwind utilities only — no inline `style={}` (Requirement 1.3).
 *   - Black background, white text, JetBrains Mono caption styling
 *     consistent with the NOIR brand voice.
 */
const DISMISSED_KEY = 'noir.ann.dismissed.v1';
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const readDismissed = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    // localStorage can throw in private mode / when disabled. Treat as
    // not-dismissed so the bar still serves first-time visitors.
    return false;
  }
};

const writeDismissed = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    // Swallow — failing to persist the dismissal is acceptable; the bar
    // is already hidden for this render cycle via component state.
  }
};

const AnnouncementBar = () => {
  const [text, setText] = useState('');
  const [active, setActive] = useState(false);
  const [dismissed, setDismissed] = useState(() => readDismissed());

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      try {
        const response = await axios.get(`${API}/site-settings`);
        if (cancelled) return;
        const data = response && response.data ? response.data : {};
        // Requirement 2.2: the active flag is the literal string "true".
        setActive(data.announcement_bar_active === 'true');
        setText(typeof data.announcement_bar_text === 'string' ? data.announcement_bar_text : '');
      } catch {
        if (cancelled) return;
        // Network/server error — keep the bar hidden rather than
        // surfacing a half-rendered banner.
        setActive(false);
      }
    };
    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDismiss = () => {
    writeDismissed();
    setDismissed(true);
  };

  // Requirements 2.2 + 2.4: render only when active AND not dismissed AND
  // there is actually text to show.
  if (!active || dismissed || !text) return null;

  return (
    <div
      role="region"
      aria-label="Announcement"
      className="sticky top-0 z-[60] w-full bg-black text-white"
    >
      <div className="mx-auto flex max-w-screen-2xl items-center justify-center gap-3 px-4 py-2 sm:px-6 lg:px-12">
        <p className="flex-1 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-white sm:text-xs">
          {text}
        </p>
        <IconButton
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          aria-label="Dismiss announcement"
          className="shrink-0 text-white hover:bg-white/10"
        >
          <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  );
};

export default AnnouncementBar;

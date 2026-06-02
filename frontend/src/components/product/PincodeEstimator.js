import * as React from 'react';
import axios from 'axios';
import { cn } from '../../lib/utils';

/**
 * PincodeEstimator — Product_Detail_Page input that takes a 6-digit Indian
 * pincode and checks delivery serviceability via the backend.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 8.7)
 *
 * Behavior:
 *   - Validates the input against /^\d{6}$/ before calling the API.
 *   - Calls GET /api/delivery/check?pincode=XXXXXX.
 *   - If serviceable → "Delivers in 5–7 days to {pincode}"
 *   - If not serviceable → "Sorry, delivery not available to {pincode}"
 *   - If the input is not 6 digits → inline error, no API call.
 *   - If the API call fails → graceful error shown.
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const PINCODE_RE = /^\d{6}$/;
const ERROR_MESSAGE = 'Enter a 6-digit pincode';

function PincodeEstimator({ className }) {
  const [value, setValue] = React.useState('');
  const [result, setResult] = React.useState(null);   // { serviceable, eta_min, eta_max, pincode }
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const errorId = React.useId();
  const statusId = React.useId();

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = value.trim();

    if (!PINCODE_RE.test(trimmed)) {
      setError(ERROR_MESSAGE);
      setResult(null);
      return;
    }

    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const resp = await axios.get(`${BACKEND_URL}/api/delivery/check`, {
        params: { pincode: trimmed },
      });
      setResult(resp.data);
    } catch (err) {
      // If API is down / error, fall back gracefully
      const detail = err.response?.data?.detail;
      setError(detail || 'Could not check delivery. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const next = event.target.value.replace(/\D/g, '').slice(0, 6);
    setValue(next);
    if (error) setError(null);
    if (result) setResult(null);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      data-testid="pincode-estimator"
      className={cn('flex flex-col gap-2', className)}
    >
      <label
        htmlFor="pincode-estimator-input"
        className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-foreground"
      >
        Check delivery
      </label>
      <div className="flex items-stretch gap-2">
        <input
          id="pincode-estimator-input"
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          value={value}
          onChange={handleChange}
          placeholder="6-digit pincode"
          disabled={loading}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : result ? statusId : undefined}
          data-testid="pincode-input"
          className="h-11 flex-1 border border-border bg-background px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading}
          data-testid="pincode-submit"
          className="inline-flex h-11 items-center justify-center bg-primary px-5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {loading ? '...' : 'Check'}
        </button>
      </div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          data-testid="pincode-error"
          className="font-mono text-xs text-destructive"
        >
          {error}
        </p>
      ) : null}

      {result ? (
        <p
          id={statusId}
          role="status"
          aria-live="polite"
          data-testid="pincode-estimate"
          className={`font-mono text-xs ${result.serviceable ? 'text-muted-foreground' : 'text-destructive'}`}
        >
          {result.serviceable
            ? `Delivers in ${result.eta_min}–${result.eta_max} days to ${result.pincode}`
            : `Sorry, delivery not available to ${result.pincode}`}
        </p>
      ) : null}
    </form>
  );
}

export { PincodeEstimator, PINCODE_RE, ERROR_MESSAGE };
export default PincodeEstimator;

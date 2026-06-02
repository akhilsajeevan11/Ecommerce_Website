import React, { useState, useCallback, useRef } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Loader2, Tag, X } from 'lucide-react';

/**
 * CouponInput — a 4-state machine for coupon code entry.
 *
 * States:
 *   idle     → input visible, "Apply" button active
 *   applying → input disabled, spinner on button
 *   applied  → chip showing code + discount + "Remove" button
 *   error    → input visible with error message below
 *
 * Idempotence (Requirement 10.5):
 *   When the user submits the same code that is already `applied`, the component
 *   stays in `applied` without issuing a second `onApply` call.
 *
 * @param {object} props
 * @param {(code: string) => Promise<{ ok: boolean, discount?: number, error?: string }>} props.onApply
 * @param {() => void} [props.onRemove] — called when the user removes an applied coupon
 * @returns {JSX.Element}
 *
 * Source spec:
 *   Requirement 10.4 — 4-state machine
 *   Requirement 10.5 — idempotent on re-apply of same valid code
 *   Requirement 10.6 — applied chip with remove button
 */

// Default stub for coupon validation (demo purposes)
const defaultOnApply = async (code) => {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 800));
  const normalized = code.trim().toUpperCase();
  if (normalized === 'NOIR10') {
    return { ok: true, discount: 10 };
  }
  return { ok: false, error: 'Invalid coupon code' };
};

const CouponInput = ({ onApply = defaultOnApply, onRemove }) => {
  const [code, setCode] = useState('');
  const [state, setState] = useState('idle'); // idle | applying | applied | error
  const [errorMsg, setErrorMsg] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState('');
  const inputRef = useRef(null);

  const handleApply = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) return;

    // Idempotence: if already applied with the same code, do nothing
    if (state === 'applied' && trimmed.toUpperCase() === appliedCode.toUpperCase()) {
      return;
    }

    setState('applying');
    setErrorMsg('');

    try {
      const result = await onApply(trimmed);
      if (result.ok) {
        setState('applied');
        setDiscount(result.discount || 0);
        setAppliedCode(trimmed);
      } else {
        setState('error');
        setErrorMsg(result.error || 'Invalid coupon code');
      }
    } catch {
      setState('error');
      setErrorMsg('Something went wrong. Try again.');
    }
  }, [code, state, appliedCode, onApply]);

  const handleRemove = useCallback(() => {
    setState('idle');
    setCode('');
    setAppliedCode('');
    setDiscount(0);
    setErrorMsg('');
    onRemove?.();
    // Focus back on input after removing
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [onRemove]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  // Applied state: show chip
  if (state === 'applied') {
    return (
      <div className="space-y-2" data-testid="coupon-section">
        <label className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
          Coupon
        </label>
        <div
          className="flex items-center justify-between gap-2 border border-success/30 bg-success/5 px-3 py-2"
          data-testid="coupon-applied-chip"
        >
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-success flex-shrink-0" />
            <span className="font-mono text-xs tracking-wide uppercase text-foreground">
              {appliedCode}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              ({discount}% off)
            </span>
          </div>
          <button
            onClick={handleRemove}
            className="flex items-center justify-center p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Remove coupon ${appliedCode}`}
            data-testid="coupon-remove-btn"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Idle / applying / error states: show input
  return (
    <div className="space-y-2" data-testid="coupon-section">
      <label
        htmlFor="coupon-input"
        className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground"
      >
        Coupon
      </label>
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          id="coupon-input"
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (state === 'error') {
              setState('idle');
              setErrorMsg('');
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Enter code"
          disabled={state === 'applying'}
          aria-invalid={state === 'error' ? 'true' : undefined}
          aria-describedby={state === 'error' ? 'coupon-error' : undefined}
          className="flex-1 h-9 rounded-none font-mono text-xs tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal"
          data-testid="coupon-input"
        />
        <Button
          onClick={handleApply}
          disabled={state === 'applying' || !code.trim()}
          className="h-9 rounded-none px-4 font-mono text-[10px] tracking-[0.15em] uppercase"
          data-testid="coupon-apply-btn"
        >
          {state === 'applying' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            'Apply'
          )}
        </Button>
      </div>
      {state === 'error' && errorMsg && (
        <p
          id="coupon-error"
          className="font-mono text-[10px] text-destructive tracking-wide"
          role="alert"
          data-testid="coupon-error"
        >
          {errorMsg}
        </p>
      )}
    </div>
  );
};

export default CouponInput;

import { useEffect, useState } from 'react';

/**
 * useDebouncedValue — generic value-debouncing hook.
 *
 * Returns a value that lags the input `value` by `delayMs` milliseconds. Each
 * time `value` changes, a timer is scheduled and the previous one cleared, so
 * rapid successive updates collapse into a single trailing-edge emission.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/tasks.md (task 2.4 — SearchBar
 *   debounces input by 250 ms; task 6.1 — useDebouncedValue is one of the
 *   foundational shop hooks).
 *
 * Behavior:
 *   - When `delayMs <= 0`, the debounced value is updated synchronously on
 *     the next render — this keeps the hook usable in tests that want to
 *     bypass timers without mocking.
 *   - On unmount or before re-running, the pending timer is cleared so
 *     stale updates never fire.
 *   - The hook makes no assumptions about the value type (string, number,
 *     object); it forwards the latest reference verbatim.
 *
 * @template T
 * @param {T} value           - The latest input value.
 * @param {number} delayMs    - Debounce delay in milliseconds.
 * @returns {T}               - The most recent value that has held still for `delayMs`.
 */
export function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (typeof delayMs !== 'number' || delayMs <= 0) {
      setDebounced(value);
      return undefined;
    }

    const id = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => {
      clearTimeout(id);
    };
  }, [value, delayMs]);

  return debounced;
}

export default useDebouncedValue;

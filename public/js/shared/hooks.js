/**
 * shared/hooks.js — Reusable React hooks used across all pages
 */

// ── Toast ─────────────────────────────────────────────────────

/**
 * useToast() → { toast, showToast }
 * toast is null or a message string — components render it when non-null.
 */
import { useState, useCallback, useRef } from '../lib/react.js';
export function useToast(duration = 2500) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), duration);
  }, [duration]);

  return { toast, showToast };
}

// ── Async operation with loading / error state ────────────────

/**
 * useAsync() → { run, loading, error }
 * Wraps an async fn, tracks loading and last error.
 * Usage: const { run, loading } = useAsync();
 *        await run(() => api.skip(id));
 */
export function useAsync() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const run = useCallback(async (fn) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (e) {
      setError(e.message ?? 'Unknown error');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { run, loading, error };
}

// ── Modal open/close ──────────────────────────────────────────

/**
 * useModal(initialOpen) → { open, show, hide, toggle }
 */
export function useModal(initialOpen = false) {
  const [open, setOpen] = useState(initialOpen);
  const show   = useCallback(() => setOpen(true),  []);
  const hide   = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen(v => !v), []);
  return { open, show, hide, toggle };
}

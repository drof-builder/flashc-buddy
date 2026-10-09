import { useCallback, useEffect, useState } from 'react';

/**
 * A countdown in whole seconds, e.g. "wait 60 s before resending the email".
 * `secondsLeft` is 0 when idle; `start()` (re)starts the full countdown.
 */
export function useCooldown(seconds: number, options: { startActive?: boolean } = {}) {
  const [secondsLeft, setSecondsLeft] = useState(options.startActive ? seconds : 0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const start = useCallback(() => setSecondsLeft(seconds), [seconds]);

  return { secondsLeft, start };
}

/** Button text like "Resend email (42s)" while cooling down. */
export function withCountdown(label: string, secondsLeft: number): string {
  return secondsLeft > 0 ? `${label} (${secondsLeft}s)` : label;
}

import { useCallback, useRef, useState } from 'react';

/**
 * Runs one async action at a time. A second call while the first is still
 * running is ignored, so a quick double tap can't send two requests.
 * (A ref is used because state updates arrive too late to stop the 2nd tap.)
 */
export function useBusy() {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (action: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await action();
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, []);

  return { busy, run };
}

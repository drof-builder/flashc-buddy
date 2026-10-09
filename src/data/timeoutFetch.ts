// Android's network stack has NO timeout by default, so a stalled connection
// would leave a spinner forever. This wraps fetch so every request gives up
// after `ms` and rejects with a TimeoutError (mapped to a friendly message).

export const REQUEST_TIMEOUT_MS = 15000;

export function createTimeoutFetch(baseFetch: typeof fetch, ms: number): typeof fetch {
  return (input, init) => {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, ms);

    // Keep any abort the caller asked for (e.g. supabase-js cancelling).
    const callerSignal = init?.signal;
    if (callerSignal) {
      if (callerSignal.aborted) controller.abort();
      else callerSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    return baseFetch(input, { ...init, signal: controller.signal })
      .catch((error: unknown) => {
        if (timedOut) {
          const timeout = new Error(`Request timed out after ${ms} ms`);
          timeout.name = 'TimeoutError';
          throw timeout;
        }
        throw error;
      })
      .finally(() => clearTimeout(timer));
  };
}

import { createTimeoutFetch } from './timeoutFetch';

/** A fake network call that never answers, but stops when aborted. */
function hangingFetch() {
  return jest.fn(
    (_input: unknown, init?: { signal?: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }),
  );
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('gives up on a stalled request after the time limit', async () => {
  const fetchWithTimeout = createTimeoutFetch(hangingFetch() as unknown as typeof fetch, 15000);

  const request = fetchWithTimeout('https://example.com');
  jest.advanceTimersByTime(15000);

  await expect(request).rejects.toMatchObject({ name: 'TimeoutError' });
});

it('passes through a normal response', async () => {
  const response = { ok: true };
  const base = jest.fn().mockResolvedValue(response);
  const fetchWithTimeout = createTimeoutFetch(base as unknown as typeof fetch, 15000);

  await expect(fetchWithTimeout('https://example.com', { method: 'GET' })).resolves.toBe(response);
  expect(base).toHaveBeenCalledWith(
    'https://example.com',
    expect.objectContaining({ method: 'GET', signal: expect.anything() }),
  );
});

it('still honours an abort requested by the caller', async () => {
  const fetchWithTimeout = createTimeoutFetch(hangingFetch() as unknown as typeof fetch, 15000);
  const controller = new AbortController();

  const request = fetchWithTimeout('https://example.com', { signal: controller.signal });
  controller.abort();

  await expect(request).rejects.toMatchObject({ name: 'AbortError' });
});

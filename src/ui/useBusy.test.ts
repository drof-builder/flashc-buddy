import { act, renderHook } from '@testing-library/react-native';

import { useBusy } from './useBusy';

it('ignores a second call while the first is still running (double tap)', async () => {
  const { result } = await renderHook(() => useBusy());
  let finish: () => void = () => {};
  const slowAction = jest.fn(() => new Promise<void>((resolve) => (finish = resolve)));

  await act(async () => {
    const first = result.current.run(slowAction);
    const second = result.current.run(slowAction);
    finish();
    await Promise.all([first, second]);
  });

  expect(slowAction).toHaveBeenCalledTimes(1);
});

it('is busy while running and idle afterwards', async () => {
  const { result } = await renderHook(() => useBusy());
  let finish: () => void = () => {};
  let running: Promise<void> = Promise.resolve();

  await act(async () => {
    running = result.current.run(() => new Promise<void>((resolve) => (finish = resolve)));
  });
  expect(result.current.busy).toBe(true);

  await act(async () => {
    finish();
    await running;
  });
  expect(result.current.busy).toBe(false);
});

it('allows a new call after the previous one failed', async () => {
  const { result } = await renderHook(() => useBusy());
  const failing = jest.fn(() => Promise.reject(new Error('boom')));
  const next = jest.fn(() => Promise.resolve());

  await act(async () => {
    await result.current.run(failing).catch(() => {});
    await result.current.run(next);
  });

  expect(next).toHaveBeenCalledTimes(1);
});

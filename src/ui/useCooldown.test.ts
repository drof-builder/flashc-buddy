import { act, renderHook } from '@testing-library/react-native';

import { useCooldown } from './useCooldown';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

async function tick(seconds: number) {
  for (let i = 0; i < seconds; i++) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  }
}

it('starts idle by default', async () => {
  const { result } = await renderHook(() => useCooldown(60));
  expect(result.current.secondsLeft).toBe(0);
});

it('can start already counting down', async () => {
  const { result } = await renderHook(() => useCooldown(60, { startActive: true }));
  expect(result.current.secondsLeft).toBe(60);
});

it('counts down once per second and stops at zero', async () => {
  const { result } = await renderHook(() => useCooldown(3));

  await act(async () => result.current.start());
  expect(result.current.secondsLeft).toBe(3);

  await tick(1);
  expect(result.current.secondsLeft).toBe(2);

  await tick(5);
  expect(result.current.secondsLeft).toBe(0);
});

it('start() restarts the full countdown', async () => {
  const { result } = await renderHook(() => useCooldown(10, { startActive: true }));
  await tick(4);
  expect(result.current.secondsLeft).toBe(6);

  await act(async () => result.current.start());
  expect(result.current.secondsLeft).toBe(10);
});

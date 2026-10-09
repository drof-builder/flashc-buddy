import { renderHook } from '@testing-library/react-native';
import { useFocusEffect } from 'expo-router';

import { useReloadOnFocus } from './useReloadOnFocus';

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));

const focusEffect = useFocusEffect as jest.Mock;

/** Simulates the screen gaining focus: runs the latest registered effect. */
function focus() {
  const effect = focusEffect.mock.calls.at(-1)?.[0] as () => void;
  effect();
}

beforeEach(() => jest.clearAllMocks());

it('does not reload on the first visit (the screen already loads on mount)', async () => {
  const reload = jest.fn();
  await renderHook(() => useReloadOnFocus(reload));

  focus();

  expect(reload).not.toHaveBeenCalled();
});

it('reloads every time the user comes back to the screen', async () => {
  const reload = jest.fn();
  await renderHook(() => useReloadOnFocus(reload));

  focus(); // first visit
  focus(); // back from the card form
  focus(); // back again

  expect(reload).toHaveBeenCalledTimes(2);
});

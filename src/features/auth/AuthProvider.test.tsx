import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { authRepo } from '@/data/authRepo';

import { AuthProvider, useAuth } from './AuthProvider';

jest.mock('@/data/authRepo', () => ({ authRepo: { onSessionChange: jest.fn() } }));

let emit: (signedIn: boolean) => void = () => {};
(authRepo.onSessionChange as jest.Mock).mockImplementation((cb) => {
  emit = cb;
  return () => {};
});

function Probe() {
  const { status, setRecovering } = useAuth();
  return (
    <>
      <Text testID="status">{status}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="start reset" onPress={() => setRecovering(true)} />
      <Pressable accessibilityRole="button" accessibilityLabel="finish reset" onPress={() => setRecovering(false)} />
    </>
  );
}

async function setup() {
  await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

const status = () => screen.getByTestId('status').props.children;

it('starts loading, then follows the session', async () => {
  await setup();
  expect(status()).toBe('loading');

  await act(async () => emit(true));
  expect(status()).toBe('signedIn');

  await act(async () => emit(false));
  expect(status()).toBe('signedOut');
});

it('is "recovering" while signed in with a password reset in progress', async () => {
  await setup();
  await fireEvent.press(screen.getByRole('button', { name: 'start reset' }));
  await act(async () => emit(true));
  expect(status()).toBe('recovering');

  await fireEvent.press(screen.getByRole('button', { name: 'finish reset' }));
  expect(status()).toBe('signedIn');
});

it('a sign-out ends the reset', async () => {
  await setup();
  await fireEvent.press(screen.getByRole('button', { name: 'start reset' }));
  await act(async () => emit(true));
  await act(async () => emit(false));
  expect(status()).toBe('signedOut');

  await act(async () => emit(true)); // a later normal log-in is not a reset
  expect(status()).toBe('signedIn');
});

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
  const { status, beginReset, endReset } = useAuth();
  return (
    <>
      <Text testID="status">{status}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="begin reset" onPress={beginReset} />
      <Pressable accessibilityRole="button" accessibilityLabel="end reset" onPress={endReset} />
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
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

it('starts loading, then follows the session', async () => {
  await setup();
  expect(status()).toBe('loading');

  await act(async () => emit(true));
  expect(status()).toBe('signedIn');

  await act(async () => emit(false));
  expect(status()).toBe('signedOut');
});

it('a reset link signs in straight into "recovering"', async () => {
  await setup();
  await act(async () => emit(false));
  await press('begin reset');
  expect(status()).toBe('signedOut'); // nothing changes until the link signs in

  await act(async () => emit(true));
  expect(status()).toBe('recovering');

  await press('end reset');
  expect(status()).toBe('signedIn');
});

it('already signed in: the decks stay until the reset link actually signs in', async () => {
  await setup();
  await act(async () => emit(true));
  await press('begin reset');
  expect(status()).toBe('signedIn'); // not torn down yet

  await act(async () => emit(true)); // the link's new session
  expect(status()).toBe('recovering');
});

it('a failed reset link leaves the user where they were', async () => {
  await setup();
  await act(async () => emit(true));
  await press('begin reset');
  await press('end reset'); // the link failed

  await act(async () => emit(true)); // e.g. a later token refresh
  expect(status()).toBe('signedIn');
});

it('signing out ends any reset', async () => {
  await setup();
  await press('begin reset');
  await act(async () => emit(true));
  await act(async () => emit(false));
  expect(status()).toBe('signedOut');

  await act(async () => emit(true)); // a later normal log-in is not a reset
  expect(status()).toBe('signedIn');
});

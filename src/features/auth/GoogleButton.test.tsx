import { fireEvent, render, screen } from '@testing-library/react-native';

import { authRepo } from '@/data/authRepo';
import { isGoogleSignInAvailable } from '@/data/googleAuth';

import { GoogleButton } from './GoogleButton';

jest.mock('@/data/googleAuth', () => ({ isGoogleSignInAvailable: jest.fn() }));
jest.mock('@/data/authRepo', () => ({ authRepo: { signInWithGoogle: jest.fn() } }));

const available = isGoogleSignInAvailable as jest.Mock;
const signInWithGoogle = authRepo.signInWithGoogle as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  available.mockReturnValue(true);
});

it('is hidden where Google sign-in cannot work (Expo Go, no client ID)', async () => {
  available.mockReturnValue(false);
  await render(<GoogleButton />);

  expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull();
  expect(screen.queryByText('or')).toBeNull();
});

it('shows the button with an "or" divider when available', async () => {
  await render(<GoogleButton />);

  expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeTruthy();
  expect(screen.getByText('or')).toBeTruthy();
});

it('signs in with Google when pressed', async () => {
  signInWithGoogle.mockResolvedValue({ ok: true, data: 'signedIn' });
  await render(<GoogleButton />);

  await fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

  expect(signInWithGoogle).toHaveBeenCalledTimes(1);
});

it('shows nothing when the user closes the Google picker', async () => {
  signInWithGoogle.mockResolvedValue({ ok: true, data: 'cancelled' });
  await render(<GoogleButton />);

  await fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

  expect(screen.queryByText("No connection. Try again when you're online.")).toBeNull();
  expect(screen.queryByText('Something went wrong. Please try again.')).toBeNull();
});

it('shows the error message when sign-in fails', async () => {
  signInWithGoogle.mockResolvedValue({
    ok: false,
    error: "No connection. Try again when you're online.",
  });
  await render(<GoogleButton />);

  await fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

  expect(await screen.findByText("No connection. Try again when you're online.")).toBeTruthy();
});

it('clears an old error when trying again', async () => {
  signInWithGoogle
    .mockResolvedValueOnce({ ok: false, error: 'Something went wrong. Please try again.' })
    .mockResolvedValueOnce({ ok: true, data: 'cancelled' });
  await render(<GoogleButton />);

  await fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
  await screen.findByText('Something went wrong. Please try again.');
  await fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

  expect(screen.queryByText('Something went wrong. Please try again.')).toBeNull();
});

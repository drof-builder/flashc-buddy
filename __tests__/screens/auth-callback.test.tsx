import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import AuthCallbackScreen from '@/app/auth-callback';
import { authRepo } from '@/data/authRepo';

const mockReplace = jest.fn();
let mockUrl: string | null = null;
let mockStatus = 'signedOut';
const mockBeginReset = jest.fn();
const mockEndReset = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  }),
}));
jest.mock('expo-linking', () => ({ useLinkingURL: () => mockUrl }));
jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ status: mockStatus, beginReset: mockBeginReset, endReset: mockEndReset }),
}));
jest.mock('@/data/authRepo', () => ({ authRepo: { completeAuthLink: jest.fn() } }));

const complete = authRepo.completeAuthLink as jest.Mock;
const recoveryLink = 'flashcbuddy://auth-callback#access_token=AT&refresh_token=RT&type=recovery';
const signupLink = 'flashcbuddy://auth-callback#access_token=AT&refresh_token=RT&type=signup';
const EXPIRED = 'This link has expired. Request a new one.';
const OFFLINE = "No connection. Try again when you're online.";

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus = 'signedOut';
});

it('a password-reset link marks the reset BEFORE signing in, then opens Set new password', async () => {
  mockUrl = recoveryLink;
  complete.mockImplementation(async () => {
    expect(mockBeginReset).toHaveBeenCalled(); // already marked
    return { ok: true, data: 'recovery' };
  });
  await render(<AuthCallbackScreen />);

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/set-password'));
  expect(complete).toHaveBeenCalledWith(recoveryLink);
});

it('a confirmation link signs in and goes to the decks', async () => {
  mockUrl = signupLink;
  complete.mockResolvedValue({ ok: true, data: 'signup' });
  await render(<AuthCallbackScreen />);

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  expect(mockBeginReset).not.toHaveBeenCalled();
});

it('an expired link shows the message and clears the reset', async () => {
  mockUrl = recoveryLink;
  complete.mockResolvedValue({ ok: false, error: EXPIRED });
  await render(<AuthCallbackScreen />);

  expect(await screen.findByText(EXPIRED)).toBeTruthy();
  expect(mockEndReset).toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});

it('signed out when a link fails: goes back to log in', async () => {
  mockUrl = recoveryLink;
  complete.mockResolvedValue({ ok: false, error: EXPIRED });
  await render(<AuthCallbackScreen />);

  await fireEvent.press(await screen.findByRole('button', { name: 'Back to log in' }));
  expect(mockReplace).toHaveBeenCalledWith('/login');
});

it('signed in when a link fails: offers a way back to the decks (no dead end)', async () => {
  mockStatus = 'signedIn';
  mockUrl = recoveryLink;
  complete.mockResolvedValue({ ok: false, error: OFFLINE });
  await render(<AuthCallbackScreen />);

  await fireEvent.press(await screen.findByRole('button', { name: 'Back to decks' }));
  expect(mockReplace).toHaveBeenCalledWith('/');
});

it('opened without a link: explains instead of spinning forever', async () => {
  mockUrl = null;
  await render(<AuthCallbackScreen />);

  expect(await screen.findByText('This link is not valid. Open the latest email again.')).toBeTruthy();
  expect(complete).not.toHaveBeenCalled();
});

it('a crash while opening the link shows an error instead of spinning', async () => {
  mockUrl = signupLink;
  complete.mockRejectedValue(new Error('boom'));
  await render(<AuthCallbackScreen />);

  expect(await screen.findByText('Something went wrong. Please try again.')).toBeTruthy();
});

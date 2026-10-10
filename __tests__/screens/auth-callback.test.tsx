import { render, screen, waitFor } from '@testing-library/react-native';

import AuthCallbackScreen from '@/app/auth-callback';
import { authRepo } from '@/data/authRepo';

const mockReplace = jest.fn();
let mockUrl: string | null = null;
const mockSetRecovering = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
}));
jest.mock('expo-linking', () => ({ useLinkingURL: () => mockUrl }));
jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ status: 'signedOut', setRecovering: mockSetRecovering }),
}));
jest.mock('@/data/authRepo', () => ({ authRepo: { completeAuthLink: jest.fn() } }));

const complete = authRepo.completeAuthLink as jest.Mock;
const recoveryLink = 'flashcbuddy://auth-callback#access_token=AT&refresh_token=RT&type=recovery';
const signupLink = 'flashcbuddy://auth-callback#access_token=AT&refresh_token=RT&type=signup';

beforeEach(() => jest.clearAllMocks());

it('a password-reset link marks the reset BEFORE signing in, then opens Set new password', async () => {
  mockUrl = recoveryLink;
  complete.mockImplementation(async () => {
    expect(mockSetRecovering).toHaveBeenCalledWith(true); // already marked
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
  expect(mockSetRecovering).not.toHaveBeenCalledWith(true);
});

it('an expired link shows the message and a way to ask for a new one', async () => {
  mockUrl = 'flashcbuddy://auth-callback#error=access_denied&error_code=otp_expired';
  complete.mockResolvedValue({ ok: false, error: 'This link has expired. Request a new one.' });
  await render(<AuthCallbackScreen />);

  expect(await screen.findByText('This link has expired. Request a new one.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Back to log in' })).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});

it('a failed reset link clears the reset state', async () => {
  mockUrl = recoveryLink;
  complete.mockResolvedValue({ ok: false, error: 'This link has expired. Request a new one.' });
  await render(<AuthCallbackScreen />);

  await screen.findByText('This link has expired. Request a new one.');
  expect(mockSetRecovering).toHaveBeenLastCalledWith(false);
});

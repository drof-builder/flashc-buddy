import { fireEvent, render, screen } from '@testing-library/react-native';

import SetPasswordScreen from '@/app/(recovery)/set-password';
import { authRepo } from '@/data/authRepo';
import { showToast } from '@/ui/Toast';

const mockEndReset = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ status: 'recovering', beginReset: jest.fn(), endReset: mockEndReset }),
}));
jest.mock('@/data/authRepo', () => ({
  authRepo: { updatePassword: jest.fn(), signOut: jest.fn() },
}));
jest.mock('@/ui/Toast', () => ({ showToast: jest.fn() }));

const updatePassword = authRepo.updatePassword as jest.Mock;
const signOut = authRepo.signOut as jest.Mock;

beforeEach(() => jest.clearAllMocks());

async function fill(password: string, confirm: string) {
  await fireEvent.changeText(screen.getByLabelText('New password'), password);
  await fireEvent.changeText(screen.getByLabelText('Confirm new password'), confirm);
  await fireEvent.press(screen.getByRole('button', { name: 'Save new password' }));
}

it('requires 8+ characters and matching passwords', async () => {
  await render(<SetPasswordScreen />);
  await fill('short', 'other');

  expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy();
  expect(screen.getByText("Passwords don't match.")).toBeTruthy();
  expect(updatePassword).not.toHaveBeenCalled();
});

it('saves the password, confirms, and ends the reset (app goes to the decks)', async () => {
  updatePassword.mockResolvedValue({ ok: true, data: undefined });
  await render(<SetPasswordScreen />);
  await fill('newpassword1', 'newpassword1');

  expect(updatePassword).toHaveBeenCalledWith('newpassword1');
  expect(showToast).toHaveBeenCalledWith('Password updated.');
  expect(mockEndReset).toHaveBeenCalled();
});

it('shows a server error and stays on the screen', async () => {
  updatePassword.mockResolvedValue({
    ok: false,
    error: 'Choose a password different from your old one.',
  });
  await render(<SetPasswordScreen />);
  await fill('newpassword1', 'newpassword1');

  expect(await screen.findByText('Choose a password different from your old one.')).toBeTruthy();
  expect(mockEndReset).not.toHaveBeenCalled();
});

it('Cancel logs out so a half-finished reset never leaves you signed in', async () => {
  signOut.mockResolvedValue({ ok: true, data: undefined });
  await render(<SetPasswordScreen />);

  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

  expect(signOut).toHaveBeenCalled();
  expect(mockEndReset).toHaveBeenCalled();
});

import { fireEvent, render, screen } from '@testing-library/react-native';

import ForgotPasswordScreen from '@/app/(auth)/forgot-password';
import { authRepo } from '@/data/authRepo';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));
jest.mock('@/data/authRepo', () => ({ authRepo: { requestPasswordReset: jest.fn() } }));

const requestReset = authRepo.requestPasswordReset as jest.Mock;
const SENT = 'If an account exists for this email, we sent a reset link.';

beforeEach(() => jest.clearAllMocks());

async function send(email: string) {
  await fireEvent.changeText(screen.getByLabelText('Email'), email);
  await fireEvent.press(screen.getByRole('button', { name: 'Send reset link' }));
}

it('does not send for an invalid email', async () => {
  await render(<ForgotPasswordScreen />);
  await send('nope');

  expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
  expect(requestReset).not.toHaveBeenCalled();
});

it('sends the reset link and shows the same message whether or not the account exists', async () => {
  requestReset.mockResolvedValue({ ok: true, data: undefined });
  await render(<ForgotPasswordScreen />);
  await send(' me@example.com ');

  expect(requestReset).toHaveBeenCalledWith(' me@example.com ');
  expect(await screen.findByText(SENT)).toBeTruthy();
});

it('then waits 60 s before allowing another send', async () => {
  requestReset.mockResolvedValue({ ok: true, data: undefined });
  await render(<ForgotPasswordScreen />);
  await send('me@example.com');

  expect(await screen.findByRole('button', { name: 'Resend link (60s)' })).toBeDisabled();
});

it('shows errors such as no connection', async () => {
  requestReset.mockResolvedValue({ ok: false, error: "No connection. Try again when you're online." });
  await render(<ForgotPasswordScreen />);
  await send('me@example.com');

  expect(await screen.findByText("No connection. Try again when you're online.")).toBeTruthy();
  expect(screen.queryByText(SENT)).toBeNull();
});

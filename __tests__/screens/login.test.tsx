import { fireEvent, render, screen } from '@testing-library/react-native';

import { authRepo } from '@/data/authRepo';

import LoginScreen from '@/app/(auth)/login';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => mockCanGoBack,
  }),
}));
jest.mock('@/data/googleAuth', () => ({ isGoogleSignInAvailable: () => true }));
jest.mock('@/data/authRepo', () => ({
  authRepo: { signIn: jest.fn(), resendConfirmation: jest.fn(), signInWithGoogle: jest.fn() },
}));
jest.mock('@/ui/Toast', () => ({ showToast: jest.fn() }));

const signIn = authRepo.signIn as jest.Mock;
const resend = authRepo.resendConfirmation as jest.Mock;

async function logIn(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText('Email'), email);
  await fireEvent.changeText(screen.getByLabelText('Password'), password);
  await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack = true;
});

it('shows the wrong-credentials message', async () => {
  signIn.mockResolvedValue({ ok: false, error: 'Incorrect email or password.' });
  await render(<LoginScreen />);
  await logIn('me@example.com', 'wrongpass');

  expect(await screen.findByText('Incorrect email or password.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Resend email' })).toBeNull();
});

it('offers to resend the confirmation email when not confirmed', async () => {
  signIn.mockResolvedValue({ ok: false, error: 'Please confirm your email first' });
  resend.mockResolvedValue({ ok: true, data: undefined });
  await render(<LoginScreen />);
  await logIn('me@example.com', 'password1');

  expect(await screen.findByText('Please confirm your email first')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Resend email' }));
  expect(resend).toHaveBeenCalledWith('me@example.com');
});

it('does not call signIn with an empty password', async () => {
  await render(<LoginScreen />);
  await logIn('me@example.com', '');

  expect(screen.getByText('Enter your password.')).toBeTruthy();
  expect(signIn).not.toHaveBeenCalled();
});

it('opens sign-up on top of log in, so Back returns here', async () => {
  await render(<LoginScreen />);
  await fireEvent.press(screen.getByRole('link', { name: 'New here? Create an account' }));

  expect(mockPush).toHaveBeenCalledWith('/signup');
  expect(mockReplace).not.toHaveBeenCalled();
});

it('resends to the email that needs confirming, then waits 60 s before allowing another', async () => {
  signIn.mockResolvedValue({ ok: false, error: 'Please confirm your email first' });
  resend.mockResolvedValue({ ok: true, data: undefined });
  await render(<LoginScreen />);
  await logIn('me@example.com', 'password1');
  await screen.findByText('Please confirm your email first');

  // The user edits the email field afterwards: still resend to the right address.
  await fireEvent.changeText(screen.getByLabelText('Email'), 'typo@example.com');
  await fireEvent.press(screen.getByRole('button', { name: 'Resend email' }));

  expect(resend).toHaveBeenCalledWith('me@example.com');
  const button = await screen.findByRole('button', { name: 'Resend email (60s)' });
  expect(button).toBeDisabled();
});

it('offers "Continue with Google" above the email form', async () => {
  await render(<LoginScreen />);

  expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeTruthy();
  expect(screen.getByLabelText('Email')).toBeTruthy();
});

it('has a "Forgot password?" link to the reset screen', async () => {
  await render(<LoginScreen />);
  await fireEvent.press(screen.getByRole('link', { name: 'Forgot password?' }));

  expect(mockPush).toHaveBeenCalledWith('/forgot-password');
});

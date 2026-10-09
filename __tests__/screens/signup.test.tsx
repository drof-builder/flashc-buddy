import { fireEvent, render, screen } from '@testing-library/react-native';

import { authRepo } from '@/data/authRepo';

import SignUpScreen from '@/app/(auth)/signup';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text>{children}</Text>;
  },
}));
jest.mock('@/data/authRepo', () => ({ authRepo: { signUp: jest.fn() } }));

const signUp = authRepo.signUp as jest.Mock;

async function fillForm(email: string, password: string, confirm: string) {
  await fireEvent.changeText(screen.getByLabelText('Email'), email);
  await fireEvent.changeText(screen.getByLabelText('Password'), password);
  await fireEvent.changeText(screen.getByLabelText('Confirm password'), confirm);
}

beforeEach(() => jest.clearAllMocks());

it("shows Passwords don't match. and sends nothing", async () => {
  await render(<SignUpScreen />);
  await fillForm('me@example.com', 'password1', 'password2');
  await fireEvent.press(screen.getByRole('button', { name: 'Sign up' }));

  expect(screen.getByText("Passwords don't match.")).toBeTruthy();
  expect(signUp).not.toHaveBeenCalled();
});

it('shows field errors for an invalid email and short password', async () => {
  await render(<SignUpScreen />);
  await fillForm('nope', '123', '123');
  await fireEvent.press(screen.getByRole('button', { name: 'Sign up' }));

  expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
  expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy();
  expect(signUp).not.toHaveBeenCalled();
});

it('goes to check-email with the email on success', async () => {
  signUp.mockResolvedValue({ ok: true, data: undefined });
  await render(<SignUpScreen />);
  await fillForm(' me@example.com ', 'password1', 'password1');
  await fireEvent.press(screen.getByRole('button', { name: 'Sign up' }));

  expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/check-email',
    params: { email: 'me@example.com' },
  });
});

it('shows the server error message', async () => {
  signUp.mockResolvedValue({ ok: false, error: 'An account with this email already exists.' });
  await render(<SignUpScreen />);
  await fillForm('me@example.com', 'password1', 'password1');
  await fireEvent.press(screen.getByRole('button', { name: 'Sign up' }));

  expect(await screen.findByText('An account with this email already exists.')).toBeTruthy();
});

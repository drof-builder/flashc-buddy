import { fireEvent, render, screen } from '@testing-library/react-native';

import CheckEmailScreen from '@/app/(auth)/check-email';

const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockCanGoBack = true;
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => mockCanGoBack,
  }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/data/authRepo', () => ({ authRepo: { resendConfirmation: jest.fn() } }));
jest.mock('@/ui/Toast', () => ({ showToast: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack = true;
  mockParams = { email: 'me@example.com' };
});

it('"Back to log in" returns to the log-in screen underneath', async () => {
  await render(<CheckEmailScreen />);
  await fireEvent.press(screen.getByRole('link', { name: 'Back to log in' }));

  expect(mockBack).toHaveBeenCalled();
});

it('"Back to log in" opens log in when there is nothing to go back to', async () => {
  mockCanGoBack = false;
  await render(<CheckEmailScreen />);
  await fireEvent.press(screen.getByRole('link', { name: 'Back to log in' }));

  expect(mockReplace).toHaveBeenCalledWith('/login');
});

it('without an email address, hides Resend and explains what to do', async () => {
  mockParams = {};
  await render(<CheckEmailScreen />);

  expect(screen.queryByRole('button', { name: /Resend email/ })).toBeNull();
  expect(screen.getByText('Go back and log in to resend the email.')).toBeTruthy();
});

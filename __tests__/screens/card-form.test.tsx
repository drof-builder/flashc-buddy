import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import CardFormScreen from '@/app/(main)/deck/[deckId]/card-form';
import { cardsRepo } from '@/data/cardsRepo';

const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => {
  const { View } = jest.requireActual('react-native');
  const Stack = () => null;
  Stack.Screen = () => null;
  return {
    useRouter: () => ({ back: mockBack, push: jest.fn(), replace: jest.fn() }),
    useLocalSearchParams: () => mockParams,
    Stack,
    View,
  };
});
jest.mock('@/data/cardsRepo', () => ({
  cardsRepo: { getCard: jest.fn(), createCard: jest.fn(), updateCard: jest.fn() },
}));
jest.mock('@/ui/Toast', () => ({ showToast: jest.fn() }));

const repo = cardsRepo as unknown as Record<string, jest.Mock>;
const saved = { id: 'c1', deckId: 'd1', front: 'Q', back: 'A', createdAt: '', updatedAt: '' };

async function fill(front: string, back: string) {
  await fireEvent.changeText(screen.getByLabelText('Front'), front);
  await fireEvent.changeText(screen.getByLabelText('Back'), back);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { deckId: 'd1' };
});

it('does not save an empty back', async () => {
  await render(<CardFormScreen />);
  await fill('Capital of France?', '');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(screen.getByText("Back can't be empty.")).toBeTruthy();
  expect(repo.createCard).not.toHaveBeenCalled();
});

it('Save creates the card and goes back', async () => {
  repo.createCard.mockResolvedValue({ ok: true, data: saved });
  await render(<CardFormScreen />);
  await fill('Q', 'A');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(repo.createCard).toHaveBeenCalledWith('d1', 'Q', 'A');
  expect(mockBack).toHaveBeenCalled();
});

it('Save and add another clears the form and stays', async () => {
  repo.createCard.mockResolvedValue({ ok: true, data: saved });
  await render(<CardFormScreen />);
  await fill('Q', 'A');
  await fireEvent.press(screen.getByRole('button', { name: 'Save and add another' }));

  expect(repo.createCard).toHaveBeenCalledWith('d1', 'Q', 'A');
  expect(mockBack).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Front').props.value).toBe('');
  expect(screen.getByLabelText('Back').props.value).toBe('');
});

it('shows the server error and stays on the form', async () => {
  repo.createCard.mockResolvedValue({ ok: false, error: 'This deck no longer exists.' });
  await render(<CardFormScreen />);
  await fill('Q', 'A');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByText('This deck no longer exists.')).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
});

it('edit mode loads the card and updates it', async () => {
  mockParams = { deckId: 'd1', cardId: 'c1' };
  repo.getCard.mockResolvedValue({ ok: true, data: saved });
  repo.updateCard.mockResolvedValue({ ok: true, data: saved });
  await render(<CardFormScreen />);

  await waitFor(() => expect(screen.getByLabelText('Front').props.value).toBe('Q'));
  expect(screen.queryByRole('button', { name: 'Save and add another' })).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Back'), 'A2');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(repo.updateCard).toHaveBeenCalledWith('c1', 'Q', 'A2');
  expect(mockBack).toHaveBeenCalled();
});

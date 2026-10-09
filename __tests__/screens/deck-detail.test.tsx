import { fireEvent, render, screen } from '@testing-library/react-native';

import DeckDetailScreen from '@/app/(main)/deck/[deckId]/index';
import { useCards } from '@/features/cards/useCards';
import { confirm } from '@/ui/confirm';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const Stack = () => null;
  Stack.Screen = () => null;
  return {
    useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
    useLocalSearchParams: () => ({ deckId: 'd1', name: 'Biology' }),
    useFocusEffect: jest.fn(),
    Stack,
  };
});
jest.mock('@/features/cards/useCards', () => ({ useCards: jest.fn() }));
jest.mock('@/ui/confirm', () => ({ confirm: jest.fn() }));
jest.mock('@/ui/Toast', () => ({ showToast: jest.fn() }));

const mockConfirm = confirm as jest.Mock;

function hookState(overrides: Partial<ReturnType<typeof useCards>> = {}) {
  const state = {
    cards: [
      { id: 'c1', deckId: 'd1', front: 'Mitochondria', back: 'Powerhouse', createdAt: '', updatedAt: '' },
    ],
    loading: false,
    error: null,
    refresh: jest.fn(),
    reload: jest.fn(),
    remove: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
  (useCards as jest.Mock).mockReturnValue(state);
  return state;
}

beforeEach(() => jest.clearAllMocks());

it('lists the cards of the deck', async () => {
  hookState();
  await render(<DeckDetailScreen />);

  expect(screen.getByText('Mitochondria')).toBeTruthy();
  expect(screen.getByText('Powerhouse')).toBeTruthy();
});

it('shows an empty state', async () => {
  hookState({ cards: [] });
  await render(<DeckDetailScreen />);

  expect(screen.getByText(/No cards yet/)).toBeTruthy();
});

it('opens the add-card form', async () => {
  hookState();
  await render(<DeckDetailScreen />);

  await fireEvent.press(screen.getByRole('button', { name: 'Add card' }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/deck/[deckId]/card-form',
    params: { deckId: 'd1' },
  });
});

it('opens a card for editing', async () => {
  hookState();
  await render(<DeckDetailScreen />);

  await fireEvent.press(screen.getByRole('button', { name: 'Edit card Mitochondria' }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/deck/[deckId]/card-form',
    params: { deckId: 'd1', cardId: 'c1' },
  });
});

it('asks before deleting a card', async () => {
  const state = hookState();
  mockConfirm.mockResolvedValue(false);
  await render(<DeckDetailScreen />);

  await fireEvent.press(screen.getByRole('button', { name: 'Delete card Mitochondria' }));

  expect(mockConfirm).toHaveBeenCalledWith('Delete card?', expect.any(String), 'Delete');
  expect(state.remove).not.toHaveBeenCalled();
});

it('deletes a card after confirming', async () => {
  const state = hookState();
  mockConfirm.mockResolvedValue(true);
  await render(<DeckDetailScreen />);

  await fireEvent.press(screen.getByRole('button', { name: 'Delete card Mitochondria' }));

  expect(state.remove).toHaveBeenCalledWith('c1');
});

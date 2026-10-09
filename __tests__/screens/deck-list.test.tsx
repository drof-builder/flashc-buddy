import { fireEvent, render, screen } from '@testing-library/react-native';

import DeckListScreen from '@/app/(main)/index';
import { authRepo } from '@/data/authRepo';
import { useDecks } from '@/features/decks/useDecks';
import { confirm } from '@/ui/confirm';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/features/decks/useDecks', () => ({ useDecks: jest.fn() }));
jest.mock('@/data/authRepo', () => ({ authRepo: { signOut: jest.fn() } }));
jest.mock('@/ui/confirm', () => ({ confirm: jest.fn() }));
jest.mock('@/ui/Toast', () => ({ showToast: jest.fn() }));

const mockConfirm = confirm as jest.Mock;
const signOut = authRepo.signOut as jest.Mock;

function hookState(overrides: Partial<ReturnType<typeof useDecks>> = {}) {
  const state = {
    decks: [
      { id: 'd1', name: 'Biology', cardCount: 3, createdAt: '', updatedAt: '' },
      { id: 'd2', name: 'Spanish', cardCount: 1, createdAt: '', updatedAt: '' },
    ],
    loading: false,
    error: null,
    refresh: jest.fn(),
    create: jest.fn().mockResolvedValue(null),
    rename: jest.fn().mockResolvedValue(null),
    remove: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
  (useDecks as jest.Mock).mockReturnValue(state);
  return state;
}

beforeEach(() => jest.clearAllMocks());

it('lists decks with their card counts', async () => {
  hookState();
  await render(<DeckListScreen />);

  expect(screen.getByText('Biology')).toBeTruthy();
  expect(screen.getByText('3 cards')).toBeTruthy();
  expect(screen.getByText('1 card')).toBeTruthy();
});

it('shows an empty state when there are no decks', async () => {
  hookState({ decks: [] });
  await render(<DeckListScreen />);

  expect(screen.getByText(/No decks yet/)).toBeTruthy();
});

it('shows the load error with a retry button', async () => {
  const state = hookState({ decks: [], error: 'No connection.' });
  await render(<DeckListScreen />);

  expect(screen.getByText('No connection.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
  expect(state.refresh).toHaveBeenCalled();
});

it('creates a deck from the New deck form', async () => {
  const state = hookState();
  await render(<DeckListScreen />);

  await fireEvent.press(screen.getByRole('button', { name: 'New deck' }));
  await fireEvent.changeText(screen.getByLabelText('Deck name'), 'Chemistry');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(state.create).toHaveBeenCalledWith('Chemistry');
});

it('does not create a deck with an empty name', async () => {
  const state = hookState();
  await render(<DeckListScreen />);

  await fireEvent.press(screen.getByRole('button', { name: 'New deck' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(screen.getByText("Name can't be empty.")).toBeTruthy();
  expect(state.create).not.toHaveBeenCalled();
});

it('asks for confirmation with the exact copy before deleting', async () => {
  const state = hookState();
  mockConfirm.mockResolvedValue(false);
  await render(<DeckListScreen />);

  await fireEvent.press(screen.getByRole('button', { name: 'Delete Biology' }));

  expect(mockConfirm).toHaveBeenCalledWith(
    'Delete deck?',
    "Delete 'Biology' and its 3 cards? This can't be undone.",
    'Delete',
  );
  expect(state.remove).not.toHaveBeenCalled();
});

it('deletes after confirming', async () => {
  const state = hookState();
  mockConfirm.mockResolvedValue(true);
  await render(<DeckListScreen />);

  await fireEvent.press(screen.getByRole('button', { name: 'Delete Biology' }));

  expect(state.remove).toHaveBeenCalledWith('d1');
});

it('renames a deck', async () => {
  const state = hookState();
  await render(<DeckListScreen />);

  await fireEvent.press(screen.getByRole('button', { name: 'Rename Biology' }));
  await fireEvent.changeText(screen.getByLabelText('Deck name'), 'Bio 101');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(state.rename).toHaveBeenCalledWith('d1', 'Bio 101');
});

it('logs out only after confirming', async () => {
  hookState();
  mockConfirm.mockResolvedValue(true);
  signOut.mockResolvedValue({ ok: true, data: undefined });
  await render(<DeckListScreen />);

  await fireEvent.press(screen.getByRole('button', { name: 'Log out' }));

  expect(mockConfirm).toHaveBeenCalledWith('Log out?', expect.any(String), 'Log out');
  expect(signOut).toHaveBeenCalled();
});

it('stays logged in when log out is cancelled', async () => {
  hookState();
  mockConfirm.mockResolvedValue(false);
  await render(<DeckListScreen />);

  await fireEvent.press(screen.getByRole('button', { name: 'Log out' }));

  expect(signOut).not.toHaveBeenCalled();
});

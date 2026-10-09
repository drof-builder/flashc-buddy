import { act, renderHook, waitFor } from '@testing-library/react-native';

import { decksRepo } from '@/data/decksRepo';

import { useDecks } from './useDecks';

jest.mock('@/data/decksRepo', () => ({
  decksRepo: {
    listDecks: jest.fn(),
    createDeck: jest.fn(),
    renameDeck: jest.fn(),
    deleteDeck: jest.fn(),
  },
}));

const repo = decksRepo as unknown as Record<string, jest.Mock>;
const deck = { id: 'd1', name: 'Biology', cardCount: 0, createdAt: '', updatedAt: '' };

beforeEach(() => jest.clearAllMocks());

it('loads decks on mount', async () => {
  repo.listDecks.mockResolvedValue({ ok: true, data: [deck] });
  const { result } = await renderHook(() => useDecks());

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.decks).toEqual([deck]);
  expect(result.current.error).toBeNull();
});

it('exposes the load error', async () => {
  repo.listDecks.mockResolvedValue({ ok: false, error: 'No connection.' });
  const { result } = await renderHook(() => useDecks());

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe('No connection.');
});

it('create returns null and refreshes the list on success', async () => {
  repo.listDecks.mockResolvedValueOnce({ ok: true, data: [] });
  repo.listDecks.mockResolvedValueOnce({ ok: true, data: [deck] });
  repo.createDeck.mockResolvedValue({ ok: true, data: deck });
  const { result } = await renderHook(() => useDecks());
  await waitFor(() => expect(result.current.loading).toBe(false));

  let outcome: string | null = 'unset';
  await act(async () => {
    outcome = await result.current.create('Biology');
  });

  expect(outcome).toBeNull();
  expect(result.current.decks).toEqual([deck]);
});

it('remove returns the error message and keeps the list on failure', async () => {
  repo.listDecks.mockResolvedValue({ ok: true, data: [deck] });
  repo.deleteDeck.mockResolvedValue({ ok: false, error: 'No connection.' });
  const { result } = await renderHook(() => useDecks());
  await waitFor(() => expect(result.current.loading).toBe(false));

  let outcome: string | null = null;
  await act(async () => {
    outcome = await result.current.remove('d1');
  });

  expect(outcome).toBe('No connection.');
  expect(result.current.decks).toEqual([deck]);
});

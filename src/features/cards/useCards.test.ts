import { act, renderHook, waitFor } from '@testing-library/react-native';

import { cardsRepo } from '@/data/cardsRepo';

import { useCards } from './useCards';

jest.mock('@/data/cardsRepo', () => ({
  cardsRepo: { listCards: jest.fn(), deleteCard: jest.fn() },
}));

const repo = cardsRepo as unknown as Record<string, jest.Mock>;
const card = { id: 'c1', deckId: 'd1', front: 'Q', back: 'A', createdAt: '', updatedAt: '' };

beforeEach(() => jest.clearAllMocks());

it('loads the deck cards on mount', async () => {
  repo.listCards.mockResolvedValue({ ok: true, data: [card] });
  const { result } = await renderHook(() => useCards('d1'));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(repo.listCards).toHaveBeenCalledWith('d1');
  expect(result.current.cards).toEqual([card]);
});

it('exposes the load error', async () => {
  repo.listCards.mockResolvedValue({ ok: false, error: 'No connection.' });
  const { result } = await renderHook(() => useCards('d1'));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe('No connection.');
});

it('remove deletes the card and reloads the list', async () => {
  repo.listCards.mockResolvedValueOnce({ ok: true, data: [card] });
  repo.listCards.mockResolvedValueOnce({ ok: true, data: [] });
  repo.deleteCard.mockResolvedValue({ ok: true, data: undefined });
  const { result } = await renderHook(() => useCards('d1'));
  await waitFor(() => expect(result.current.loading).toBe(false));

  let outcome: string | null = 'unset';
  await act(async () => {
    outcome = await result.current.remove('c1');
  });

  expect(outcome).toBeNull();
  expect(repo.deleteCard).toHaveBeenCalledWith('c1');
  expect(result.current.cards).toEqual([]);
});

it('remove returns the error and keeps the list on failure', async () => {
  repo.listCards.mockResolvedValue({ ok: true, data: [card] });
  repo.deleteCard.mockResolvedValue({ ok: false, error: 'No connection.' });
  const { result } = await renderHook(() => useCards('d1'));
  await waitFor(() => expect(result.current.loading).toBe(false));

  let outcome: string | null = null;
  await act(async () => {
    outcome = await result.current.remove('c1');
  });

  expect(outcome).toBe('No connection.');
  expect(result.current.cards).toEqual([card]);
});

it('ignores an older, slower load that finishes after a newer one', async () => {
  let finishFirst: (value: unknown) => void = () => {};
  repo.listCards.mockReturnValueOnce(new Promise((resolve) => (finishFirst = resolve)));
  repo.listCards.mockResolvedValueOnce({ ok: true, data: [card] });
  const { result } = await renderHook(() => useCards('d1'));

  await act(async () => {
    await result.current.reload();
  });
  expect(result.current.cards).toEqual([card]);

  await act(async () => {
    finishFirst({ ok: true, data: [] });
  });
  expect(result.current.cards).toEqual([card]);
});

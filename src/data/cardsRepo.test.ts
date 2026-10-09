import { cardsRepo } from './cardsRepo';
import { isOnline } from './network';
import { supabase } from './supabaseClient';
import { argsOf, fakeQuery, type FakeResult } from './testing/fakeSupabase';

jest.mock('./supabaseClient', () => ({ supabase: { from: jest.fn() } }));
jest.mock('./network', () => ({ isOnline: jest.fn() }));

const from = supabase.from as jest.Mock;
const online = isOnline as jest.Mock;

function respondWith(result: FakeResult) {
  const query = fakeQuery(result);
  from.mockReturnValue(query.builder);
  return query.calls;
}

const row = {
  id: 'c1',
  deck_id: 'd1',
  front: 'Q',
  back: 'A',
  created_at: '2026-10-10T00:00:00Z',
  updated_at: '2026-10-10T00:00:00Z',
};
const card = {
  id: 'c1',
  deckId: 'd1',
  front: 'Q',
  back: 'A',
  createdAt: '2026-10-10T00:00:00Z',
  updatedAt: '2026-10-10T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  online.mockResolvedValue(true);
});

it('listCards returns the deck cards oldest first', async () => {
  const calls = respondWith({ data: [row], error: null });

  await expect(cardsRepo.listCards('d1')).resolves.toEqual({ ok: true, data: [card] });
  expect(from).toHaveBeenCalledWith('cards');
  expect(argsOf(calls, 'eq')).toEqual(['deck_id', 'd1']);
  expect(argsOf(calls, 'order')).toEqual(['created_at', { ascending: true }]);
});

it('getCard reports a card that no longer exists', async () => {
  respondWith({ data: null, error: { code: 'PGRST116' } });
  await expect(cardsRepo.getCard('gone')).resolves.toEqual({
    ok: false,
    error: 'This card no longer exists.',
  });
});

it('createCard trims both sides and never sends user_id', async () => {
  const calls = respondWith({ data: row, error: null });

  await expect(cardsRepo.createCard('d1', ' Q ', ' A ')).resolves.toEqual({ ok: true, data: card });
  expect(argsOf(calls, 'insert')).toEqual([{ deck_id: 'd1', front: 'Q', back: 'A' }]);
});

it('createCard explains when the deck was deleted meanwhile', async () => {
  respondWith({ data: null, error: { code: 'P0001', message: 'deck not found' } });
  await expect(cardsRepo.createCard('gone', 'Q', 'A')).resolves.toEqual({
    ok: false,
    error: 'This deck no longer exists.',
  });
});

it('updateCard changes only front and back', async () => {
  const calls = respondWith({ data: row, error: null });

  await cardsRepo.updateCard('c1', ' Q2 ', 'A2');

  expect(argsOf(calls, 'update')).toEqual([{ front: 'Q2', back: 'A2' }]);
  expect(argsOf(calls, 'eq')).toEqual(['id', 'c1']);
});

it('deleteCard deletes by id', async () => {
  const calls = respondWith({ data: null, error: null });

  await expect(cardsRepo.deleteCard('c1')).resolves.toEqual({ ok: true, data: undefined });
  expect(calls.map((c) => c.method)).toEqual(['delete', 'eq']);
});

it('returns the no-connection error when offline', async () => {
  online.mockResolvedValue(false);
  await expect(cardsRepo.createCard('d1', 'Q', 'A')).resolves.toEqual({
    ok: false,
    error: "No connection. Try again when you're online.",
  });
  expect(from).not.toHaveBeenCalled();
});

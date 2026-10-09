import { decksRepo } from './decksRepo';
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
  id: 'd1',
  name: 'Biology',
  created_at: '2026-10-10T00:00:00Z',
  updated_at: '2026-10-10T01:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  online.mockResolvedValue(true);
});

describe('listDecks', () => {
  it('maps rows and card counts to Deck objects, newest first', async () => {
    const calls = respondWith({ data: [{ ...row, cards: [{ count: 3 }] }], error: null });

    await expect(decksRepo.listDecks()).resolves.toEqual({
      ok: true,
      data: [
        {
          id: 'd1',
          name: 'Biology',
          cardCount: 3,
          createdAt: '2026-10-10T00:00:00Z',
          updatedAt: '2026-10-10T01:00:00Z',
        },
      ],
    });
    expect(from).toHaveBeenCalledWith('decks');
    expect(argsOf(calls, 'select')).toEqual(['id, name, created_at, updated_at, cards(count)']);
    expect(argsOf(calls, 'order')).toEqual(['created_at', { ascending: false }]);
  });

  it('returns the no-connection error without querying when offline', async () => {
    online.mockResolvedValue(false);
    await expect(decksRepo.listDecks()).resolves.toEqual({
      ok: false,
      error: "No connection. Try again when you're online.",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('maps a server error to a user message', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    respondWith({ data: null, error: { code: '42501', message: 'permission denied' } });
    await expect(decksRepo.listDecks()).resolves.toEqual({
      ok: false,
      error: 'Something went wrong. Please try again.',
    });
  });
});

describe('createDeck', () => {
  it('saves the trimmed name and never sends user_id', async () => {
    const calls = respondWith({ data: row, error: null });

    const result = await decksRepo.createDeck('  Biology  ');

    expect(argsOf(calls, 'insert')).toEqual([{ name: 'Biology' }]);
    expect(result).toEqual({ ok: true, data: expect.objectContaining({ id: 'd1', cardCount: 0 }) });
  });
});

describe('renameDeck', () => {
  it('updates only the trimmed name of that deck', async () => {
    const calls = respondWith({ data: { ...row, cards: [{ count: 2 }] }, error: null });

    const result = await decksRepo.renameDeck('d1', ' Chem ');

    expect(argsOf(calls, 'update')).toEqual([{ name: 'Chem' }]);
    expect(argsOf(calls, 'eq')).toEqual(['id', 'd1']);
    expect(result).toEqual({ ok: true, data: expect.objectContaining({ cardCount: 2 }) });
  });

  it('reports a deck that no longer exists', async () => {
    respondWith({ data: null, error: { code: 'PGRST116', message: '0 rows' } });
    await expect(decksRepo.renameDeck('gone', 'X')).resolves.toEqual({
      ok: false,
      error: 'This deck no longer exists.',
    });
  });
});

describe('deleteDeck', () => {
  it('deletes by id', async () => {
    const calls = respondWith({ data: null, error: null });

    await expect(decksRepo.deleteDeck('d1')).resolves.toEqual({ ok: true, data: undefined });
    expect(calls.map((c) => c.method)).toEqual(['delete', 'eq']);
    expect(argsOf(calls, 'eq')).toEqual(['id', 'd1']);
  });
});

// Decks in Supabase. The database fills in user_id and enforces ownership (RLS).
import type { Deck, Result } from '@/domain/types';

import { MESSAGES } from './errors';
import { request, unwrap } from './request';
import { supabase } from './supabaseClient';

const DECK_COLUMNS = 'id, name, created_at, updated_at';
// `cards(count)` asks Postgres to count each deck's cards in the same query.
const DECK_WITH_COUNT = `${DECK_COLUMNS}, cards(count)`;

type DeckRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  cards?: { count: number }[];
};

function toDeck(row: DeckRow): Deck {
  return {
    id: row.id,
    name: row.name,
    cardCount: row.cards?.[0]?.count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const notFound = { notFound: MESSAGES.deckNotFound };

function listDecks(): Promise<Result<Deck[]>> {
  return request(async () => {
    const rows = unwrap<DeckRow[]>(
      await supabase
        .from('decks')
        .select(DECK_WITH_COUNT)
        .order('created_at', { ascending: false }),
    );
    return rows.map(toDeck);
  });
}

function createDeck(name: string): Promise<Result<Deck>> {
  return request(async () => {
    const row = unwrap<DeckRow>(
      await supabase.from('decks').insert({ name: name.trim() }).select(DECK_COLUMNS).single(),
    );
    return toDeck(row);
  });
}

function renameDeck(id: string, name: string): Promise<Result<Deck>> {
  return request(async () => {
    const row = unwrap<DeckRow>(
      await supabase
        .from('decks')
        .update({ name: name.trim() })
        .eq('id', id)
        .select(DECK_WITH_COUNT)
        .single(),
    );
    return toDeck(row);
  }, notFound);
}

function deleteDeck(id: string): Promise<Result<void>> {
  return request(async () => {
    unwrap(await supabase.from('decks').delete().eq('id', id));
  });
}

export const decksRepo = { listDecks, createDeck, renameDeck, deleteDeck };

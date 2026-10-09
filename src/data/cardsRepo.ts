// Cards in Supabase. The database copies user_id from the deck (trigger) and
// enforces ownership (RLS), so the app only ever sends deck_id, front and back.
import type { Card, Result } from '@/domain/types';

import { MESSAGES } from './errors';
import { request, unwrap } from './request';
import { supabase } from './supabaseClient';

const CARD_COLUMNS = 'id, deck_id, front, back, created_at, updated_at';

type CardRow = {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  created_at: string;
  updated_at: string;
};

function toCard(row: CardRow): Card {
  return {
    id: row.id,
    deckId: row.deck_id,
    front: row.front,
    back: row.back,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const notFound = { notFound: MESSAGES.cardNotFound };

function listCards(deckId: string): Promise<Result<Card[]>> {
  return request(async () => {
    const rows = unwrap<CardRow[]>(
      await supabase
        .from('cards')
        .select(CARD_COLUMNS)
        .eq('deck_id', deckId)
        .order('created_at', { ascending: true }),
    );
    return rows.map(toCard);
  });
}

function getCard(id: string): Promise<Result<Card>> {
  return request(async () => {
    const row = unwrap<CardRow>(
      await supabase.from('cards').select(CARD_COLUMNS).eq('id', id).single(),
    );
    return toCard(row);
  }, notFound);
}

function createCard(deckId: string, front: string, back: string): Promise<Result<Card>> {
  return request(async () => {
    const row = unwrap<CardRow>(
      await supabase
        .from('cards')
        .insert({ deck_id: deckId, front: front.trim(), back: back.trim() })
        .select(CARD_COLUMNS)
        .single(),
    );
    return toCard(row);
  });
}

/** Only the text changes; study progress (build step 2) is untouched. */
function updateCard(id: string, front: string, back: string): Promise<Result<Card>> {
  return request(async () => {
    const row = unwrap<CardRow>(
      await supabase
        .from('cards')
        .update({ front: front.trim(), back: back.trim() })
        .eq('id', id)
        .select(CARD_COLUMNS)
        .single(),
    );
    return toCard(row);
  }, notFound);
}

function deleteCard(id: string): Promise<Result<void>> {
  return request(async () => {
    unwrap(await supabase.from('cards').delete().eq('id', id));
  });
}

export const cardsRepo = { listCards, getCard, createCard, updateCard, deleteCard };

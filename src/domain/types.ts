// Shared shapes used across the app. Pure TypeScript: no React, no Supabase.

/** What every data-layer function returns instead of throwing. */
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export type Deck = {
  id: string;
  name: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Card = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  createdAt: string;
  updatedAt: string;
};

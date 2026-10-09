// Screen state for one deck's cards. Mirrors useDecks.
// Adding and editing happen on the card form screen, which talks to cardsRepo
// directly; this list reloads when the deck screen comes back into focus.
import { useCallback, useEffect, useRef, useState } from 'react';

import { cardsRepo } from '@/data/cardsRepo';
import type { Card, Result } from '@/domain/types';

export function useCards(deckId: string) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((result: Result<Card[]>) => {
    if (result.ok) {
      setCards(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  // Each fetch gets a number; only the newest one may update the list, so a
  // slow older answer can't overwrite a newer one (e.g. hide a new card).
  const latest = useRef(0);
  const fetchLatest = useCallback(async (): Promise<Result<Card[]> | null> => {
    const id = ++latest.current;
    const result = await cardsRepo.listCards(deckId);
    return id === latest.current ? result : null;
  }, [deckId]);

  /** Reloads quietly (no spinner), e.g. after returning from the card form. */
  const reload = useCallback(async () => {
    const result = await fetchLatest();
    if (result) apply(result);
  }, [apply, fetchLatest]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await reload();
  }, [reload]);

  useEffect(() => {
    let active = true;
    fetchLatest().then((result) => {
      if (active && result) apply(result);
    });
    return () => {
      active = false;
    };
  }, [apply, fetchLatest]);

  const remove = useCallback(
    async (id: string): Promise<string | null> => {
      const result = await cardsRepo.deleteCard(id);
      if (!result.ok) return result.error;
      await reload();
      return null;
    },
    [reload],
  );

  return { cards, loading, error, refresh, reload, remove };
}

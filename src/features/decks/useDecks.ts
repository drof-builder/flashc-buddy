// Screen state for the deck list: the decks, loading, error, and actions.
// Mutations return null on success or the message to show.
import { useCallback, useEffect, useRef, useState } from 'react';

import { decksRepo } from '@/data/decksRepo';
import type { Deck, Result } from '@/domain/types';

export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((result: Result<Deck[]>) => {
    if (result.ok) {
      setDecks(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  // Each fetch gets a number; only the newest one may update the list, so a
  // slow older answer can't overwrite a newer one (e.g. hide a new item).
  const latest = useRef(0);
  const fetchLatest = useCallback(async (): Promise<Result<Deck[]> | null> => {
    const id = ++latest.current;
    const result = await decksRepo.listDecks();
    return id === latest.current ? result : null;
  }, []);

  const load = useCallback(async () => {
    const result = await fetchLatest();
    if (result) apply(result);
  }, [apply, fetchLatest]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  // First load. `loading` starts as true. Ignore the answer if the screen
  // closed before it arrived.
  useEffect(() => {
    let active = true;
    fetchLatest().then((result) => {
      if (active && result) apply(result);
    });
    return () => {
      active = false;
    };
  }, [apply, fetchLatest]);

  // Run a change, then reload the list so counts and order stay correct.
  const mutate = useCallback(
    async (change: () => Promise<Result<unknown>>): Promise<string | null> => {
      const result = await change();
      if (!result.ok) return result.error;
      await load();
      return null;
    },
    [load],
  );

  const create = useCallback((name: string) => mutate(() => decksRepo.createDeck(name)), [mutate]);
  const rename = useCallback(
    (id: string, name: string) => mutate(() => decksRepo.renameDeck(id, name)),
    [mutate],
  );
  const remove = useCallback((id: string) => mutate(() => decksRepo.deleteDeck(id)), [mutate]);

  return { decks, loading, error, refresh, reload: load, create, rename, remove };
}

// Screen state for the deck list: the decks, loading, error, and actions.
// Mutations return null on success or the message to show.
import { useCallback, useEffect, useState } from 'react';

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

  const load = useCallback(async () => apply(await decksRepo.listDecks()), [apply]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  // First load. `loading` starts as true. Ignore the answer if the screen
  // closed before it arrived.
  useEffect(() => {
    let active = true;
    decksRepo.listDecks().then((result) => {
      if (active) apply(result);
    });
    return () => {
      active = false;
    };
  }, [apply]);

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

  return { decks, loading, error, refresh, create, rename, remove };
}

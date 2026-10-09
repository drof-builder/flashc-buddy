import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Calls `reload` whenever the user comes BACK to this screen (e.g. after
 * adding a card), but not on the first visit — the screen's hook already
 * loads once when it mounts.
 */
export function useReloadOnFocus(reload: () => unknown) {
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      reload();
    }, [reload]),
  );
}

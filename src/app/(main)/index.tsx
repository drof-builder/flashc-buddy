import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';

import { authRepo } from '@/data/authRepo';
import type { Deck } from '@/domain/types';
import { DeckForm } from '@/features/decks/DeckForm';
import { useDecks } from '@/features/decks/useDecks';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/theme';
import { showToast } from '@/ui/Toast';
import { useBusy } from '@/ui/useBusy';
import { useReloadOnFocus } from '@/ui/useReloadOnFocus';

const cardsLabel = (n: number) => (n === 1 ? '1 card' : `${n} cards`);

export default function DeckListScreen() {
  const router = useRouter();
  const { decks, loading, error, refresh, reload, create, rename, remove } = useDecks();
  useReloadOnFocus(reload); // card counts change after visiting a deck
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  // Android Back closes an open New/Rename form instead of leaving the app.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!creating && renamingId === null) return false;
        setCreating(false);
        setRenamingId(null);
        return true;
      });
      return () => sub.remove();
    }, [creating, renamingId]),
  );

  const onCreate = async (name: string) => {
    const err = await create(name);
    if (!err) setCreating(false);
    return err;
  };

  const onRename = async (id: string, name: string) => {
    const err = await rename(id, name);
    if (!err) setRenamingId(null);
    return err;
  };

  // One action at a time: a second tap while deleting / logging out is ignored.
  const deleting = useBusy();
  const loggingOut = useBusy();

  const onDelete = (deck: Deck) =>
    deleting.run(async () => {
      const yes = await confirm(
        'Delete deck?',
        `Delete '${deck.name}' and its ${cardsLabel(deck.cardCount)}? This can't be undone.`,
        'Delete',
      );
      if (!yes) return;
      const err = await remove(deck.id);
      if (err) showToast(err);
    });

  const onLogOut = () =>
    loggingOut.run(async () => {
      const yes = await confirm('Log out?', 'You can log back in any time.', 'Log out');
      if (!yes) return;
      const result = await authRepo.signOut();
      // On success the root layout swaps to the login screen by itself.
      if (!result.ok) showToast(result.error);
    });

  return (
    <Screen>
      {creating ? (
        <DeckForm onSubmit={onCreate} onCancel={() => setCreating(false)} />
      ) : (
        <Button title="New deck" onPress={() => setCreating(true)} />
      )}

      {loading && decks.length === 0 ? <ActivityIndicator style={styles.spinner} /> : null}

      {error ? (
        <View style={styles.message}>
          <Text style={styles.error}>{error}</Text>
          <Button title="Retry" variant="secondary" onPress={refresh} />
        </View>
      ) : null}

      {!loading && !error && decks.length === 0 ? (
        <Text style={styles.empty}>No decks yet. Tap “New deck” to create one.</Text>
      ) : null}

      {decks.map((deck) =>
        renamingId === deck.id ? (
          <DeckForm
            key={deck.id}
            initialName={deck.name}
            onSubmit={(name) => onRename(deck.id, name)}
            onCancel={() => setRenamingId(null)}
          />
        ) : (
          <View key={deck.id} style={styles.deck}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${deck.name}`}
              onPress={() =>
                router.push({
                  pathname: '/deck/[deckId]',
                  params: { deckId: deck.id, name: deck.name },
                })
              }
              style={styles.deckText}
            >
              <Text style={styles.deckName}>{deck.name}</Text>
              <Text style={styles.deckCount}>{cardsLabel(deck.cardCount)}</Text>
            </Pressable>
            <SmallButton label="Rename" name={deck.name} onPress={() => setRenamingId(deck.id)} />
            <SmallButton
              label="Delete"
              name={deck.name}
              onPress={() => onDelete(deck)}
              disabled={deleting.busy}
              danger
            />
          </View>
        ),
      )}

      <View style={styles.footer}>
        <Button
          title="Log out"
          variant="secondary"
          onPress={onLogOut}
          loading={loggingOut.busy}
        />
      </View>
    </Screen>
  );
}

function SmallButton(props: {
  label: string;
  name: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${props.label} ${props.name}`}
      accessibilityState={{ disabled: !!props.disabled }}
      disabled={props.disabled}
      onPress={props.onPress}
      hitSlop={8}
      style={[styles.small, props.disabled && styles.inactive]}
    >
      <Text style={[styles.smallText, props.danger && styles.dangerText]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: 24 },
  message: { gap: 8 },
  error: { color: colors.error, fontSize: 15 },
  empty: { color: colors.muted, fontSize: 15, textAlign: 'center', marginTop: 24 },
  deck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  deckText: { flex: 1 },
  deckName: { fontSize: 17, fontWeight: '600', color: colors.text },
  deckCount: { fontSize: 14, color: colors.muted },
  small: { paddingVertical: 6, paddingHorizontal: 4 },
  smallText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  dangerText: { color: colors.danger },
  inactive: { opacity: 0.5 },
  footer: { marginTop: 24 },
});

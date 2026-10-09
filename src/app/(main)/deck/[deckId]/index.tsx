import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Card } from '@/domain/types';
import { useCards } from '@/features/cards/useCards';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/theme';
import { showToast } from '@/ui/Toast';
import { useReloadOnFocus } from '@/ui/useReloadOnFocus';

export default function DeckDetailScreen() {
  const router = useRouter();
  const { deckId, name } = useLocalSearchParams<{ deckId: string; name?: string }>();
  const { cards, loading, error, refresh, reload, remove } = useCards(deckId);
  useReloadOnFocus(reload); // pick up cards added or edited on the form

  const openForm = (cardId?: string) =>
    router.push({
      pathname: '/deck/[deckId]/card-form',
      params: cardId ? { deckId, cardId } : { deckId },
    });

  const onDelete = async (card: Card) => {
    const yes = await confirm(
      'Delete card?',
      'This card and its study history will be removed.',
      'Delete',
    );
    if (!yes) return;
    const err = await remove(card.id);
    if (err) showToast(err);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: name ?? 'Deck' }} />
      <Button title="Add card" onPress={() => openForm()} />

      {loading && cards.length === 0 ? <ActivityIndicator style={styles.spinner} /> : null}

      {error ? (
        <View style={styles.message}>
          <Text style={styles.error}>{error}</Text>
          <Button title="Retry" variant="secondary" onPress={refresh} />
        </View>
      ) : null}

      {!loading && !error && cards.length === 0 ? (
        <Text style={styles.empty}>No cards yet. Tap “Add card” to write your first one.</Text>
      ) : null}

      {cards.map((card) => (
        <View key={card.id} style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit card ${card.front}`}
            onPress={() => openForm(card.id)}
            style={styles.cardText}
          >
            <Text style={styles.front}>{card.front}</Text>
            <Text style={styles.back}>{card.back}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete card ${card.front}`}
            onPress={() => onDelete(card)}
            hitSlop={8}
          >
            <Text style={styles.delete}>Delete</Text>
          </Pressable>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: 24 },
  message: { gap: 8 },
  error: { color: colors.error, fontSize: 15 },
  empty: { color: colors.muted, fontSize: 15, textAlign: 'center', marginTop: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  cardText: { flex: 1, gap: 4 },
  front: { fontSize: 16, fontWeight: '600', color: colors.text },
  back: { fontSize: 15, color: colors.muted },
  delete: { color: colors.danger, fontSize: 14, fontWeight: '600' },
});

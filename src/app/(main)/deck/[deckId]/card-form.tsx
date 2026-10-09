import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { cardsRepo } from '@/data/cardsRepo';
import type { Card } from '@/domain/types';
import { CardForm } from '@/features/cards/CardForm';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/theme';
import { showToast } from '@/ui/Toast';

export default function CardFormScreen() {
  const router = useRouter();
  const { deckId, cardId } = useLocalSearchParams<{ deckId: string; cardId?: string }>();
  const editing = !!cardId;

  // In edit mode, load the card first.
  const [card, setCard] = useState<Card | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!cardId) return;
    let active = true;
    cardsRepo.getCard(cardId).then((result) => {
      if (!active) return;
      if (result.ok) setCard(result.data);
      else setLoadError(result.error);
    });
    return () => {
      active = false;
    };
  }, [cardId]);

  const onSave = async (front: string, back: string) => {
    const result = cardId
      ? await cardsRepo.updateCard(cardId, front, back)
      : await cardsRepo.createCard(deckId, front, back);
    if (!result.ok) return result.error;
    if (!editing) showToast('Card saved.');
    return null;
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: editing ? 'Edit card' : 'Add card' }} />
      {editing && loadError ? <Text style={styles.error}>{loadError}</Text> : null}
      {editing && !card && !loadError ? <ActivityIndicator /> : null}
      {!editing || card ? (
        <CardForm
          key={card?.id ?? 'new'}
          initialFront={card?.front}
          initialBack={card?.back}
          allowAddAnother={!editing}
          onSave={onSave}
          onDone={() => router.back()}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.error, fontSize: 15 },
});

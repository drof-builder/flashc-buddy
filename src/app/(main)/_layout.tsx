import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Your decks' }} />
      <Stack.Screen name="deck/[deckId]/index" options={{ title: 'Deck' }} />
      <Stack.Screen name="deck/[deckId]/card-form" options={{ title: 'Card' }} />
    </Stack>
  );
}

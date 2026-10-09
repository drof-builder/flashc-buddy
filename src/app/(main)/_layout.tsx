import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Your decks' }} />
    </Stack>
  );
}

import { Stack } from 'expo-router';

export default function RecoveryLayout() {
  return (
    <Stack>
      <Stack.Screen name="set-password" options={{ title: 'Set new password' }} />
    </Stack>
  );
}

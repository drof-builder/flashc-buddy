// "Continue with Google" + an "or" divider, shown above the email form on the
// log-in and sign-up screens. Hidden where Google sign-in can't work (Expo Go,
// missing client ID), so email sign-in is never blocked.
// On success nothing happens here: the root layout sees the new session and
// switches to the deck screens.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { authRepo } from '@/data/authRepo';
import { isGoogleSignInAvailable } from '@/data/googleAuth';
import { Button } from '@/ui/Button';
import { colors } from '@/ui/theme';
import { useBusy } from '@/ui/useBusy';

export function GoogleButton() {
  const [error, setError] = useState<string | null>(null);
  const { busy, run } = useBusy();

  if (!isGoogleSignInAvailable()) return null;

  const onPress = () =>
    run(async () => {
      setError(null);
      const result = await authRepo.signInWithGoogle();
      if (!result.ok) setError(result.error);
    });

  return (
    <View style={styles.container}>
      <Button title="Continue with Google" variant="secondary" onPress={onPress} loading={busy} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.or}>or</Text>
        <View style={styles.line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  error: { color: colors.error, fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  or: { color: colors.muted, fontSize: 14 },
});

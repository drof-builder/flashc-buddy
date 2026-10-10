// Opened by email links: flashcbuddy://auth-callback#… (sign-up confirmation or
// password reset). Reachable whether signed in or out (not in a protected group).
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { authRepo } from '@/data/authRepo';
import { parseAuthLink } from '@/domain/authLink';
import { useAuth } from '@/features/auth/AuthProvider';
import { goToLogin } from '@/features/auth/goToLogin';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const url = Linking.useLinkingURL();
  const { setRecovering } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!url || handled.current === url) return;
    handled.current = url;

    // Mark a reset BEFORE signing in, so the app opens "Set new password",
    // not the decks, the moment the session appears.
    const link = parseAuthLink(url);
    const isReset = link.kind === 'session' && link.type === 'recovery';
    if (isReset) setRecovering(true);

    authRepo.completeAuthLink(url).then((result) => {
      if (!result.ok) {
        if (isReset) setRecovering(false);
        setError(result.error);
        return;
      }
      router.replace(result.data === 'recovery' ? '/set-password' : '/');
    });
  }, [url, router, setRecovering]);

  return (
    <Screen>
      {error ? (
        <>
          <Text style={styles.error}>{error}</Text>
          <Button title="Back to log in" variant="secondary" onPress={() => goToLogin(router)} />
        </>
      ) : (
        <ActivityIndicator size="large" style={styles.spinner} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: 48 },
  error: { color: colors.error, fontSize: 16, lineHeight: 22 },
});

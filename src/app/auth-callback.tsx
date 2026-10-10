// Opened by email links: flashcbuddy://auth-callback#… (sign-up confirmation or
// password reset). Reachable whether signed in or out (not in a protected group).
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { authRepo } from '@/data/authRepo';
import { MESSAGES } from '@/data/errors';
import { parseAuthLink } from '@/domain/authLink';
import { useAuth } from '@/features/auth/AuthProvider';
import { goToLogin } from '@/features/auth/goToLogin';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/theme';

const NO_LINK = 'This link is not valid. Open the latest email again.';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const url = Linking.useLinkingURL();
  const { status, beginReset, endReset } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!url || handled.current === url) return;
    handled.current = url;

    // Mark the reset BEFORE signing in, so the app opens "Set new password",
    // not the decks, the moment the link's session appears.
    const link = parseAuthLink(url);
    const isReset = link.kind === 'session' && link.type === 'recovery';
    if (isReset) beginReset();

    authRepo
      .completeAuthLink(url)
      .then((result) => {
        if (!result.ok) {
          if (isReset) endReset();
          setError(result.error);
          return;
        }
        router.replace(result.data === 'recovery' ? '/set-password' : '/');
      })
      .catch(() => {
        if (isReset) endReset();
        setError(MESSAGES.generic);
      });
  }, [url, router, beginReset, endReset]);

  // Opened without a link (e.g. restored onto this screen): nothing to do.
  const message = error ?? (url ? null : NO_LINK);

  if (!message) {
    return (
      <Screen>
        <ActivityIndicator size="large" style={styles.spinner} />
      </Screen>
    );
  }

  // Always leave a way out: signed-in users go back to their decks.
  const signedIn = status === 'signedIn';
  return (
    <Screen>
      <Text style={styles.error}>{message}</Text>
      <Button
        title={signedIn ? 'Back to decks' : 'Back to log in'}
        variant="secondary"
        onPress={() => (signedIn ? router.replace('/') : goToLogin(router))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: 48 },
  error: { color: colors.error, fontSize: 16, lineHeight: 22 },
});

import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { authRepo } from '@/data/authRepo';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/theme';
import { showToast } from '@/ui/Toast';
import { useBusy } from '@/ui/useBusy';

const COOLDOWN_SECONDS = 60;

export default function CheckEmailScreen() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  // The first email was just sent by sign up, so start in cooldown.
  const [secondsLeft, setSecondsLeft] = useState(COOLDOWN_SECONDS);
  const { busy, run } = useBusy();

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const onResend = () =>
    run(async () => {
      const result = await authRepo.resendConfirmation(email);
      if (result.ok) {
        showToast('Confirmation email sent.');
        setSecondsLeft(COOLDOWN_SECONDS);
      } else {
        showToast(result.error);
      }
    });

  return (
    <Screen>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.body}>
        We sent a confirmation link to {email || 'your email address'}. Open it to confirm your
        account. It may open in your phone&apos;s browser — after that, come back here and log in.
      </Text>
      <Button
        title={secondsLeft > 0 ? `Resend email (${secondsLeft}s)` : 'Resend email'}
        variant="secondary"
        onPress={onResend}
        disabled={secondsLeft > 0}
        loading={busy}
      />
      <Link href="/login" replace style={styles.link}>
        Back to log in
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  body: { fontSize: 16, lineHeight: 22, color: colors.text },
  link: { color: colors.primary, textAlign: 'center', paddingVertical: 8 },
});

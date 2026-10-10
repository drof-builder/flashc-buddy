import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { authRepo } from '@/data/authRepo';
import { goToLogin } from '@/features/auth/goToLogin';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { TextLink } from '@/ui/TextLink';
import { colors } from '@/ui/theme';
import { showToast } from '@/ui/Toast';
import { useBusy } from '@/ui/useBusy';
import { useCooldown, withCountdown } from '@/ui/useCooldown';

const COOLDOWN_SECONDS = 60;

export default function CheckEmailScreen() {
  const router = useRouter();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  // The first email was just sent by sign up, so start in cooldown.
  const cooldown = useCooldown(COOLDOWN_SECONDS, { startActive: true });
  const { busy, run } = useBusy();

  const onResend = () =>
    run(async () => {
      const result = await authRepo.resendConfirmation(email);
      if (result.ok) {
        showToast('Confirmation email sent.');
        cooldown.start();
      } else {
        showToast(result.error);
      }
    });

  return (
    <Screen>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.body}>
        We sent a confirmation link to {email || 'your email address'}. Open it on this
        phone: it confirms your account and signs you in to FlashC Buddy.
      </Text>
      {email ? (
        <Button
          title={withCountdown('Resend email', cooldown.secondsLeft)}
          variant="secondary"
          onPress={onResend}
          disabled={cooldown.secondsLeft > 0}
          loading={busy}
        />
      ) : (
        // Reached without an address (e.g. app restored here): we can't resend.
        <Text style={styles.body}>Go back and log in to resend the email.</Text>
      )}
      <TextLink title="Back to log in" onPress={() => goToLogin(router)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  body: { fontSize: 16, lineHeight: 22, color: colors.text },
});

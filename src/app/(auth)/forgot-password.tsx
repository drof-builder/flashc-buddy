import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { authRepo } from '@/data/authRepo';
import { validateEmail } from '@/domain/validation';
import { goToLogin } from '@/features/auth/goToLogin';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';
import { TextLink } from '@/ui/TextLink';
import { colors } from '@/ui/theme';
import { useBusy } from '@/ui/useBusy';
import { useCooldown, withCountdown } from '@/ui/useCooldown';

// Same message whether or not the email has an account: nobody can use this
// screen to find out who is registered.
const SENT = 'If an account exists for this email, we sent a reset link.';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cooldown = useCooldown(60);
  const { busy, run } = useBusy();

  const onSend = () =>
    run(async () => {
      const invalid = validateEmail(email);
      setEmailError(invalid);
      setError(null);
      if (invalid) return;

      const result = await authRepo.requestPasswordReset(email);
      if (result.ok) {
        setMessage(SENT);
        cooldown.start();
      } else {
        setError(result.error);
      }
    });

  return (
    <Screen>
      <Text style={styles.body}>
        Enter the email you signed up with and we&apos;ll send a link to set a new password.
      </Text>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={emailError}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      {message ? <Text style={styles.sent}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title={withCountdown(message ? 'Resend link' : 'Send reset link', cooldown.secondsLeft)}
        onPress={onSend}
        disabled={cooldown.secondsLeft > 0}
        loading={busy}
      />
      <TextLink title="Back to log in" onPress={() => goToLogin(router)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 22, color: colors.text },
  sent: { fontSize: 15, lineHeight: 21, color: colors.text },
  error: { color: colors.error, fontSize: 15 },
});

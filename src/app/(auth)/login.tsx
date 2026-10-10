import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { authRepo } from '@/data/authRepo';
import { MESSAGES } from '@/data/errors';
import { validateEmail } from '@/domain/validation';
import { GoogleButton } from '@/features/auth/GoogleButton';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';
import { TextLink } from '@/ui/TextLink';
import { colors } from '@/ui/theme';
import { showToast } from '@/ui/Toast';
import { useBusy } from '@/ui/useBusy';
import { useCooldown, withCountdown } from '@/ui/useCooldown';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // The address that needs confirming (the user may edit the field afterwards).
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('');
  const cooldown = useCooldown(60);
  const login = useBusy();
  const resend = useBusy();

  // On success there is nothing to do here: the root layout sees the new
  // session and swaps to the deck screens by itself.
  const onSubmit = () =>
    login.run(async () => {
      const eErr = validateEmail(email);
      const pErr = password.length === 0 ? 'Enter your password.' : null;
      setEmailError(eErr);
      setPasswordError(pErr);
      setFormError(null);
      if (eErr || pErr) return;

      const result = await authRepo.signIn(email, password);
      if (!result.ok) {
        setFormError(result.error);
        if (result.error === MESSAGES.emailNotConfirmed) setUnconfirmedEmail(email.trim());
      }
    });

  const onResend = () =>
    resend.run(async () => {
      const result = await authRepo.resendConfirmation(unconfirmedEmail);
      if (result.ok) cooldown.start();
      showToast(result.ok ? 'Confirmation email sent.' : result.error);
    });

  const needsConfirmation = formError === MESSAGES.emailNotConfirmed;

  return (
    <Screen>
      <GoogleButton />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={emailError}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={passwordError}
        secureTextEntry
        autoComplete="current-password"
      />
      {formError ? <Text style={styles.formError}>{formError}</Text> : null}
      {needsConfirmation ? (
        <Button
          title={withCountdown('Resend email', cooldown.secondsLeft)}
          variant="secondary"
          onPress={onResend}
          disabled={cooldown.secondsLeft > 0}
          loading={resend.busy}
        />
      ) : null}
      <Button title="Log in" onPress={onSubmit} loading={login.busy} />
      <TextLink title="New here? Create an account" onPress={() => router.push('/signup')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  formError: { color: colors.error, fontSize: 15 },
});

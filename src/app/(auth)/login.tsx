import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { authRepo } from '@/data/authRepo';
import { MESSAGES } from '@/data/errors';
import { validateEmail } from '@/domain/validation';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';
import { colors } from '@/ui/theme';
import { showToast } from '@/ui/Toast';
import { useBusy } from '@/ui/useBusy';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
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
      if (!result.ok) setFormError(result.error);
    });

  const onResend = () =>
    resend.run(async () => {
      const result = await authRepo.resendConfirmation(email);
      showToast(result.ok ? 'Confirmation email sent.' : result.error);
    });

  const needsConfirmation = formError === MESSAGES.emailNotConfirmed;

  return (
    <Screen>
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
        <Button title="Resend email" variant="secondary" onPress={onResend} loading={resend.busy} />
      ) : null}
      <Button title="Log in" onPress={onSubmit} loading={login.busy} />
      <Link href="/signup" replace style={styles.link}>
        New here? Create an account
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  formError: { color: colors.error, fontSize: 15 },
  link: { color: colors.primary, textAlign: 'center', paddingVertical: 8 },
});

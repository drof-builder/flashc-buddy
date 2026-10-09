import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { authRepo } from '@/data/authRepo';
import { validateEmail, validatePassword, validatePasswordsMatch } from '@/domain/validation';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';
import { colors } from '@/ui/theme';
import { useBusy } from '@/ui/useBusy';

type FieldErrors = { email?: string | null; password?: string | null; confirm?: string | null };

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const { busy, run } = useBusy();

  const onSubmit = () =>
    run(async () => {
      const errors: FieldErrors = {
        email: validateEmail(email),
        password: validatePassword(password),
        confirm: validatePasswordsMatch(password, confirm),
      };
      setFieldErrors(errors);
      setFormError(null);
      if (errors.email || errors.password || errors.confirm) return;

      const result = await authRepo.signUp(email, password);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      router.replace({ pathname: '/check-email', params: { email: email.trim() } });
    });

  return (
    <Screen>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        secureTextEntry
        autoComplete="new-password"
      />
      <TextField
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        error={fieldErrors.confirm}
        secureTextEntry
        autoComplete="new-password"
      />
      {formError ? <Text style={styles.formError}>{formError}</Text> : null}
      <Button title="Sign up" onPress={onSubmit} loading={busy} />
      <Link href="/login" replace style={styles.link}>
        Already have an account? Log in
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  formError: { color: colors.error, fontSize: 15 },
  link: { color: colors.primary, textAlign: 'center', paddingVertical: 8 },
});

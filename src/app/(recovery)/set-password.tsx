// Shown after a password-reset link signs the user in ('recovering' status).
// Saving ends the reset and the app moves on to the decks; Cancel logs out.
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { authRepo } from '@/data/authRepo';
import { validatePassword, validatePasswordsMatch } from '@/domain/validation';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';
import { colors } from '@/ui/theme';
import { showToast } from '@/ui/Toast';
import { useBusy } from '@/ui/useBusy';

export default function SetPasswordScreen() {
  const { setRecovering } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = useBusy();
  const cancel = useBusy();

  const onSave = () =>
    save.run(async () => {
      const pErr = validatePassword(password);
      const cErr = validatePasswordsMatch(password, confirm);
      setPasswordError(pErr);
      setConfirmError(cErr);
      setError(null);
      if (pErr || cErr) return;

      const result = await authRepo.updatePassword(password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      showToast('Password updated.');
      setRecovering(false); // the root layout now shows the decks
    });

  const onCancel = () =>
    cancel.run(async () => {
      await authRepo.signOut();
      setRecovering(false);
    });

  return (
    <Screen>
      <Text style={styles.body}>Choose a new password for your account.</Text>
      <TextField
        label="New password"
        value={password}
        onChangeText={setPassword}
        error={passwordError}
        secureTextEntry
        autoComplete="new-password"
      />
      <TextField
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        error={confirmError}
        secureTextEntry
        autoComplete="new-password"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Save new password" onPress={onSave} loading={save.busy} />
      <Button title="Cancel" variant="secondary" onPress={onCancel} loading={cancel.busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 22, color: colors.text },
  error: { color: colors.error, fontSize: 15 },
});

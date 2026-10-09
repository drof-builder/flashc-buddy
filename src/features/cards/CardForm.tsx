import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { validateCardSide } from '@/domain/validation';
import { Button } from '@/ui/Button';
import { TextField } from '@/ui/TextField';
import { colors } from '@/ui/theme';
import { useBusy } from '@/ui/useBusy';

type Props = {
  initialFront?: string;
  initialBack?: string;
  /** Show "Save and add another" (only when adding, not editing). */
  allowAddAnother?: boolean;
  /** Returns null on success, or the error message to show. */
  onSave: (front: string, back: string) => Promise<string | null>;
  /** Called after a successful plain "Save". */
  onDone: () => void;
};

export function CardForm({
  initialFront = '',
  initialBack = '',
  allowAddAnother = false,
  onSave,
  onDone,
}: Props) {
  const [front, setFront] = useState(initialFront);
  const [back, setBack] = useState(initialBack);
  const [frontError, setFrontError] = useState<string | null>(null);
  const [backError, setBackError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { busy, run } = useBusy();

  const save = (addAnother: boolean) =>
    run(async () => {
      const fErr = validateCardSide(front, 'Front');
      const bErr = validateCardSide(back, 'Back');
      setFrontError(fErr);
      setBackError(bErr);
      setFormError(null);
      if (fErr || bErr) return;

      const error = await onSave(front, back);
      if (error) {
        setFormError(error);
        return;
      }
      if (addAnother) {
        setFront('');
        setBack('');
      } else {
        onDone();
      }
    });

  return (
    <View style={styles.container}>
      <TextField label="Front" value={front} onChangeText={setFront} error={frontError} multiline />
      <TextField label="Back" value={back} onChangeText={setBack} error={backError} multiline />
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <Button title="Save" onPress={() => save(false)} loading={busy} />
      {allowAddAnother ? (
        <Button
          title="Save and add another"
          variant="secondary"
          onPress={() => save(true)}
          disabled={busy}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  error: { color: colors.error, fontSize: 15 },
});

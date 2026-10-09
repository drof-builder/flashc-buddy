import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { validateDeckName } from '@/domain/validation';
import { Button } from '@/ui/Button';
import { TextField } from '@/ui/TextField';
import { useBusy } from '@/ui/useBusy';

type Props = {
  initialName?: string;
  /** Returns null on success, or the error message to show. */
  onSubmit: (name: string) => Promise<string | null>;
  onCancel: () => void;
};

/** Inline form used for both "New deck" and "Rename". */
export function DeckForm({ initialName = '', onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const { busy, run } = useBusy();

  const save = () =>
    run(async () => {
      const invalid = validateDeckName(name);
      setError(invalid);
      if (invalid) return;
      setError(await onSubmit(name));
    });

  return (
    <View style={styles.container}>
      <TextField label="Deck name" value={name} onChangeText={setName} error={error} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <Button title="Cancel" variant="secondary" onPress={onCancel} />
        </View>
        <View style={styles.flex}>
          <Button title="Save" onPress={save} loading={busy} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
});

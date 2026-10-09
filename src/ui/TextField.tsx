import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors } from './theme';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  secureTextEntry?: boolean;
} & Pick<TextInputProps, 'autoCapitalize' | 'keyboardType' | 'autoComplete' | 'multiline'>;

export function TextField({ label, error, multiline, ...inputProps }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[styles.input, multiline && styles.multiline, !!error && styles.inputError]}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  inputError: { borderColor: colors.error },
  error: { color: colors.error, fontSize: 13 },
});

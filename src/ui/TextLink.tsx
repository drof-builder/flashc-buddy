import { StyleSheet, Text } from 'react-native';

import { colors } from './theme';

/** A tappable line of text, e.g. "Already have an account? Log in". */
export function TextLink({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Text accessibilityRole="link" onPress={onPress} suppressHighlighting style={styles.link}>
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.primary, textAlign: 'center', paddingVertical: 8, fontSize: 15 },
});

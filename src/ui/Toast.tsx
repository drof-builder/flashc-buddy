// Small non-blocking messages ("Email sent.", "No connection...") that
// disappear after 2.5 seconds. Mount <ToastHost /> once in the root layout,
// then call showToast() from anywhere.
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const DURATION_MS = 2500;
type Listener = (message: string) => void;
const listeners = new Set<Listener>();

export function showToast(message: string): void {
  listeners.forEach((listener) => listener(message));
}

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const listener: Listener = (next) => {
      setMessage(next);
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), DURATION_MS);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      clearTimeout(timer);
    };
  }, []);

  if (!message) return null;
  return (
    <View pointerEvents="none" style={styles.container}>
      <Text accessibilityRole="alert" style={styles.text}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 16, right: 16, bottom: 48, alignItems: 'center' },
  text: {
    backgroundColor: '#111827',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
    fontSize: 15,
  },
});

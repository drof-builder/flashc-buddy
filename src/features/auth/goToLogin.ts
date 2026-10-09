import type { useRouter } from 'expo-router';

/**
 * Return to the log-in screen. Log in is the bottom of the auth stack, so go
 * BACK to it when possible; replacing would leave nothing underneath and
 * Android's Back button would then close the app.
 */
export function goToLogin(router: ReturnType<typeof useRouter>) {
  if (router.canGoBack()) router.back();
  else router.replace('/login');
}

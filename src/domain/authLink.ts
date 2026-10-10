// Reads the link Supabase sends back to the app after an email link is tapped:
//   flashcbuddy://auth-callback#access_token=…&refresh_token=…&type=recovery
//   flashcbuddy://auth-callback#error=access_denied&error_code=otp_expired&…
// Pure logic: no React, no Supabase.

export type AuthLinkType = 'recovery' | 'signup';

export type AuthLink =
  | { kind: 'session'; accessToken: string; refreshToken: string; type: AuthLinkType }
  | { kind: 'error'; code: string }
  | { kind: 'invalid' };

/** Reads key=value pairs from both the ?query and the #fragment of a URL. */
function readParams(url: string): Map<string, string> {
  const params = new Map<string, string>();
  const parts = [url.split('#')[1] ?? '', (url.split('#')[0].split('?')[1] ?? '')];
  for (const part of parts) {
    for (const pair of part.split('&')) {
      if (!pair) continue;
      const [key, value = ''] = pair.split('=');
      // decodeURIComponent keeps '+' as '+' (tokens may contain it).
      params.set(decodeURIComponent(key), decodeURIComponent(value));
    }
  }
  return params;
}

export function parseAuthLink(url: string): AuthLink {
  let params: Map<string, string>;
  try {
    params = readParams(url);
  } catch {
    return { kind: 'invalid' }; // malformed %-encoding: any app can open our scheme
  }

  const errorCode = params.get('error_code') || params.get('error');
  if (errorCode) return { kind: 'error', code: errorCode };

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return { kind: 'invalid' };

  const type: AuthLinkType = params.get('type') === 'recovery' ? 'recovery' : 'signup';
  return { kind: 'session', accessToken, refreshToken, type };
}

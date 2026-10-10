import { parseAuthLink } from './authLink';

const base = 'flashcbuddy://auth-callback';

describe('parseAuthLink', () => {
  it('reads a password-reset link (tokens in the # part)', () => {
    expect(
      parseAuthLink(`${base}#access_token=AT&refresh_token=RT&expires_in=3600&type=recovery`),
    ).toEqual({ kind: 'session', accessToken: 'AT', refreshToken: 'RT', type: 'recovery' });
  });

  it('reads a sign-up confirmation link', () => {
    expect(parseAuthLink(`${base}#access_token=AT&refresh_token=RT&type=signup`)).toEqual({
      kind: 'session',
      accessToken: 'AT',
      refreshToken: 'RT',
      type: 'signup',
    });
  });

  it('also accepts tokens in the ? part', () => {
    expect(parseAuthLink(`${base}?access_token=AT&refresh_token=RT&type=recovery`)).toEqual({
      kind: 'session',
      accessToken: 'AT',
      refreshToken: 'RT',
      type: 'recovery',
    });
  });

  it('treats an unknown or missing type as a sign-in (not a reset)', () => {
    expect(parseAuthLink(`${base}#access_token=AT&refresh_token=RT`)).toMatchObject({
      kind: 'session',
      type: 'signup',
    });
  });

  it('reads an expired-link error', () => {
    expect(
      parseAuthLink(
        `${base}#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`,
      ),
    ).toEqual({ kind: 'error', code: 'otp_expired' });
  });

  it('uses the error name when there is no error code', () => {
    expect(parseAuthLink(`${base}?error=access_denied`)).toEqual({
      kind: 'error',
      code: 'access_denied',
    });
  });

  it('rejects a link with only one of the two tokens', () => {
    expect(parseAuthLink(`${base}#access_token=AT&type=recovery`)).toEqual({ kind: 'invalid' });
  });

  it('rejects a link with nothing in it', () => {
    expect(parseAuthLink(base)).toEqual({ kind: 'invalid' });
    expect(parseAuthLink('')).toEqual({ kind: 'invalid' });
  });

  it('decodes URL-encoded tokens', () => {
    expect(parseAuthLink(`${base}#access_token=a%2Bb&refresh_token=c%3Dd&type=recovery`)).toEqual({
      kind: 'session',
      accessToken: 'a+b',
      refreshToken: 'c=d',
      type: 'recovery',
    });
  });
});

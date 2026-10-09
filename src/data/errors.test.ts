import { MESSAGES, toUserMessage } from './errors';

describe('toUserMessage', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps wrong email or password', () => {
    expect(toUserMessage({ code: 'invalid_credentials' })).toBe('Incorrect email or password.');
  });

  it('maps unconfirmed email', () => {
    expect(toUserMessage({ code: 'email_not_confirmed' })).toBe('Please confirm your email first');
  });

  it('maps an already registered email', () => {
    expect(toUserMessage({ code: 'user_already_exists' })).toBe(
      'An account with this email already exists.',
    );
  });

  it('maps too many emails sent', () => {
    expect(toUserMessage({ code: 'over_email_send_rate_limit' })).toBe(MESSAGES.tooManyEmails);
  });

  it('maps a missing deck (raised by the cards trigger)', () => {
    expect(toUserMessage({ code: 'P0001', message: 'deck not found' })).toBe(MESSAGES.deckNotFound);
  });

  it('maps a network failure (fetch TypeError)', () => {
    expect(toUserMessage(new TypeError('Network request failed'))).toBe(
      "No connection. Try again when you're online.",
    );
  });

  it('maps a Supabase auth network failure', () => {
    expect(toUserMessage({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' })).toBe(
      MESSAGES.noConnection,
    );
  });

  it('maps a request that timed out (stalled connection)', () => {
    const error = new Error('timed out');
    error.name = 'TimeoutError';
    expect(toUserMessage(error)).toBe(MESSAGES.timeout);
  });

  it('falls back to a generic message and logs the original', () => {
    expect(toUserMessage('weird')).toBe('Something went wrong. Please try again.');
    expect(console.error).toHaveBeenCalledWith('weird');
  });
});

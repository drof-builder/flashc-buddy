import {
  textLength,
  validateCardSide,
  validateDeckName,
  validateEmail,
  validatePassword,
  validatePasswordsMatch,
} from './validation';

describe('textLength', () => {
  it('ignores leading and trailing spaces', () => {
    expect(textLength('  Biology  ')).toBe(7);
  });

  it('counts an emoji as one character, like the database does', () => {
    // '😀'.length is 2 in JavaScript (two UTF-16 units) but Postgres counts 1.
    expect(textLength('😀😀')).toBe(2);
  });
});

describe('validateDeckName (Story 4)', () => {
  it('rejects an empty name', () => {
    expect(validateDeckName('')).toBe("Name can't be empty.");
  });

  it('rejects a name of only spaces', () => {
    expect(validateDeckName('   ')).toBe("Name can't be empty.");
  });

  it('accepts a name with spaces around it', () => {
    expect(validateDeckName('  Biology  ')).toBeNull();
  });

  it('accepts exactly 100 characters', () => {
    expect(validateDeckName('a'.repeat(100))).toBeNull();
  });

  it('rejects 101 characters', () => {
    expect(validateDeckName('a'.repeat(101))).toBe('Name must be 100 characters or fewer.');
  });

  it('accepts 100 emoji (same limit as the database)', () => {
    expect(validateDeckName('😀'.repeat(100))).toBeNull();
  });

  it('rejects 101 emoji', () => {
    expect(validateDeckName('😀'.repeat(101))).toBe('Name must be 100 characters or fewer.');
  });
});

describe('validateCardSide (Story 7)', () => {
  it('rejects an empty front', () => {
    expect(validateCardSide('', 'Front')).toBe("Front can't be empty.");
  });

  it('rejects a back of only spaces', () => {
    expect(validateCardSide('   ', 'Back')).toBe("Back can't be empty.");
  });

  it('accepts exactly 500 characters', () => {
    expect(validateCardSide('b'.repeat(500), 'Back')).toBeNull();
  });

  it('rejects 501 characters', () => {
    expect(validateCardSide('b'.repeat(501), 'Back')).toBe('Back must be 500 characters or fewer.');
  });

  it('accepts normal text', () => {
    expect(validateCardSide('ok', 'Back')).toBeNull();
  });
});

describe('validateEmail (Story 1)', () => {
  it('rejects text without @', () => {
    expect(validateEmail('not-an-email')).toBe('Enter a valid email address.');
  });

  it('rejects an address without a domain dot', () => {
    expect(validateEmail('me@example')).toBe('Enter a valid email address.');
  });

  it('accepts a normal address, ignoring surrounding spaces', () => {
    expect(validateEmail(' me@example.com ')).toBeNull();
  });
});

describe('validatePassword (Story 1)', () => {
  it('rejects 7 characters', () => {
    expect(validatePassword('1234567')).toBe('Password must be at least 8 characters.');
  });

  it('accepts 8 characters', () => {
    expect(validatePassword('12345678')).toBeNull();
  });
});

describe('validatePasswordsMatch (Story 1)', () => {
  it('rejects different passwords', () => {
    expect(validatePasswordsMatch('abcdefgh', 'abcdefgX')).toBe("Passwords don't match.");
  });

  it('accepts identical passwords', () => {
    expect(validatePasswordsMatch('abcdefgh', 'abcdefgh')).toBeNull();
  });
});

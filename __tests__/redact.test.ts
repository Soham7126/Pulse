import { describe, expect, it } from '@jest/globals';

import { redact } from '../src/ingest/redact';

describe('redact', () => {
  it.each([
    ['Your OTP is 482913. Do not share.', 'Your OTP is ••••. Do not share.'],
    ['Code 4829 for login', 'Code •••• for login'],
    ['Use 123 456 to verify', 'Use •••• to verify'],
    ['Use 123-456 to verify', 'Use •••• to verify'],
    ['A/c XX12345678 debited', 'A/c XX•••• debited'],
    ['Call +91 98765 43210', 'Call +91 •••• ••••'],
  ])('masks sensitive digits: %s', (input, expected) => {
    expect(redact(input)).toBe(expected);
  });

  it.each([
    'Meet at 4:30 PM tomorrow',
    'Order of 3 items arriving today',
    'Room 101',
  ])('leaves short numbers alone: %s', (input) => {
    expect(redact(input)).toBe(input);
  });

  it('passes null through', () => {
    expect(redact(null)).toBeNull();
  });
});

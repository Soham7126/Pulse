import { REDACTION_MASK } from '../config/constants';

// Digit runs of 4+ (OTPs, account/card/phone numbers) and 3+3 grouped codes like "123 456" / "123-456".
// ponytail: also masks years and plain amounts ("Rs 12000"); accepted since privacy beats fidelity here.
const SENSITIVE_DIGITS = /\d{3}[ -]\d{3}(?!\d)|\d{4,}/g;

export function redact(text: string | null): string | null {
  return text === null ? null : text.replace(SENSITIVE_DIGITS, REDACTION_MASK);
}

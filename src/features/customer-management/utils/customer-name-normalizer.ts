const TURKISH_I_PATTERN = /[\u0130\u0131]/g;
const COMBINING_MARKS_PATTERN = /[\u0300-\u036f]/g;
const WHITESPACE_PATTERN = /\s+/g;

export function normalizeCustomerNameToEnglishUpper(value: string): string {
  return value
    .trim()
    .replace(TURKISH_I_PATTERN, 'I')
    .normalize('NFD')
    .replace(COMBINING_MARKS_PATTERN, '')
    .toUpperCase()
    .replace(WHITESPACE_PATTERN, ' ');
}

const COMBINING_MARKS_PATTERN = /[\u0300-\u036f]/g;
const WHITESPACE_PATTERN = /\s+/g;

export function normalizeCustomerNameToEnglishCharacters(value: string): string {
  return value
    .trim()
    .replace(/\u0130/g, 'I')
    .replace(/\u0131/g, 'i')
    .normalize('NFD')
    .replace(COMBINING_MARKS_PATTERN, '')
    .replace(WHITESPACE_PATTERN, ' ');
}

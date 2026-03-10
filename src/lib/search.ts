export function normalizeSearchValue(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesSearchTerm(searchTerm: string, values: unknown[]): boolean {
  const normalizedTerm = normalizeSearchValue(searchTerm);
  if (!normalizedTerm) return true;

  const haystack = values
    .map((value) => normalizeSearchValue(value))
    .filter(Boolean)
    .join(' ');

  if (!haystack) return false;

  return normalizedTerm
    .split(' ')
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

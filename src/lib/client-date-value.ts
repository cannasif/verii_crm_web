const TURKISH_DATE_PATTERN =
  /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,3}))?)?)?$/;
const ISO_DATE_PATTERN =
  /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,3}))?)?)?/;

function buildValidatedTimestamp(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
): number | null {
  const date = new Date(year, month - 1, day, hour, minute, second, millisecond);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
    || date.getHours() !== hour
    || date.getMinutes() !== minute
    || date.getSeconds() !== second
  ) {
    return null;
  }

  return date.getTime();
}

function timestampFromMatch(match: RegExpMatchArray, yearFirst: boolean): number | null {
  const year = Number(match[yearFirst ? 1 : 3]);
  const month = Number(match[2]);
  const day = Number(match[yearFirst ? 3 : 1]);
  const hour = Number(match[4] ?? 0);
  const minute = Number(match[5] ?? 0);
  const second = Number(match[6] ?? 0);
  const millisecond = Number((match[7] ?? '').padEnd(3, '0') || 0);

  return buildValidatedTimestamp(year, month, day, hour, minute, second, millisecond);
}

/**
 * Converts ERP and browser date representations to a comparable timestamp.
 * Supports Netsis' dd.MM.yyyy values as well as ISO date/date-time values.
 */
export function parseClientDateValue(value: unknown): number | null {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  const turkishMatch = normalized.match(TURKISH_DATE_PATTERN);
  if (turkishMatch) {
    return timestampFromMatch(turkishMatch, false);
  }

  const isoMatch = normalized.match(ISO_DATE_PATTERN);
  if (isoMatch) {
    return timestampFromMatch(isoMatch, true);
  }

  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
}

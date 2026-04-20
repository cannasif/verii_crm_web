/** Kur modalı: düzenleme sırasında serbest metin; onayda sayıya çevrilir. */

function stripLeadingZerosIntPart(formatted: string): string {
  if (!formatted.includes('.')) {
    const t = formatted.replace(/^0+/, '');
    return t === '' ? '0' : t;
  }
  const [intPart, frac] = formatted.split('.');
  let i = (intPart ?? '').replace(/^0+/, '');
  if (i === '') i = '0';
  return `${i}.${frac}`;
}

/**
 * Düzenleme kutusunun ilk değeri: ERP/string gürültüsünde (ör. "023") gereksiz baş sıfırlarını atar;
 * 1'den küçük pozitif değerlerde "0.…" korunur.
 */
export function formatExchangeRateForEdit(value: number | string): string {
  const n = typeof value === 'string' ? parseExchangeRateInput(value) : value;
  if (!Number.isFinite(n) || n < 0) return '';
  const trimmed = n.toFixed(6).replace(/\.?0+$/, '');
  if (trimmed === '' || trimmed === '.') return '0';
  const stripped = stripLeadingZerosIntPart(trimmed);
  return stripped === '' ? '0' : stripped;
}

/**
 * `type="number"` kontrollü `value`: string `"023"` bazı tarayıcılarda baştaki 0'ı gösterir;
 * tamamlanmış taslakları sayıya çevirerek `23` gibi gösterir. Ondalık yazarken `"34."` / `"0,"`
 * gibi yarım girişleri bozmamak için sondaki `.` veya `,` varken noktalı string döner.
 */
export function draftToNumberInputValue(draft: string): string | number {
  const t = draft.trim();
  if (t === '') return '';
  const last = t[t.length - 1];
  if (last === '.' || last === ',') {
    return t.replace(',', '.');
  }
  return parseExchangeRateInput(t);
}

/** `type="number"` `defaultValue` için: boş taslakta `undefined`, aksi halde son sayı. */
export function exchangeRateDraftDefaultNumber(draft: string): number | undefined {
  if (draft === '') return undefined;
  const n = parseExchangeRateInput(draft);
  return Number.isFinite(n) ? n : undefined;
}

/** `onChange` ile `editingDraft`ı güncellerken baştaki gereksiz 0'ları (örn. "023" → "23") temizler. */
export function normalizeExchangeRateDraftInput(raw: string): string {
  const t = raw.trim();
  if (t === '') return '';
  const last = t[t.length - 1];
  if (last === '.' || last === ',') {
    if (last === ',') return `${t.slice(0, -1)}.`;
    return t.replace(',', '.');
  }
  return String(parseExchangeRateInput(t));
}

/**
 * `type="number"` uncontrolled kullanıldığında state ile görünümü eşitler (örn. "023" → kutuda "23").
 * Sondaki `.` ile yarım ondalık yazımını bozmaz.
 */
export function applyExchangeRateDraftToNumberInput(el: HTMLInputElement, normalizedDraft: string): void {
  if (normalizedDraft === '') {
    el.value = '';
    return;
  }
  const d = normalizedDraft.replace(',', '.');
  const last = d[d.length - 1];
  if (last === '.') {
    el.value = d;
    return;
  }
  el.value = String(parseExchangeRateInput(d));
}

/**
 * TR: ondalık virgül tek `,` veya nokta `.` kabul edilir (kur değerleri için yeterli).
 */
export function parseExchangeRateInput(raw: string): number {
  const t = raw.trim().replace(/\s/g, '');
  if (t === '') return 0;
  const lastComma = t.lastIndexOf(',');
  const lastDot = t.lastIndexOf('.');
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  } else if (lastComma >= 0) {
    normalized = t.replace(',', '.');
  } else {
    normalized = t;
  }
  if (normalized === '' || normalized === '.' || normalized === '-') return 0;
  const n = parseFloat(normalized);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

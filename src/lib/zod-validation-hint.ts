import type { z } from 'zod';

/**
 * Zod hata mesajlarını (çoğaltmadan) listeler; pasif Kaydet tooltip'inde kullanılır.
 */
export function getZodValidationMessages(schema: z.ZodTypeAny, data: unknown): string[] {
  const parsed = schema.safeParse(data);
  if (parsed.success) return [];

  const seen = new Set<string>();
  const lines: string[] = [];
  for (const issue of parsed.error.issues) {
    const msg = issue.message?.trim() || issue.code;
    if (msg && !seen.has(msg)) {
      seen.add(msg);
      lines.push(msg);
    }
  }
  return lines;
}

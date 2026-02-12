import type { z } from 'zod';
import { z as zod } from 'zod';

type AnyZodType = z.ZodTypeAny;

export function isZodFieldRequired(
  schema: AnyZodType,
  fieldPath: string
): boolean {
  const segments = fieldPath.split('.').filter(Boolean);
  if (segments.length === 0) return false;

  let current: AnyZodType | undefined = schema;
  for (const segment of segments) {
    if (!(current instanceof zod.ZodObject)) return false;
    current = current.shape[segment];
    if (!current) return false;
  }

  const fieldSchema = current;
  if (!fieldSchema) return false;
  return !fieldSchema.safeParse(undefined).success;
}

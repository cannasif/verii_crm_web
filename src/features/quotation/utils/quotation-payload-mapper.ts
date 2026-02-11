import type { QuotationNotesDto, QuotationNotesGetDto } from '../types/quotation-types';

const NOTE_KEYS = ['note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7', 'note8', 'note9', 'note10', 'note11', 'note12', 'note13', 'note14', 'note15'] as const;

export function mapQuotationNotesToPayload(
  notes: QuotationNotesDto
): QuotationNotesDto | undefined {
  const trimmed: QuotationNotesDto = {};
  let hasAny = false;
  for (const key of NOTE_KEYS) {
    const raw = notes[key];
    const val = typeof raw === 'string' ? raw.trim() : '';
    if (val) {
      trimmed[key] = val;
      hasAny = true;
    }
  }
  return hasAny ? trimmed : undefined;
}

export function quotationNotesDtoToNotesList(notes: QuotationNotesDto): string[] {
  const list: string[] = [];
  for (const key of NOTE_KEYS) {
    const val = (notes[key] ?? '').trim();
    if (val) list.push(val);
  }
  return list;
}

export function quotationNotesGetDtoToDto(get: QuotationNotesGetDto | null): QuotationNotesDto {
  if (!get) {
    return NOTE_KEYS.reduce<QuotationNotesDto>((acc, k) => ({ ...acc, [k]: '' }), {});
  }
  const dto: QuotationNotesDto = {};
  for (const key of NOTE_KEYS) {
    const v = get[key];
    dto[key] = v != null && v !== '' ? String(v) : '';
  }
  return dto;
}

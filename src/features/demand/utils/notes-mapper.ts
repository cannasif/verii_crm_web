import type { QuotationNotesDto } from '@/features/quotation/types/quotation-types';
import type { DemandNotesGetDto } from '../types/demand-types';

const NOTE_KEYS = ['note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7', 'note8', 'note9', 'note10', 'note11', 'note12', 'note13', 'note14', 'note15'] as const;

export function demandNotesGetDtoToDto(get: DemandNotesGetDto | null): QuotationNotesDto {
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

export function demandNotesDtoToNotesList(notes: QuotationNotesDto): string[] {
  const list: string[] = [];
  for (const key of NOTE_KEYS) {
    const val = (notes[key] ?? '').trim();
    if (val) list.push(val);
  }
  return list;
}

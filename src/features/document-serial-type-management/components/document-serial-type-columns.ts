import type { TFunction } from 'i18next';
import { MANAGEMENT_LIST_ID_COLUMN_DEF } from '@/lib/management-list-layout';
import type { DocumentSerialTypeDto } from '../types/document-serial-type-types';

export type DocumentSerialTypeColumnKey = keyof DocumentSerialTypeDto | 'ruleTypeLabel';

export function getDocumentSerialTypeColumns(
  t: TFunction
): { key: DocumentSerialTypeColumnKey; label: string; className?: string; headClassName?: string }[] {
  return [
    { key: 'id', label: t('table.id'), ...MANAGEMENT_LIST_ID_COLUMN_DEF },
    { key: 'ruleTypeLabel', label: t('table.ruleType'), className: 'min-w-[120px] font-medium' },
    { key: 'customerTypeName', label: t('table.customerType'), className: 'min-w-[140px]' },
    { key: 'salesRepFullName', label: t('table.salesRep'), className: 'min-w-[140px]' },
    { key: 'serialPrefix', label: t('table.serialPrefix'), className: 'w-[120px]' },
    { key: 'serialLength', label: t('table.serialLength'), className: 'w-[100px]' },
    { key: 'createdDate', label: t('table.createdDate'), className: 'w-[140px]' },
  ];
}

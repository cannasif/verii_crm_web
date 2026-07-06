import { cn } from '@/lib/utils';

export const CRM_MENU_ITEM_INTERACTIVE_CLASS = cn(
  'cursor-pointer outline-none transition-colors duration-200',
  'focus:bg-accent focus:text-primary',
  'data-[highlighted]:bg-accent data-[highlighted]:text-primary',
  'dark:focus:bg-[var(--crm-brand-soft)] dark:focus:text-[var(--crm-brand-on-soft)]',
  'dark:data-[highlighted]:bg-[var(--crm-brand-soft)] dark:data-[highlighted]:text-[var(--crm-brand-on-soft)]',
);

export const CRM_DROPDOWN_MENU_ITEM_CLASS = cn(
  CRM_MENU_ITEM_INTERACTIVE_CLASS,
  'group rounded-lg py-2.5 px-2',
);

export const CRM_DROPDOWN_MENU_ITEM_ICON_CLASS = cn(
  'p-1.5 rounded-md transition-colors',
  'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400',
  'group-focus:bg-[var(--crm-brand-soft)] group-focus:text-[var(--crm-brand-primary)]',
  'group-data-[highlighted]:bg-[var(--crm-brand-soft)] group-data-[highlighted]:text-[var(--crm-brand-primary)]',
);

export const CRM_DROPDOWN_MENU_ITEM_LABEL_CLASS = cn(
  'font-medium text-sm transition-colors',
  'text-slate-700 dark:text-slate-200',
  'group-focus:text-[var(--crm-brand-primary)] group-data-[highlighted]:text-[var(--crm-brand-primary)]',
);

export const CRM_SELECT_MENU_ITEM_CLASS = cn(
  CRM_MENU_ITEM_INTERACTIVE_CLASS,
  'my-1 rounded-xl',
);

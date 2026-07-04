import { cn } from '@/lib/utils';

/** Liste kartı — müşteri yönetimi tablosu ile aynı çerçeve / arka plan. */
export const MANAGEMENT_LIST_CARD_CLASSNAME =
  'gap-0 overflow-hidden border-slate-300/80 bg-stone-50/95 p-0 shadow-md ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-white/10 dark:bg-[#1a1025]/60 dark:shadow-sm dark:ring-0';

export const MANAGEMENT_LIST_CARD_HEADER_CLASSNAME =
  'space-y-3 rounded-t-xl border-b-2 border-slate-300/80 bg-slate-100/90 px-4 pb-4 pt-4 sm:space-y-4 sm:px-6 sm:pb-6 sm:pt-6 dark:border-white/10 dark:bg-white/[0.04]';

export const MANAGEMENT_LIST_CARD_TITLE_CLASSNAME = 'text-slate-900 dark:text-white';

export const MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME =
  'bg-stone-50/80 px-4 pb-8 pt-3 sm:px-6 sm:pb-10 sm:pt-4 dark:bg-transparent';

/** Tablo alanının iç çerçevesi (toolbar ile grid arası). */
export const MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME =
  'overflow-hidden rounded-lg border border-slate-300/70 bg-stone-100/80 shadow-sm dark:border-white/10 dark:bg-transparent dark:shadow-none';

export const MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME =
  'border-slate-300 bg-white shadow-sm hover:bg-stone-50 dark:border-white/15 dark:bg-transparent dark:shadow-none';

export const MANAGEMENT_LIST_ID_COLUMN_HEAD_CLASSNAME = cn(
  'bg-slate-200/70 dark:bg-white/[0.07] border-r border-slate-300/90 dark:border-white/10',
  'w-[84px] min-w-[84px] max-w-[84px] sm:w-[96px] sm:min-w-[96px] sm:max-w-[96px] md:w-auto md:min-w-[104px] md:max-w-none text-center'
);

export const MANAGEMENT_LIST_ID_COLUMN_CELL_CLASSNAME = cn(
  'text-center font-medium w-[84px] min-w-[84px] max-w-[84px] sm:w-[96px] sm:min-w-[96px] sm:max-w-[96px] md:w-auto md:min-w-[104px] md:max-w-none',
  'bg-slate-100/80 dark:bg-white/[0.04]',
  'border-r border-slate-200/90 dark:border-white/[0.08]'
);

export const MANAGEMENT_LIST_ID_COLUMN_DEF = {
  headClassName: MANAGEMENT_LIST_ID_COLUMN_HEAD_CLASSNAME,
  className: MANAGEMENT_LIST_ID_COLUMN_CELL_CLASSNAME,
} as const;

export const ADD_BUTTON_CLASS =
  'h-12 px-8 bg-[image:var(--crm-brand-gradient)] rounded-2xl text-white text-sm font-black shadow-xl shadow-primary/20 transition-all duration-300 hover:scale-[1.05] hover:shadow-primary/30 active:scale-[0.98] border-0 opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0';

/** DataTableGrid sarmalayıcı — thead / hücre border ve hover (müşteri listesi). */
export const MANAGEMENT_DATA_GRID_CLASSNAME = cn(
  'management-data-grid rounded-md',
  '[&_[data-slot=table-container]]:rounded-md',
  '[&_table]:border-collapse [&_thead_tr]:bg-slate-100/90 dark:[&_thead_tr]:bg-white/[0.06]',
  '[&_th]:border-b [&_th]:border-r [&_th]:border-slate-200/90 dark:[&_th]:border-white/10 [&_th]:font-semibold [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-600 dark:[&_th]:text-slate-300',
  '[&_th:last-child]:border-r-0',
  '[&_td]:border-b [&_td]:border-r [&_td]:border-slate-200/70 dark:[&_td]:border-white/[0.08]',
  '[&_td:last-child]:border-r-0',
  '[&_tbody_tr:hover_td]:bg-slate-50/70 dark:[&_tbody_tr:hover_td]:bg-white/[0.03]',
  '[&_tbody_tr:hover_td:first-child]:bg-slate-100/90 dark:[&_tbody_tr:hover_td:first-child]:bg-white/[0.06]'
);

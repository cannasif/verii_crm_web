export const DOCUMENT_LINE_DIALOG_CONTENT_CLASS =
  '!fixed !flex min-h-0 flex-col gap-0 !overflow-hidden border border-slate-300/95 bg-[linear-gradient(180deg,#ffffff,#f8fafc_40%,#f1f5f9)] p-0 text-slate-900 shadow-[0_0_50px_var(--crm-brand-soft),0_25px_80px_rgba(15,23,42,0.18)] ring-1 ring-slate-300/40 backdrop-blur-3xl dark:border-white/10 dark:bg-zinc-950/85 dark:bg-none dark:text-slate-100 dark:shadow-[0_0_50px_var(--crm-brand-soft),0_25px_80px_rgba(0,0,0,0.45)] dark:ring-0 max-lg:!top-3 max-lg:!left-1/2 max-lg:!h-[calc(100svh-0.75rem)] max-lg:!max-h-[calc(100svh-0.75rem)] max-lg:!w-[calc(100vw-0.5rem)] max-lg:!max-w-[calc(100vw-0.5rem)] max-lg:!-translate-x-1/2 max-lg:!translate-y-0 lg:!top-1/2 lg:!left-1/2 lg:!h-[min(92dvh,920px)] lg:!max-h-[min(92dvh,920px)] lg:!w-[min(1300px,calc(100vw-1rem))] lg:!max-w-[min(1250px,calc(100vw-1rem))] lg:!-translate-x-1/2 lg:!-translate-y-1/2 sm:max-lg:!w-[calc(100vw-1rem)] sm:max-lg:!max-w-[calc(100vw-1rem)]';

export const DOCUMENT_LINE_DIALOG_GRADIENT_OVERLAY_CLASS =
  'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-40%,var(--crm-brand-soft),transparent_50%),radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(59,130,246,0.04),transparent_45%)] dark:bg-[radial-gradient(ellipse_120%_80%_at_50%_-40%,var(--crm-brand-soft),transparent_50%),radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(59,130,246,0.08),transparent_45%)]';

export const DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS =
  'flex items-center justify-center rounded-lg border border-slate-300/90 bg-white text-slate-600 shadow-sm backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-accent hover:text-primary dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:border-primary/40 dark:hover:bg-primary/10 dark:hover:text-primary';

export const DOCUMENT_PAGE_NAV_BUTTON_CLASS =
  `h-10 w-10 shrink-0 rounded-xl transition-colors duration-200 ${DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS}`;

export const DOCUMENT_LINE_DIALOG_CLOSE_BUTTON_CLASS =
  `absolute right-2 top-2 z-30 h-8 w-8 sm:right-2.5 sm:top-2 ${DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS}`;

export const DOCUMENT_LINE_DIALOG_HEADER_CLASS =
  'relative z-10 shrink-0 border-b border-slate-300/90 bg-white px-4 py-2.5 pr-11 shadow-[inset_0_-1px_0_rgba(148,163,184,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-none sm:px-6 sm:py-3 sm:pr-12';

export const DOCUMENT_LINE_DIALOG_BODY_CLASS =
  'relative z-10 flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4';

export const DOCUMENT_LINE_DIALOG_ICON_WRAP_CLASS =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-accent text-primary shadow-sm dark:border-primary/30 dark:bg-primary/15 dark:text-primary sm:h-10 sm:w-10';

export const DOCUMENT_LINE_DIALOG_ICON_WRAP_EDIT_CLASS =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-50 text-indigo-500 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300 sm:h-10 sm:w-10';

export const DOCUMENT_LINE_FORM_CANCEL_BUTTON_CLASS =
  'h-12 px-6 w-full sm:w-auto rounded-xl border border-slate-300/90 bg-white text-slate-700 shadow-sm backdrop-blur-sm transition-all hover:border-slate-400/60 hover:bg-slate-100 hover:text-slate-900 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-white/25 dark:hover:bg-white/[0.08] dark:hover:text-slate-100 font-medium disabled:opacity-50';

export const DOCUMENT_LINE_FORM_SAVE_BUTTON_CLASS =
  'h-12 px-8 w-full sm:w-auto rounded-xl bg-[image:var(--crm-brand-gradient)] hover:opacity-90 text-white shadow-lg shadow-primary/20 hover:shadow-xl font-bold transition-all active:scale-95 border border-transparent hover:border-primary/40 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0';

export const DOCUMENT_LINE_FORM_FIELD_SURFACE_CLASS =
  'border-slate-300/90 bg-white text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100';

export const DOCUMENT_LINE_FORM_FIELD_SURFACE_MUTED_CLASS =
  'border-slate-300/90 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-100';

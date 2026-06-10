import { type ReactElement } from 'react';

interface DocumentListOfferNoCellProps {
  offerNo: string;
  hint: string;
  onOpenDetail: () => void;
}

export function DocumentListOfferNoCell({
  offerNo,
  hint,
  onOpenDetail,
}: DocumentListOfferNoCellProps): ReactElement {
  return (
    <span
      data-skip-row-double-click
      data-no-drag-scroll="true"
      className="cursor-pointer select-none rounded px-0.5 -mx-0.5 font-medium text-slate-900 hover:bg-slate-100/80 dark:text-white dark:hover:bg-white/5"
      title={hint}
      onDoubleClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onOpenDetail();
      }}
    >
      {offerNo}
    </span>
  );
}

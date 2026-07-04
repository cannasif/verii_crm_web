import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Heart, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StockGetWithMainImageDto } from '../types';
import { getImageUrl } from '../utils/image-url';
import { getLocalizedStockName } from '../utils/localized-stock-name';
import { StockWarehouseBalanceBadge } from './StockWarehouseBalanceBadge';

export type StockGridCardProps = {
  stock: StockGetWithMainImageDto;
  onNavigateDetail: (stockId: number) => void;
  onToggleFavorite: (stockId: number, nextFavorite: boolean) => void;
  isFavoritePending: boolean;
  favoriteLabelOn: string;
  favoriteLabelOff: string;
  detailLabel: string;
};

export function StockGridCard({
  stock,
  onNavigateDetail,
  onToggleFavorite,
  isFavoritePending,
  favoriteLabelOn,
  favoriteLabelOff,
  detailLabel,
}: StockGridCardProps): ReactElement {
  const { i18n } = useTranslation();
  const displayStockName = getLocalizedStockName(stock, i18n.language);
  const relative = stock.mainImage?.filePath?.trim() ?? '';
  const imageUrl = relative ? getImageUrl(relative) : null;
  const watermark = (stock.erpStockCode ?? '').slice(0, 2).toUpperCase() || '·';

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-slate-300/90 bg-white text-left shadow-md shadow-slate-200/45 backdrop-blur-md transition-all duration-300 ease-out will-change-transform dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none',
        'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_10px_30px_-8px_rgba(236,72,153,0.28),0_2px_6px_rgba(15,23,42,0.06)] dark:hover:border-primary/45 dark:hover:bg-white/[0.05] dark:hover:shadow-[0_6px_24px_rgba(236,72,153,0.22)]'
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />

      <div className="absolute right-1.5 top-1.5 z-20 flex gap-1">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className={cn(
            'h-7 w-7 border border-slate-200/90 bg-white/95 text-slate-400 shadow-sm backdrop-blur-sm hover:bg-white dark:border-white/10 dark:bg-zinc-900/90 dark:hover:bg-zinc-900',
            stock.isFavorite && 'text-primary'
          )}
          disabled={isFavoritePending}
          aria-label={stock.isFavorite ? favoriteLabelOn : favoriteLabelOff}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(stock.id, !stock.isFavorite);
          }}
        >
          <Heart className={cn('h-3.5 w-3.5', stock.isFavorite && 'fill-current')} />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-7 w-7 border border-slate-200/90 bg-white/95 text-indigo-600 shadow-sm backdrop-blur-sm hover:bg-indigo-50 dark:border-white/10 dark:bg-zinc-900/90 dark:text-indigo-400 dark:hover:bg-indigo-500/15"
          aria-label={detailLabel}
          onClick={(e) => {
            e.stopPropagation();
            onNavigateDetail(stock.id);
          }}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-slate-100 via-accent/25 to-slate-200/70 dark:from-zinc-900 dark:via-primary/5 dark:to-zinc-900">
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={displayStockName}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(15,23,42,0.45),transparent_55%)] dark:bg-[linear-gradient(to_top,rgba(9,9,11,0.7),transparent_55%)]"
              aria-hidden
            />
          </>
        ) : (
          <>
            <div
              className="pointer-events-none absolute inset-0 bg-[image:var(--crm-brand-gradient-soft)] opacity-70 dark:opacity-90"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px)] [background-size:18px_18px] dark:opacity-70 dark:[background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)]"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute -bottom-2 left-1 select-none font-mono text-[clamp(2.25rem,7vw,4rem)] font-black uppercase leading-none tracking-tighter text-slate-900/[0.07] transition-all duration-500 group-hover:-translate-y-0.5 group-hover:text-primary/20 dark:text-white/[0.06] dark:group-hover:text-primary/15"
              aria-hidden
            >
              {watermark}
            </span>
            <Package
              className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-primary/35 transition-all duration-300 group-hover:text-primary/70 dark:text-primary/25 dark:group-hover:text-primary/55"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(241,245,249,0.88),transparent_55%)] dark:bg-[linear-gradient(to_top,rgba(9,9,11,0.85),transparent_50%)]"
              aria-hidden
            />
          </>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span
            data-no-drag-scroll="true"
            className="min-w-0 flex-1 cursor-pointer truncate font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/90"
            onDoubleClick={(e) => {
              e.stopPropagation();
              onNavigateDetail(stock.id);
            }}
          >
            {stock.erpStockCode}
          </span>
          {stock.unit ? (
            <span className="shrink-0 rounded-md bg-sky-100 px-1.5 py-0 font-mono text-[9px] font-semibold uppercase tracking-wider text-sky-800 dark:bg-sky-500/15 dark:text-sky-200">
              {stock.unit}
            </span>
          ) : null}
        </div>

        <h3
          data-no-drag-scroll="true"
          className="line-clamp-2 min-h-[2.2em] cursor-pointer text-[12.5px] font-bold uppercase leading-snug tracking-tight text-slate-900 dark:text-slate-100"
          onDoubleClick={(e) => {
            e.stopPropagation();
            onNavigateDetail(stock.id);
          }}
        >
          {displayStockName}
        </h3>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <StockWarehouseBalanceBadge
            stockId={stock.id}
            unit={stock.unit}
            balance={stock.balance}
            balanceText={stock.balanceText}
          />
        </div>

        {stock.grupKodu || stock.kod1 ? (
          <div className="mt-auto flex flex-wrap items-center gap-1 pt-0.5">
            {stock.grupKodu ? (
              <span className="truncate rounded bg-accent px-1.5 py-0.5 font-mono text-[9px] text-primary/90 dark:bg-primary/[0.08] dark:text-primary/90">
                {stock.grupKodu}
              </span>
            ) : null}
            {stock.kod1 ? (
              <span className="truncate rounded bg-slate-100/80 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
                {stock.kod1}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

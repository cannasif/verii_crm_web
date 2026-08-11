import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarRange,
  Database,
  FileText,
  Globe2,
  LocateOff,
  Map as MapIcon,
  MapPin,
  RefreshCw,
  Rotate3D,
  ShoppingCart,
  TurkishLira,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useDashboardSalesMap } from '../hooks/useDashboardSalesMap';
import type {
  DashboardSalesMapLocation,
  SalesMapMetric,
  SalesMapMetricState,
} from '../types/dashboard-sales-map';
import { rankSalesMapLocations } from '../utils/sales-map-metrics';

const SalesWorldGlobe = lazy(() => import('./SalesWorldGlobe'));

type MapViewMode = 'globe' | 'flat';
type DatePreset = 'year' | '30days' | '90days' | '365days';

interface DateRangeValue {
  start: string;
  end: string;
}

const DEFAULT_METRICS: SalesMapMetricState = {
  quotation: true,
  order: true,
  erpOrder: true,
  tlAmount: false,
};

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

function inclusiveDayCount(range: DateRangeValue): number {
  const start = new Date(`${range.start}T00:00:00`);
  const end = new Date(`${range.end}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

function getPresetRange(preset: DatePreset): DateRangeValue {
  const today = new Date();
  const end = toDateInputValue(today);
  if (preset === 'year') return { start: `${today.getFullYear()}-01-01`, end };
  const offset = preset === '30days' ? 29 : preset === '90days' ? 89 : 364;
  const start = new Date(today);
  start.setDate(start.getDate() - offset);
  return { start: toDateInputValue(start), end };
}

function supportsWebGl(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function getInitialMapViewMode(): MapViewMode {
  if (!supportsWebGl()) return 'flat';
  return window.matchMedia('(max-width: 767px)').matches ? 'flat' : 'globe';
}

function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reducedMotion;
}

function FlatWorldMap({
  locations,
  selectedKey,
  onSelect,
}: {
  locations: Array<DashboardSalesMapLocation & { score: number }>;
  selectedKey: string | null;
  onSelect: (location: DashboardSalesMapLocation) => void;
}) {
  return (
    <div className="relative h-full min-h-[360px] overflow-hidden bg-[#07111f]" data-testid="sales-map-flat">
      <img
        src="/assets/maps/earth-blue-marble-2048.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-fill opacity-90"
      />
      <div className="absolute inset-0 bg-black/10" aria-hidden="true" />
      {locations.map((location) => {
        const left = ((location.longitude + 180) / 360) * 100;
        const top = ((90 - location.latitude) / 180) * 100;
        const size = 10 + Math.sqrt(Math.max(0, location.score)) * 18;
        return (
          <button
            key={location.key}
            type="button"
            aria-label={location.cityName}
            onClick={() => onSelect(location)}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-[0_0_18px_rgba(244,63,140,0.55)] transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
              selectedKey === location.key ? 'border-white bg-amber-400' : 'border-white/80 bg-fuchsia-500',
            )}
            style={{ left: `${left}%`, top: `${top}%`, width: size, height: size }}
          />
        );
      })}
    </div>
  );
}

export function DashboardSalesMap() {
  const { t, i18n } = useTranslation('dashboard');
  const initialRange = useMemo(() => getPresetRange('year'), []);
  const [draftRange, setDraftRange] = useState<DateRangeValue>(initialRange);
  const [appliedRange, setAppliedRange] = useState<DateRangeValue>(initialRange);
  const [metrics, setMetrics] = useState<SalesMapMetricState>(DEFAULT_METRICS);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<DashboardSalesMapLocation | null>(null);
  const [viewMode, setViewMode] = useState<MapViewMode>(getInitialMapViewMode);
  const [autoRotate, setAutoRotate] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const canUseWebGl = useMemo(() => supportsWebGl(), []);

  const queryStart = `${appliedRange.start}T00:00:00`;
  const queryEnd = `${addDays(appliedRange.end, 1)}T00:00:00`;
  const mapQuery = useDashboardSalesMap(queryStart, queryEnd);
  const locations = useMemo(
    () => rankSalesMapLocations(mapQuery.data?.locations ?? [], metrics),
    [mapQuery.data?.locations, metrics],
  );

  useEffect(() => {
    if (locations.length === 0) {
      setSelectedKey(null);
      return;
    }
    if (!selectedKey || !locations.some((location) => location.key === selectedKey)) {
      setSelectedKey(locations[0].key);
    }
  }, [locations, selectedKey]);

  useEffect(() => {
    if (reducedMotion) setAutoRotate(false);
  }, [reducedMotion]);

  const selectedLocation = locations.find((location) => location.key === selectedKey) ?? null;
  const detailLocation = hoveredLocation ?? selectedLocation;
  const rangeDayCount = inclusiveDayCount(draftRange);
  const rangeTooLarge = rangeDayCount > 370;
  const invalidRange = !draftRange.start || !draftRange.end || draftRange.start > draftRange.end || rangeTooLarge;
  const activeMetricCount = Object.values(metrics).filter(Boolean).length;
  const numberFormatter = useMemo(() => new Intl.NumberFormat(i18n.language), [i18n.language]);
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }),
    [i18n.language],
  );

  const metricOptions: Array<{ key: SalesMapMetric; label: string; icon: typeof FileText; color: string }> = [
    { key: 'quotation', label: t('salesMap.metrics.quotations'), icon: FileText, color: 'text-fuchsia-600' },
    { key: 'order', label: t('salesMap.metrics.orders'), icon: ShoppingCart, color: 'text-sky-600' },
    { key: 'erpOrder', label: t('salesMap.metrics.erpOrders'), icon: Database, color: 'text-emerald-600' },
    { key: 'tlAmount', label: t('salesMap.metrics.tlAmount'), icon: TurkishLira, color: 'text-amber-600' },
  ];

  const applyPreset = (preset: DatePreset) => {
    const range = getPresetRange(preset);
    setDraftRange(range);
    setAppliedRange(range);
  };

  const toggleMetric = (metric: SalesMapMetric, checked: boolean) => {
    if (!checked && metrics[metric] && activeMetricCount === 1) return;
    setMetrics((current) => ({ ...current, [metric]: checked }));
  };

  if (mapQuery.isLoading) {
    return (
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#130d1b]">
        <div className="space-y-3 p-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-16 w-full" />
        </div>
        <Skeleton className="h-[520px] w-full rounded-none" />
      </section>
    );
  }

  if (mapQuery.isError) {
    return (
      <section className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-white p-6 text-center dark:border-rose-500/20 dark:bg-[#130d1b]">
        <LocateOff className="text-rose-500" size={28} />
        <p className="font-semibold text-slate-800 dark:text-white">{t('salesMap.loadError')}</p>
        <Button variant="outline" onClick={() => mapQuery.refetch()}>
          <RefreshCw size={15} className="mr-2" />{t('refresh')}
        </Button>
      </section>
    );
  }

  const data = mapQuery.data;
  if (!data) return null;

  const summaryItems = [
    { label: t('salesMap.metrics.quotations'), value: numberFormatter.format(data.quotationCount), icon: FileText, tone: 'text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-500/10' },
    { label: t('salesMap.metrics.orders'), value: numberFormatter.format(data.orderCount), icon: ShoppingCart, tone: 'text-sky-600 bg-sky-50 dark:bg-sky-500/10' },
    { label: t('salesMap.metrics.erpOrders'), value: numberFormatter.format(data.erpOrderCount), icon: Database, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' },
    { label: t('salesMap.metrics.tlAmount'), value: currencyFormatter.format(data.quotationTlAmount + data.orderTlAmount), icon: TurkishLira, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10' },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#130d1b]">
      <header className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-300">
            <Globe2 size={21} />
          </span>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">{t('salesMap.title')}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {data.isSystemAdmin ? t('salesMap.descriptionAdmin') : t('salesMap.descriptionSelf')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['30days', '90days', '365days', 'year'] as DatePreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => applyPreset(preset)}
              className="h-8 rounded-lg border border-slate-200 px-3 text-[11px] font-bold text-slate-600 transition hover:border-fuchsia-300 hover:text-fuchsia-700 dark:border-white/10 dark:text-slate-300"
            >
              {t(`salesMap.presets.${preset}`)}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-white/10 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            {t('salesMap.startDate')}
            <Input
              type="date"
              value={draftRange.start}
              max={draftRange.end}
              onChange={(event) => setDraftRange((current) => ({ ...current, start: event.target.value }))}
              className="h-9 w-40"
            />
          </label>
          <label className="grid gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            {t('salesMap.endDate')}
            <Input
              type="date"
              value={draftRange.end}
              min={draftRange.start}
              max={toDateInputValue(new Date())}
              onChange={(event) => setDraftRange((current) => ({ ...current, end: event.target.value }))}
              className="h-9 w-40"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={invalidRange || (draftRange.start === appliedRange.start && draftRange.end === appliedRange.end)}
            onClick={() => setAppliedRange(draftRange)}
            className="h-9"
          >
            <CalendarRange size={15} className="mr-2" />{t('salesMap.apply')}
          </Button>
          {rangeTooLarge && <span className="text-[11px] font-semibold text-rose-600">{t('salesMap.rangeTooLarge')}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label={t('salesMap.metrics.label')}>
          {metricOptions.map(({ key, label, icon: Icon, color }) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Switch
                checked={metrics[key]}
                disabled={metrics[key] && activeMetricCount === 1}
                onCheckedChange={(checked) => toggleMetric(key, checked)}
              />
              <Icon size={14} className={color} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 border-b border-slate-200 dark:divide-white/10 dark:border-white/10 lg:grid-cols-4 lg:divide-y-0">
        {summaryItems.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="flex min-w-0 items-center gap-3 p-3.5">
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tone)}><Icon size={17} /></span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase text-slate-400">{label}</p>
              <p className="truncate text-base font-black text-slate-900 dark:text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid min-h-[520px] lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="relative min-h-[440px] overflow-hidden bg-[#07111f] lg:min-h-[520px]">
          <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-white/15 bg-black/55 p-1 text-white backdrop-blur-sm">
            <button
              type="button"
              onClick={() => canUseWebGl && setViewMode('globe')}
              disabled={!canUseWebGl}
              className={cn('flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-bold', viewMode === 'globe' ? 'bg-white text-slate-900' : 'text-white/75 hover:bg-white/10')}
            >
              <Rotate3D size={14} />{t('salesMap.views.globe')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('flat')}
              className={cn('flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-bold', viewMode === 'flat' ? 'bg-white text-slate-900' : 'text-white/75 hover:bg-white/10')}
            >
              <MapIcon size={14} />{t('salesMap.views.flat')}
            </button>
          </div>

          {viewMode === 'globe' && canUseWebGl && (
            <div className="absolute right-3 top-14 z-10 flex items-center gap-2 rounded-lg border border-white/15 bg-black/55 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm sm:top-3">
              <Rotate3D size={14} />
              {t('salesMap.autoRotate')}
              <Switch
                checked={autoRotate}
                disabled={reducedMotion}
                onCheckedChange={setAutoRotate}
                className="data-[state=checked]:bg-fuchsia-500"
              />
            </div>
          )}

          {viewMode === 'globe' && canUseWebGl ? (
            <Suspense fallback={<Skeleton className="h-full min-h-[520px] w-full rounded-none bg-slate-900" />}>
              <SalesWorldGlobe
                locations={locations}
                selectedKey={selectedKey}
                autoRotate={autoRotate}
                onSelect={(location) => setSelectedKey(location.key)}
                onHover={setHoveredLocation}
              />
            </Suspense>
          ) : (
            <FlatWorldMap
              locations={locations}
              selectedKey={selectedKey}
              onSelect={(location) => setSelectedKey(location.key)}
            />
          )}

          {locations.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 p-6 text-center text-sm font-semibold text-white">
              {t('salesMap.empty')}
            </div>
          )}

          {detailLocation && (
            <div className="absolute bottom-3 left-3 right-3 z-10 max-w-sm rounded-lg border border-white/15 bg-black/70 p-3 text-white shadow-xl backdrop-blur-md sm:right-auto sm:w-80">
              <div className="mb-2 flex items-center gap-2">
                <MapPin size={16} className="text-fuchsia-300" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{detailLocation.cityName}</p>
                  <p className="truncate text-[10px] font-medium text-white/60">{detailLocation.countryName}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                <span className="text-white/60">{t('salesMap.metrics.quotations')}</span><strong className="text-right">{numberFormatter.format(detailLocation.quotationCount)}</strong>
                <span className="text-white/60">{t('salesMap.metrics.orders')}</span><strong className="text-right">{numberFormatter.format(detailLocation.orderCount)}</strong>
                <span className="text-white/60">{t('salesMap.metrics.erpOrders')}</span><strong className="text-right">{numberFormatter.format(detailLocation.erpOrderCount)}</strong>
                <span className="text-white/60">{t('salesMap.metrics.tlAmount')}</span><strong className="text-right">{currencyFormatter.format(detailLocation.quotationTlAmount + detailLocation.orderTlAmount)}</strong>
              </div>
            </div>
          )}
        </div>

        <aside className="border-t border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.025] lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">{t('salesMap.ranking.title')}</h3>
              <p className="text-[10px] text-slate-500">{t('salesMap.ranking.description')}</p>
            </div>
            <span className="rounded-md bg-white px-2 py-1 text-[10px] font-black text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-200">
              {locations.length}
            </span>
          </div>
          <div className="max-h-[420px] overflow-y-auto p-2 lg:max-h-[455px]">
            {locations.slice(0, 20).map((location, index) => (
              <button
                key={location.key}
                type="button"
                onClick={() => setSelectedKey(location.key)}
                className={cn(
                  'mb-1 flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition last:mb-0 hover:bg-white hover:shadow-sm dark:hover:bg-white/5',
                  selectedKey === location.key && 'bg-white shadow-sm ring-1 ring-fuchsia-200 dark:bg-white/5 dark:ring-fuchsia-500/30',
                )}
              >
                <span className="w-5 text-center text-xs font-black text-slate-400">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-slate-800 dark:text-white">{location.cityName}</span>
                  <span className="block truncate text-[10px] text-slate-500">{location.countryName}</span>
                </span>
                <span className="text-right text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  {numberFormatter.format(location.quotationCount + location.orderCount)}<br />
                  <span className="font-medium text-slate-400">{t('salesMap.ranking.documents')}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 text-[10px] font-medium text-slate-500 dark:border-white/10">
            <LocateOff size={14} className="text-amber-500" />
            {t('salesMap.unlocated', { count: data.unlocatedDocumentCount })}
          </div>
        </aside>
      </div>
    </section>
  );
}

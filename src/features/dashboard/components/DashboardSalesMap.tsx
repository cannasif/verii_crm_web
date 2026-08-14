import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarRange,
  ChevronDown,
  Database,
  FileText,
  Globe2,
  LandPlot,
  LocateOff,
  Map as MapIcon,
  MapPin,
  Maximize2,
  Minimize2,
  RefreshCw,
  Rotate3D,
  Satellite,
  ShoppingCart,
  TurkishLira,
  UserRound,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useDashboardSalesMap } from '../hooks/useDashboardSalesMap';
import { useSalesMapCountries } from '../hooks/useSalesMapCountries';
import type {
  DashboardSalesMapLocation,
  SalesMapMetric,
  SalesMapMetricState,
  SalesMapScope,
} from '../types/dashboard-sales-map';
import type { SalesMapStyle } from '../types/sales-map-geo';
import {
  buildCountryColorMap,
  formatSalesMapPinLabel,
} from '../utils/sales-map-geo';
import {
  getSalesMapOwnerColor,
  rankSalesMapLocations,
} from '../utils/sales-map-metrics';
import { SalesFlatMap } from './SalesFlatMap';
import { SalesMapNavControls } from './SalesMapNavControls';
import type { SalesWorldGlobeHandle } from './SalesWorldGlobe';

const SalesWorldGlobe = lazy(() => import('./SalesWorldGlobe'));

type MapViewMode = 'globe' | 'flat';
type DatePreset = 'year' | '30days' | '90days' | '365days';
const ALL_COUNTRIES = '__all__';

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

export function DashboardSalesMap() {
  const { t, i18n } = useTranslation('dashboard');
  const initialRange = useMemo(() => getPresetRange('year'), []);
  const [draftRange, setDraftRange] = useState<DateRangeValue>(initialRange);
  const [appliedRange, setAppliedRange] = useState<DateRangeValue>(initialRange);
  const [metrics, setMetrics] = useState<SalesMapMetricState>(DEFAULT_METRICS);
  const [scope, setScope] = useState<SalesMapScope>('all');
  const [countryFilter, setCountryFilter] = useState(ALL_COUNTRIES);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<DashboardSalesMapLocation | null>(null);
  const [viewMode, setViewMode] = useState<MapViewMode>(getInitialMapViewMode);
  const [mapStyle, setMapStyle] = useState<SalesMapStyle>('political');
  const [autoRotate, setAutoRotate] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [detailExpanded, setDetailExpanded] = useState(true);
  const globeRef = useRef<SalesWorldGlobeHandle>(null);
  const reducedMotion = usePrefersReducedMotion();
  const canUseWebGl = useMemo(() => supportsWebGl(), []);

  const queryStart = `${appliedRange.start}T00:00:00`;
  const queryEnd = `${addDays(appliedRange.end, 1)}T00:00:00`;
  const mapQuery = useDashboardSalesMap(queryStart, queryEnd, scope);
  const countriesQuery = useSalesMapCountries(true);
  const countryOptions = useMemo(() => {
    const countries = new Map<string, string>();
    (mapQuery.data?.locations ?? []).forEach((location) => {
      const key = location.countryCode || location.countryName;
      if (key) countries.set(key, location.countryName || location.countryCode);
    });
    return Array.from(countries, ([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, i18n.language));
  }, [i18n.language, mapQuery.data?.locations]);
  const filteredLocations = useMemo(
    () => (mapQuery.data?.locations ?? []).filter((location) => (
      countryFilter === ALL_COUNTRIES || (location.countryCode || location.countryName) === countryFilter
    )),
    [countryFilter, mapQuery.data?.locations],
  );
  const locations = useMemo(
    () => rankSalesMapLocations(filteredLocations, metrics),
    [filteredLocations, metrics],
  );
  const countryColors = useMemo(() => buildCountryColorMap(locations), [locations]);
  const ownerLegend = useMemo(() => {
    const owners = new Map<string, { userId?: number | null; fullName: string; documentCount: number }>();
    filteredLocations.forEach((location) => location.owners.forEach((owner) => {
      const key = owner.userId == null ? `name:${owner.fullName}` : `id:${owner.userId}`;
      const current = owners.get(key) ?? { userId: owner.userId, fullName: owner.fullName, documentCount: 0 };
      current.documentCount += owner.quotationCount + owner.orderCount;
      owners.set(key, current);
    }));
    return Array.from(owners.values()).sort((left, right) => right.documentCount - left.documentCount);
  }, [filteredLocations]);

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
    if (countryFilter !== ALL_COUNTRIES && !countryOptions.some((country) => country.value === countryFilter)) {
      setCountryFilter(ALL_COUNTRIES);
    }
  }, [countryFilter, countryOptions]);

  useEffect(() => {
    if (reducedMotion) setAutoRotate(false);
  }, [reducedMotion]);

  useEffect(() => {
    if (selectedKey) setDetailExpanded(true);
  }, [selectedKey]);

  useEffect(() => {
    if (!mapExpanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMapExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mapExpanded]);

  const selectedLocation = locations.find((location) => location.key === selectedKey) ?? null;
  const detailLocation = hoveredLocation ?? selectedLocation;
  const rangeDayCount = inclusiveDayCount(draftRange);
  const rangeTooLarge = rangeDayCount > 370;
  const invalidRange = !draftRange.start || !draftRange.end || draftRange.start > draftRange.end || rangeTooLarge;
  const activeMetricCount = Object.values(metrics).filter(Boolean).length;
  const visibleTotals = useMemo(() => filteredLocations.reduce((totals, location) => ({
    quotationCount: totals.quotationCount + location.quotationCount,
    orderCount: totals.orderCount + location.orderCount,
    erpOrderCount: totals.erpOrderCount + location.erpOrderCount,
    tlAmount: totals.tlAmount + location.quotationTlAmount + location.orderTlAmount,
  }), { quotationCount: 0, orderCount: 0, erpOrderCount: 0, tlAmount: 0 }), [filteredLocations]);
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

  const isCountryFiltered = countryFilter !== ALL_COUNTRIES;
  const visibleCountryCount = new Set(filteredLocations.map((location) => location.countryCode || location.countryName)).size;
  const visibleAdministrativeAreaCount = filteredLocations.filter(
    (location) => location.administrativeAreaType !== 'country',
  ).length;

  const summaryItems = [
    { label: t('salesMap.metrics.quotations'), value: numberFormatter.format(isCountryFiltered ? visibleTotals.quotationCount : data.quotationCount), icon: FileText, tone: 'text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-500/10' },
    { label: t('salesMap.metrics.orders'), value: numberFormatter.format(isCountryFiltered ? visibleTotals.orderCount : data.orderCount), icon: ShoppingCart, tone: 'text-sky-600 bg-sky-50 dark:bg-sky-500/10' },
    { label: t('salesMap.metrics.erpOrders'), value: numberFormatter.format(isCountryFiltered ? visibleTotals.erpOrderCount : data.erpOrderCount), icon: Database, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' },
    { label: t('salesMap.metrics.tlAmount'), value: currencyFormatter.format(isCountryFiltered ? visibleTotals.tlAmount : data.quotationTlAmount + data.orderTlAmount), icon: TurkishLira, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10' },
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
              {data.isSystemAdmin && !data.isMineOnly ? t('salesMap.descriptionAdmin') : t('salesMap.descriptionSelf')}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-300">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-white/10">
                {t('salesMap.coverage.countries', { count: isCountryFiltered ? visibleCountryCount : data.countryCount })}
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-white/10">
                {t('salesMap.coverage.areas', { count: isCountryFiltered ? visibleAdministrativeAreaCount : data.administrativeAreaCount })}
              </span>
            </div>
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
          {data.isSystemAdmin && (
            <div className="grid gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              {t('salesMap.scope.label')}
              <div className="flex h-9 rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-white/10 dark:bg-white/5">
                <button
                  type="button"
                  aria-pressed={scope === 'all'}
                  onClick={() => setScope('all')}
                  className={cn('flex items-center gap-1.5 rounded px-2.5 text-[11px]', scope === 'all' ? 'bg-white text-fuchsia-700 shadow-sm dark:bg-white/10 dark:text-fuchsia-300' : 'text-slate-500')}
                >
                  <Users size={13} />{t('salesMap.scope.all')}
                </button>
                <button
                  type="button"
                  aria-pressed={scope === 'mine'}
                  onClick={() => setScope('mine')}
                  className={cn('flex items-center gap-1.5 rounded px-2.5 text-[11px]', scope === 'mine' ? 'bg-white text-fuchsia-700 shadow-sm dark:bg-white/10 dark:text-fuchsia-300' : 'text-slate-500')}
                >
                  <UserRound size={13} />{t('salesMap.scope.mine')}
                </button>
              </div>
            </div>
          )}
          <label className="grid gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            {t('salesMap.country.label')}
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="h-9 w-44 bg-white dark:bg-white/5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value={ALL_COUNTRIES}>{t('salesMap.country.all')}</SelectItem>
                {countryOptions.map((country) => (
                  <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
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
        <div className="relative min-h-[440px] lg:min-h-[520px]">
          {mapExpanded && (
            <div
              role="presentation"
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setMapExpanded(false)}
            />
          )}
          <div
            className={cn(
              'overflow-hidden',
              mapStyle === 'political' ? 'bg-[#0b1220]' : 'bg-[#061018]',
              mapExpanded
                ? 'fixed left-1/2 top-1/2 z-[45] h-[min(42rem,78dvh)] w-[min(68rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 shadow-2xl sm:h-[min(46rem,80dvh)] sm:w-[min(72rem,calc(100vw-2.5rem))] md:w-[min(76rem,calc(100vw-3rem))]'
                : 'absolute inset-0',
            )}
          >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2.5 sm:p-3">
            <div className="pointer-events-auto flex min-w-0 flex-1 flex-wrap gap-1">
              <div className="flex items-center gap-0.5 rounded-lg border border-white/15 bg-black/55 p-0.5 text-white backdrop-blur-sm sm:gap-1 sm:p-1">
                <button
                  type="button"
                  aria-label={t('salesMap.views.globe')}
                  title={t('salesMap.views.globe')}
                  onClick={() => canUseWebGl && setViewMode('globe')}
                  disabled={!canUseWebGl}
                  className={cn('flex h-8 items-center gap-1.5 rounded-md px-2 text-[11px] font-bold sm:px-2.5', viewMode === 'globe' ? 'bg-white text-slate-900' : 'text-white/75 hover:bg-white/10')}
                >
                  <Rotate3D size={14} className="shrink-0" />
                  <span className="hidden sm:inline">{t('salesMap.views.globe')}</span>
                </button>
                <button
                  type="button"
                  aria-label={t('salesMap.views.flat')}
                  title={t('salesMap.views.flat')}
                  onClick={() => setViewMode('flat')}
                  className={cn('flex h-8 items-center gap-1.5 rounded-md px-2 text-[11px] font-bold sm:px-2.5', viewMode === 'flat' ? 'bg-white text-slate-900' : 'text-white/75 hover:bg-white/10')}
                >
                  <MapIcon size={14} className="shrink-0" />
                  <span className="hidden sm:inline">{t('salesMap.views.flat')}</span>
                </button>
              </div>
              <div className="flex items-center gap-0.5 rounded-lg border border-white/15 bg-black/55 p-0.5 text-white backdrop-blur-sm sm:gap-1 sm:p-1">
                <button
                  type="button"
                  aria-label={t('salesMap.styles.political')}
                  title={t('salesMap.styles.political')}
                  onClick={() => setMapStyle('political')}
                  className={cn('flex h-8 items-center gap-1.5 rounded-md px-2 text-[11px] font-bold sm:px-2.5', mapStyle === 'political' ? 'bg-white text-slate-900' : 'text-white/75 hover:bg-white/10')}
                >
                  <LandPlot size={14} className="shrink-0" />
                  <span className="hidden sm:inline">{t('salesMap.styles.political')}</span>
                </button>
                <button
                  type="button"
                  aria-label={t('salesMap.styles.satellite')}
                  title={t('salesMap.styles.satellite')}
                  onClick={() => setMapStyle('satellite')}
                  className={cn('flex h-8 items-center gap-1.5 rounded-md px-2 text-[11px] font-bold sm:px-2.5', mapStyle === 'satellite' ? 'bg-white text-slate-900' : 'text-white/75 hover:bg-white/10')}
                >
                  <Satellite size={14} className="shrink-0" />
                  <span className="hidden sm:inline">{t('salesMap.styles.satellite')}</span>
                </button>
              </div>
            </div>

            <div className="pointer-events-auto flex shrink-0 flex-col items-end gap-1.5">
              <button
                type="button"
                aria-label={mapExpanded ? t('salesMap.expand.close') : t('salesMap.expand.open')}
                onClick={() => setMapExpanded((current) => !current)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/45 text-white/80 backdrop-blur-sm transition hover:bg-black/65 hover:text-white"
              >
                {mapExpanded ? <Minimize2 size={15} strokeWidth={2.25} /> : <Maximize2 size={15} strokeWidth={2.25} />}
              </button>
              {viewMode === 'globe' && canUseWebGl && (
                <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/55 px-2 py-1.5 text-xs font-semibold text-white backdrop-blur-sm sm:px-3 sm:py-2">
                  <Rotate3D size={14} className="shrink-0" />
                  <span className="hidden sm:inline">{t('salesMap.autoRotate')}</span>
                  <Switch
                    checked={autoRotate}
                    disabled={reducedMotion}
                    onCheckedChange={setAutoRotate}
                    aria-label={t('salesMap.autoRotate')}
                    className="data-[state=checked]:bg-fuchsia-500"
                  />
                </div>
              )}
              {mapQuery.isFetching && (
                <div className="flex items-center gap-2 rounded-md border border-white/15 bg-black/65 px-2.5 py-1.5 text-[10px] font-bold text-white">
                  <RefreshCw size={12} className="animate-spin" />
                  <span className="hidden sm:inline">{t('salesMap.refreshing')}</span>
                </div>
              )}
            </div>
          </div>

          {viewMode === 'globe' && canUseWebGl ? (
            <div className="absolute inset-0 z-0">
              <Suspense fallback={<Skeleton className="h-full min-h-[520px] w-full rounded-none bg-slate-900" />}>
                <SalesWorldGlobe
                  ref={globeRef}
                  locations={locations}
                  selectedKey={selectedKey}
                  autoRotate={autoRotate}
                  mapStyle={mapStyle}
                  countriesGeo={countriesQuery.data}
                  countryColors={countryColors}
                  language={i18n.language}
                  metrics={metrics}
                  onSelect={(location) => setSelectedKey(location.key)}
                  onHover={setHoveredLocation}
                />
              </Suspense>
            </div>
          ) : (
            <div className="absolute inset-0 z-0">
              <SalesFlatMap
                locations={locations}
                selectedKey={selectedKey}
                mapStyle={mapStyle}
                countries={countriesQuery.data}
                countryColors={countryColors}
                language={i18n.language}
                metrics={metrics}
                onSelect={(location) => setSelectedKey(location.key)}
              />
            </div>
          )}

          {viewMode === 'globe' && canUseWebGl && (
            <SalesMapNavControls
              variant="joystick"
              onZoomIn={() => globeRef.current?.zoomIn()}
              onZoomOut={() => globeRef.current?.zoomOut()}
              onPan={(vector) => globeRef.current?.pan(vector)}
              onResetNorth={() => globeRef.current?.resetNorth()}
              zoomInLabel={t('salesMap.nav.zoomIn')}
              zoomOutLabel={t('salesMap.nav.zoomOut')}
              panLabel={t('salesMap.nav.pan')}
              panUpLabel={t('salesMap.nav.panUp')}
              panDownLabel={t('salesMap.nav.panDown')}
              panLeftLabel={t('salesMap.nav.panLeft')}
              panRightLabel={t('salesMap.nav.panRight')}
              compassLabel={t('salesMap.nav.compass')}
              expandLabel={t('salesMap.nav.expand')}
              collapseLabel={t('salesMap.nav.collapse')}
            />
          )}

          {locations.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 p-6 text-center text-sm font-semibold text-white">
              {t('salesMap.empty')}
            </div>
          )}

          {detailLocation && (
            <div className="absolute bottom-3 left-3 right-14 z-20 overflow-hidden rounded-lg border border-white/15 bg-black/70 text-white shadow-xl backdrop-blur-md sm:right-auto sm:w-80">
              <button
                type="button"
                className="flex w-full items-center gap-2 p-2.5 text-left sm:cursor-default sm:p-3"
                aria-expanded={detailExpanded}
                aria-label={detailExpanded ? t('salesMap.detail.collapse') : t('salesMap.detail.expand')}
                onClick={() => {
                  if (window.matchMedia('(min-width: 640px)').matches) return;
                  setDetailExpanded((current) => !current);
                }}
              >
                <MapPin size={16} className="shrink-0 text-fuchsia-300" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{detailLocation.cityName}</p>
                  <p className="truncate text-[10px] font-medium text-white/60">
                    {detailLocation.administrativeAreaType === 'country'
                      ? t('salesMap.areaType.country')
                      : `${detailLocation.countryName} · ${t(`salesMap.areaType.${detailLocation.administrativeAreaType}`)}`}
                  </p>
                </div>
                <ChevronDown
                  size={18}
                  className={cn(
                    'shrink-0 text-white/70 transition-transform sm:hidden',
                    detailExpanded && 'rotate-180',
                  )}
                />
              </button>
              <div className={cn('border-t border-white/10 px-2.5 pb-2.5 sm:block sm:px-3 sm:pb-3', detailExpanded ? 'block' : 'hidden')}>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-2 text-[10px] sm:gap-x-4 sm:gap-y-1 sm:text-[11px]">
                  <span className="text-white/60">{t('salesMap.metrics.quotations')}</span><strong className="text-right">{numberFormatter.format(detailLocation.quotationCount)}</strong>
                  <span className="text-white/60">{t('salesMap.metrics.orders')}</span><strong className="text-right">{numberFormatter.format(detailLocation.orderCount)}</strong>
                  <span className="text-white/60">{t('salesMap.metrics.erpOrders')}</span><strong className="text-right">{numberFormatter.format(detailLocation.erpOrderCount)}</strong>
                  <span className="text-white/60">{t('salesMap.metrics.tlAmount')}</span><strong className="text-right">{currencyFormatter.format(detailLocation.quotationTlAmount + detailLocation.orderTlAmount)}</strong>
                </div>
                {detailLocation.owners.length > 0 && (
                  <div className="mt-1.5 border-t border-white/10 pt-1.5 sm:mt-2 sm:pt-2">
                    <p className="mb-1 text-[9px] font-bold uppercase text-white/50">{t('salesMap.owners.breakdown')}</p>
                    <div className="space-y-1">
                      {detailLocation.owners
                        .slice()
                        .sort((left, right) => (right.quotationCount + right.orderCount) - (left.quotationCount + left.orderCount))
                        .slice(0, 3)
                        .map((owner) => (
                          <div key={owner.userId ?? owner.fullName} className="flex items-center gap-1.5 text-[10px]">
                            <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: getSalesMapOwnerColor(owner) }} />
                            <span className="min-w-0 flex-1 truncate">{owner.fullName || t('salesMap.owners.unassigned')}</span>
                            <strong>{numberFormatter.format(owner.quotationCount + owner.orderCount)}</strong>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
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
          {ownerLegend.length > 0 && (
            <div className="border-b border-slate-200 px-4 py-2.5 dark:border-white/10">
              <p className="mb-1.5 text-[9px] font-bold uppercase text-slate-400">{t('salesMap.owners.legend')}</p>
              <div className="flex max-h-14 flex-wrap gap-x-3 gap-y-1 overflow-hidden">
                {ownerLegend.slice(0, 8).map((owner) => (
                  <span key={owner.userId ?? owner.fullName} className="flex min-w-0 items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                    <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: getSalesMapOwnerColor(owner) }} />
                    <span className="max-w-24 truncate">{owner.fullName || t('salesMap.owners.unassigned')}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="max-h-[420px] overflow-y-auto p-2 lg:max-h-[455px]">
            {locations.slice(0, 20).map((location, index) => (
              <button
                key={location.key}
                type="button"
                onClick={() => setSelectedKey(location.key)}
                className={cn(
                  'relative mb-1 flex w-full items-center gap-3 overflow-hidden rounded-lg px-2.5 py-2 text-left transition last:mb-0 hover:bg-white hover:shadow-sm dark:hover:bg-white/5',
                  selectedKey === location.key && 'bg-white shadow-sm ring-1 ring-fuchsia-200 dark:bg-white/5 dark:ring-fuchsia-500/30',
                )}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 opacity-10"
                  style={{ width: `${Math.max(3, location.score * 100)}%`, backgroundColor: location.color }}
                />
                <span className="w-5 text-center text-xs font-black text-slate-400">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-xs font-bold text-slate-800 dark:text-white">
                    <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: location.color }} />
                    <span className="truncate">{location.cityName}</span>
                  </span>
                  <span className="block truncate pl-3.5 text-[10px] text-slate-500">
                    {location.administrativeAreaType === 'country'
                      ? `${t('salesMap.areaType.country')} · ${location.dominantOwner?.fullName || t('salesMap.owners.unassigned')}`
                      : `${location.countryName} · ${location.dominantOwner?.fullName || t('salesMap.owners.unassigned')}`}
                  </span>
                </span>
                <span className="text-right text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  {formatSalesMapPinLabel(location, i18n.language, metrics)}
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

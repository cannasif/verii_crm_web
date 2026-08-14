import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveAppPath } from '@/lib/api-config';
import { cn } from '@/lib/utils';
import type { DashboardSalesMapLocation, SalesMapMetricState } from '../types/dashboard-sales-map';
import type { SalesMapCountriesGeoJson, SalesMapStyle } from '../types/sales-map-geo';
import {
  countryGeometryToSvgPath,
  findSalesMapLocationForCountry,
  findSalesMapLocationForProvince,
  formatSalesMapPinLabel,
  getSalesMapCountryIso,
  getSalesMapCountryName,
  normalizeSalesMapCountryCode,
  normalizeSalesMapProvinceKey,
  POLITICAL_BORDER,
  POLITICAL_BORDER_ACTIVE,
  POLITICAL_LAND,
  POLITICAL_OCEAN,
  projectEquirectangular,
} from '../utils/sales-map-geo';
import { getOceanLabels } from '../utils/sales-map-sphere-geo';
import type { RankedSalesMapLocation } from '../utils/sales-map-metrics';
import { SalesMapLocationPin } from './SalesMapLocationPin';
import { SalesMapNavControls } from './SalesMapNavControls';

const MAP_WIDTH = 2048;
const MAP_HEIGHT = 1024;
const MAP_ASPECT = MAP_WIDTH / MAP_HEIGHT;
const MIN_SCALE = 1;
const MAX_SCALE = 28;
const SATELLITE_SRC = resolveAppPath('/assets/maps/earth-blue-marble-5400.jpg');
const PROVINCE_SHOW_SCALE = 2.75;
const PROVINCE_LABEL_HIGHLIGHT_SCALE = 3.4;
const PROVINCE_LABEL_ALL_SCALE = 6.2;

interface SalesFlatMapProps {
  locations: RankedSalesMapLocation[];
  selectedKey: string | null;
  mapStyle: SalesMapStyle;
  countries?: SalesMapCountriesGeoJson;
  provinces?: SalesMapCountriesGeoJson;
  countryColors: Map<string, string>;
  provinceColors?: Map<string, string>;
  language: string;
  metrics: SalesMapMetricState;
  onSelect: (location: DashboardSalesMapLocation) => void;
}

interface ViewTransform {
  scale: number;
  x: number;
  y: number;
}

interface FittedWorld {
  width: number;
  height: number;
}

interface MapViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function coverWorld(containerWidth: number, containerHeight: number): FittedWorld {
  if (containerWidth / containerHeight > MAP_ASPECT) {
    const width = containerWidth;
    return { width, height: width / MAP_ASPECT };
  }
  const height = containerHeight;
  return { width: height * MAP_ASPECT, height };
}

function centeredTransform(
  containerWidth: number,
  containerHeight: number,
  world: FittedWorld,
  scale = MIN_SCALE,
): ViewTransform {
  return clampTransform({
    scale,
    x: (containerWidth - world.width * scale) / 2,
    y: (containerHeight - world.height * scale) / 2,
  }, containerWidth, containerHeight, world);
}

function clampTransform(
  next: ViewTransform,
  containerWidth: number,
  containerHeight: number,
  world: FittedWorld,
): ViewTransform {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next.scale));
  const contentWidth = world.width * scale;
  const contentHeight = world.height * scale;
  let minX: number;
  let maxX: number;
  let minY: number;
  let maxY: number;
  if (contentWidth <= containerWidth) {
    minX = maxX = (containerWidth - contentWidth) / 2;
  } else {
    minX = containerWidth - contentWidth;
    maxX = 0;
  }
  if (contentHeight <= containerHeight) {
    minY = maxY = (containerHeight - contentHeight) / 2;
  } else {
    minY = containerHeight - contentHeight;
    maxY = 0;
  }
  return {
    scale,
    x: Math.min(maxX, Math.max(minX, next.x)),
    y: Math.min(maxY, Math.max(minY, next.y)),
  };
}

function toViewBox(
  transform: ViewTransform,
  containerWidth: number,
  containerHeight: number,
  world: FittedWorld,
): MapViewBox {
  const sx = MAP_WIDTH / world.width;
  const sy = MAP_HEIGHT / world.height;
  return {
    x: (-transform.x / transform.scale) * sx,
    y: (-transform.y / transform.scale) * sy,
    w: (containerWidth / transform.scale) * sx,
    h: (containerHeight / transform.scale) * sy,
  };
}

function strokeForScreen(screenPx: number, scale: number, world: FittedWorld): number {
  return (screenPx * MAP_WIDTH) / (world.width * Math.max(scale, 0.85));
}

function maxRankForScale(scale: number): number {
  if (scale < 1.4) return 2;
  if (scale < 2.3) return 3;
  if (scale < 4.8) return 4;
  if (scale < 7.5) return 5;
  return 6;
}

function targetLabelScreenPx(labelRank?: number): number {
  if (labelRank == null) return 9;
  if (labelRank <= 1) return 11;
  if (labelRank <= 2) return 10;
  if (labelRank <= 3) return 9;
  if (labelRank <= 5) return 8;
  if (labelRank <= 6) return 7;
  return 0;
}

function mapFontSizeForScreen(
  targetScreenPx: number,
  scale: number,
  world: FittedWorld,
): number {
  return (targetScreenPx * MAP_WIDTH) / (world.width * Math.max(scale, 0.85));
}

function provinceLabelScreenPx(scale: number, highlighted: boolean): number {
  const appearAt = highlighted ? PROVINCE_LABEL_HIGHLIGHT_SCALE : PROVINCE_LABEL_ALL_SCALE;
  if (scale < appearAt) return 0;
  const span = Math.max(1, MAX_SCALE - appearAt);
  const t = Math.min(1, Math.max(0, (scale - appearAt) / span));
  const eased = Math.pow(t, 0.72);
  const minPx = highlighted ? 8.5 : 7.5;
  const maxPx = highlighted ? 13.5 : 12;
  return minPx + (maxPx - minPx) * eased;
}

export function SalesFlatMap({
  locations,
  selectedKey,
  mapStyle,
  countries,
  provinces,
  countryColors,
  provinceColors,
  language,
  metrics,
  onSelect,
}: SalesFlatMapProps) {
  const { t } = useTranslation('dashboard');
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const world = useMemo(() => coverWorld(size.width, size.height), [size.height, size.width]);
  const [transform, setTransform] = useState<ViewTransform>({ scale: 1, x: 0, y: 0 });
  const transformRef = useRef(transform);
  const worldRef = useRef(world);
  const sizeRef = useRef(size);
  const initializedRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const wheelPendingRef = useRef<{ clientX: number; clientY: number; factor: number } | null>(null);
  const wheelRafRef = useRef(0);
  const panRafRef = useRef(0);
  const panPendingRef = useRef<ViewTransform | null>(null);

  transformRef.current = transform;
  worldRef.current = world;
  sizeRef.current = size;

  useEffect(() => () => {
    if (wheelRafRef.current) cancelAnimationFrame(wheelRafRef.current);
    if (panRafRef.current) cancelAnimationFrame(panRafRef.current);
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = (): void => {
      const rect = node.getBoundingClientRect();
      setSize({ width: Math.max(1, rect.width), height: Math.max(1, rect.height) });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!initializedRef.current && size.width > 1) {
      initializedRef.current = true;
      setTransform(centeredTransform(size.width, size.height, world));
      return;
    }
    setTransform((current) => clampTransform(current, size.width, size.height, world));
  }, [size.height, size.width, world]);

  const applyTransform = useCallback((next: ViewTransform): void => {
    const currentSize = sizeRef.current;
    const currentWorld = worldRef.current;
    setTransform(clampTransform(next, currentSize.width, currentSize.height, currentWorld));
  }, []);

  const zoomAt = useCallback((clientX: number, clientY: number, factor: number): void => {
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const current = transformRef.current;
    const fitted = coverWorld(rect.width, rect.height);
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * factor));
    const worldX = (localX - current.x) / current.scale;
    const worldY = (localY - current.y) / current.scale;
    setTransform(clampTransform({
      scale: nextScale,
      x: localX - worldX * nextScale,
      y: localY - worldY * nextScale,
    }, rect.width, rect.height, fitted));
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onWheel = (event: globalThis.WheelEvent): void => {
      event.preventDefault();
      const delta = Math.max(-90, Math.min(90, event.deltaY));
      const stepFactor = Math.exp(-delta * 0.00135);
      const pending = wheelPendingRef.current;
      wheelPendingRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        factor: (pending?.factor ?? 1) * stepFactor,
      };
      if (wheelRafRef.current) return;
      wheelRafRef.current = requestAnimationFrame(() => {
        wheelRafRef.current = 0;
        const next = wheelPendingRef.current;
        wheelPendingRef.current = null;
        if (!next) return;
        zoomAt(next.clientX, next.clientY, next.factor);
      });
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const countryPaths = useMemo(() => {
    if (!countries) return [];
    return countries.features.map((feature) => {
      const code = getSalesMapCountryIso(feature.properties);
      return {
        code,
        path: countryGeometryToSvgPath(feature, MAP_WIDTH, MAP_HEIGHT),
        color: countryColors.get(code),
        labelRank: feature.properties.LABELRANK ?? 5,
        name: getSalesMapCountryName(feature.properties, language),
        labelX: feature.properties.LABEL_X,
        labelY: feature.properties.LABEL_Y,
        highlighted: countryColors.has(code),
      };
    });
  }, [countries, countryColors, language]);

  const provincePaths = useMemo(() => {
    if (!provinces) return [];
    return provinces.features.map((feature) => {
      const code = (feature.properties.PROVINCE_CODE || '').toLowerCase();
      const name = getSalesMapCountryName(feature.properties, language);
      const colorKey = normalizeSalesMapProvinceKey(name);
      return {
        code,
        name,
        path: countryGeometryToSvgPath(feature, MAP_WIDTH, MAP_HEIGHT),
        color: provinceColors?.get(colorKey),
        labelX: feature.properties.LABEL_X,
        labelY: feature.properties.LABEL_Y,
        highlighted: Boolean(provinceColors?.has(colorKey)),
      };
    });
  }, [language, provinceColors, provinces]);

  const oceans = useMemo(() => getOceanLabels(language), [language]);
  const viewBox = useMemo(
    () => toViewBox(transform, size.width, size.height, world),
    [size.height, size.width, transform, world],
  );
  const visibleRank = maxRankForScale(transform.scale);
  const turkeyPoint = useMemo(
    () => projectEquirectangular(35, 39, world.width, world.height),
    [world.height, world.width],
  );
  const turkeyOnScreen = useMemo(() => {
    const screenX = turkeyPoint.x * transform.scale + transform.x;
    const screenY = turkeyPoint.y * transform.scale + transform.y;
    return screenX > -size.width * 0.35
      && screenX < size.width * 1.35
      && screenY > -size.height * 0.35
      && screenY < size.height * 1.35;
  }, [size.height, size.width, transform.scale, transform.x, transform.y, turkeyPoint.x, turkeyPoint.y]);
  const provincesVisible = (mapStyle === 'political' || mapStyle === 'satellite')
    && transform.scale >= PROVINCE_SHOW_SCALE
    && turkeyOnScreen
    && provincePaths.length > 0;
  const provinceLabelMode: 'none' | 'highlight' | 'all' = !provincesVisible
    ? 'none'
    : transform.scale >= PROVINCE_LABEL_ALL_SCALE
      ? 'all'
      : transform.scale >= PROVINCE_LABEL_HIGHLIGHT_SCALE
        ? 'highlight'
        : 'none';

  const toScreen = useCallback((longitude: number, latitude: number) => {
    const point = projectEquirectangular(longitude, latitude, world.width, world.height);
    return {
      x: point.x * transform.scale + transform.x,
      y: point.y * transform.scale + transform.y,
    };
  }, [transform.scale, transform.x, transform.y, world.height, world.width]);

  const borderStroke = strokeForScreen(0.9, transform.scale, world);
  const borderStrokeActive = strokeForScreen(1.25, transform.scale, world);
  const provinceStroke = strokeForScreen(0.55, transform.scale, world);
  const provinceStrokeActive = strokeForScreen(0.9, transform.scale, world);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative h-full min-h-[360px] cursor-grab overflow-hidden select-none active:cursor-grabbing',
        mapStyle === 'political' ? 'bg-[#0b1220]' : 'bg-[#061018]',
      )}
      data-testid="sales-map-flat"
      onDragStart={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('button') || target.closest('[data-sales-map-nav]')) return;
        window.getSelection()?.removeAllRanges();
        const current = transformRef.current;
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originX: current.x,
          originY: current.y,
          moved: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
        panPendingRef.current = {
          scale: transformRef.current.scale,
          x: drag.originX + dx,
          y: drag.originY + dy,
        };
        if (panRafRef.current) return;
        panRafRef.current = requestAnimationFrame(() => {
          panRafRef.current = 0;
          const pending = panPendingRef.current;
          panPendingRef.current = null;
          if (pending) applyTransform(pending);
        });
      }}
      onPointerUp={(event) => {
        if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
      }}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
    >
      {mapStyle === 'political' && (
        <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
          {Array.from({ length: 70 }, (_, index) => (
            <span
              key={index}
              className="absolute size-0.5 rounded-full bg-sky-100/80"
              style={{
                left: `${(index * 47) % 100}%`,
                top: `${(index * 29) % 100}%`,
                opacity: 0.3 + ((index * 13) % 55) / 100,
              }}
            />
          ))}
        </div>
      )}

      {mapStyle === 'satellite' && (
        <img
          src={SATELLITE_SRC}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute max-w-none select-none"
          draggable={false}
          style={{
            width: world.width * transform.scale,
            height: world.height * transform.scale,
            left: transform.x,
            top: transform.y,
          }}
        />
      )}

      <svg
        width={size.width}
        height={size.height}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className="absolute inset-0 h-full w-full select-none"
        preserveAspectRatio="none"
        shapeRendering="geometricPrecision"
        aria-hidden="true"
        style={{ userSelect: 'none' }}
      >
        {mapStyle === 'political' && (
          <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill={POLITICAL_OCEAN} />
        )}

        {mapStyle === 'political' && countryPaths.map((country) => {
          if (provincesVisible && country.code === 'TR') return null;
          return (
            <path
              key={country.code || country.path.slice(0, 24)}
              d={country.path}
              fill={country.color ?? POLITICAL_LAND}
              stroke={country.highlighted ? POLITICAL_BORDER_ACTIVE : POLITICAL_BORDER}
              strokeWidth={country.highlighted ? borderStrokeActive : borderStroke}
              style={country.highlighted ? { cursor: 'pointer' } : undefined}
              onClick={(event) => {
                if (!country.highlighted || !country.code) return;
                event.stopPropagation();
                if (dragRef.current?.moved) return;
                const location = findSalesMapLocationForCountry(locations, country.code);
                if (location) onSelect(location);
              }}
            />
          );
        })}

        {mapStyle === 'satellite' && countryPaths.map((country) => {
          if (provincesVisible && country.code === 'TR') return null;
          if (!country.highlighted) {
            return (
              <path
                key={`sat-border-${country.code || country.path.slice(0, 24)}`}
                d={country.path}
                fill="none"
                stroke="rgba(248,250,252,0.7)"
                strokeWidth={borderStroke}
                className="pointer-events-none"
              />
            );
          }
          return (
            <path
              key={`sat-fill-${country.code || country.path.slice(0, 24)}`}
              d={country.path}
              fill={country.color ?? '#38bdf8'}
              fillOpacity={0.48}
              stroke="rgba(248,250,252,0.9)"
              strokeWidth={borderStrokeActive}
              style={{ cursor: 'pointer' }}
              onClick={(event) => {
                if (!country.code) return;
                event.stopPropagation();
                if (dragRef.current?.moved) return;
                const location = findSalesMapLocationForCountry(locations, country.code);
                if (location) onSelect(location);
              }}
            />
          );
        })}

        {provincesVisible && mapStyle === 'political' && provincePaths.map((province) => (
          <path
            key={`province-${province.code}`}
            d={province.path}
            fill={province.color ?? POLITICAL_LAND}
            stroke={province.highlighted ? POLITICAL_BORDER_ACTIVE : '#4b5563'}
            strokeWidth={province.highlighted ? provinceStrokeActive : provinceStroke}
            style={province.highlighted ? { cursor: 'pointer' } : undefined}
            onClick={(event) => {
              if (!province.highlighted) return;
              event.stopPropagation();
              if (dragRef.current?.moved) return;
              const location = findSalesMapLocationForProvince(locations, province.name);
              if (location) onSelect(location);
            }}
          />
        ))}

        {provincesVisible && mapStyle === 'satellite' && provincePaths.map((province) => (
          <path
            key={`sat-province-${province.code}`}
            d={province.path}
            fill={province.highlighted ? (province.color ?? '#38bdf8') : 'none'}
            fillOpacity={province.highlighted ? 0.5 : 0}
            stroke="rgba(226,232,240,0.92)"
            strokeWidth={province.highlighted ? provinceStrokeActive : provinceStroke}
            style={province.highlighted ? { cursor: 'pointer' } : undefined}
            className={province.highlighted ? undefined : 'pointer-events-none'}
            onClick={(event) => {
              if (!province.highlighted) return;
              event.stopPropagation();
              if (dragRef.current?.moved) return;
              const location = findSalesMapLocationForProvince(locations, province.name);
              if (location) onSelect(location);
            }}
          />
        ))}

        {mapStyle === 'political' && oceans.map((ocean) => {
          if (ocean.rank > Math.max(1, visibleRank - 1)) return null;
          const point = projectEquirectangular(ocean.longitude, ocean.latitude, MAP_WIDTH, MAP_HEIGHT);
          const fontSize = mapFontSizeForScreen(9, transform.scale, world);
          return (
            <text
              key={ocean.name}
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(71,85,105,0.85)"
              className="pointer-events-none select-none"
              style={{ fontSize, fontStyle: 'italic', fontWeight: 600, userSelect: 'none' }}
            >
              {ocean.name}
            </text>
          );
        })}

        {countryPaths.map((country) => {
          if (provincesVisible && country.code === 'TR') return null;
          if (country.labelX == null || country.labelY == null || !country.name) return null;
          if (country.labelRank > visibleRank) return null;
          const targetPx = targetLabelScreenPx(country.labelRank);
          if (targetPx <= 0) return null;
          const fontSize = mapFontSizeForScreen(targetPx, transform.scale, world);
          if (fontSize < 0.2) return null;
          const point = projectEquirectangular(country.labelX, country.labelY, MAP_WIDTH, MAP_HEIGHT);
          const isSat = mapStyle === 'satellite';
          return (
            <text
              key={`label-${country.code}`}
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isSat
                ? (country.highlighted ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.78)')
                : (country.highlighted ? 'rgba(15,23,42,0.92)' : 'rgba(75,85,99,0.88)')}
              stroke={isSat ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.92)'}
              strokeWidth={fontSize * (isSat ? 0.18 : 0.16)}
              paintOrder="stroke"
              className="pointer-events-none select-none"
              style={{
                fontSize,
                fontWeight: 700,
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                userSelect: 'none',
              }}
            >
              {country.name}
            </text>
          );
        })}

        {provinceLabelMode !== 'none' && provincePaths.map((province) => {
          if (province.labelX == null || province.labelY == null || !province.name) return null;
          if (provinceLabelMode === 'highlight' && !province.highlighted) return null;
          const targetPx = provinceLabelScreenPx(transform.scale, province.highlighted);
          if (targetPx <= 0) return null;
          const fontSize = mapFontSizeForScreen(targetPx, transform.scale, world);
          if (fontSize < 0.2) return null;
          const point = projectEquirectangular(province.labelX, province.labelY, MAP_WIDTH, MAP_HEIGHT);
          const isSat = mapStyle === 'satellite';
          return (
            <text
              key={`province-label-${province.code}`}
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isSat
                ? (province.highlighted ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.78)')
                : (province.highlighted ? 'rgba(15,23,42,0.92)' : 'rgba(75,85,99,0.88)')}
              stroke={isSat ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.92)'}
              strokeWidth={fontSize * 0.2}
              paintOrder="stroke"
              className="pointer-events-none select-none"
              style={{
                fontSize,
                fontWeight: 700,
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                userSelect: 'none',
              }}
            >
              {province.name}
            </text>
          );
        })}
      </svg>

      {locations
        .filter((location) => {
          if (!provincesVisible) return true;
          if (normalizeSalesMapCountryCode(location.countryCode, location.countryName, location.cityName) !== 'TR') {
            return true;
          }
          return location.administrativeAreaType !== 'country';
        })
        .map((location) => {
          const screen = toScreen(location.longitude, location.latitude);
          const selected = selectedKey === location.key;
          const pinLabel = formatSalesMapPinLabel(location, language, metrics);
          const pinSize = transform.scale >= 5 ? 'lg' : transform.scale >= 2.4 ? 'md' : 'sm';
          return (
            <button
              key={location.key}
              type="button"
              aria-label={`${location.cityName} ${pinLabel}`}
              onClick={(event) => {
                event.stopPropagation();
                if (dragRef.current?.moved) return;
                onSelect(location);
              }}
              className="absolute z-[1] -translate-x-1/2 -translate-y-full border-0 bg-transparent p-0 focus-visible:outline-none"
              style={{ left: screen.x, top: screen.y }}
            >
              <SalesMapLocationPin color={location.color} label={pinLabel} selected={selected} size={pinSize} />
            </button>
          );
        })}

      <SalesMapNavControls
        variant="dpad"
        onZoomIn={() => {
          const node = containerRef.current;
          if (!node) return;
          const rect = node.getBoundingClientRect();
          zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.28);
        }}
        onZoomOut={() => {
          const node = containerRef.current;
          if (!node) return;
          const rect = node.getBoundingClientRect();
          zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 0.78);
        }}
        onPan={(vector) => {
          const step = 48;
          const current = transformRef.current;
          applyTransform({
            scale: current.scale,
            x: current.x - vector.x * step,
            y: current.y - vector.y * step,
          });
        }}
        onResetNorth={() => {
          const currentSize = sizeRef.current;
          const currentWorld = worldRef.current;
          setTransform(centeredTransform(currentSize.width, currentSize.height, currentWorld));
        }}
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
    </div>
  );
}

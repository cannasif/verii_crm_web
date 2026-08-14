import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveAppPath } from '@/lib/api-config';
import { cn } from '@/lib/utils';
import type { DashboardSalesMapLocation, SalesMapMetricState } from '../types/dashboard-sales-map';
import type { SalesMapCountriesGeoJson, SalesMapStyle } from '../types/sales-map-geo';
import {
  countryGeometryToSvgPath,
  findSalesMapLocationForCountry,
  formatSalesMapPinLabel,
  getSalesMapCountryIso,
  getSalesMapCountryName,
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
const MAX_SCALE = 12;
const SATELLITE_SRC = resolveAppPath('/assets/maps/earth-blue-marble-5400.jpg');

interface SalesFlatMapProps {
  locations: RankedSalesMapLocation[];
  selectedKey: string | null;
  mapStyle: SalesMapStyle;
  countries?: SalesMapCountriesGeoJson;
  countryColors: Map<string, string>;
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

function coverWorld(containerWidth: number, containerHeight: number): FittedWorld {
  if (containerWidth / containerHeight > MAP_ASPECT) {
    const width = containerWidth;
    return { width, height: width / MAP_ASPECT };
  }
  const height = containerHeight;
  return { width: height * MAP_ASPECT, height };
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

function maxRankForScale(scale: number): number {
  if (scale < 1.35) return 2;
  if (scale < 2.1) return 3;
  if (scale < 3.2) return 4;
  if (scale < 5) return 5;
  return 6;
}

function labelFontSize(labelRank?: number): number {
  if (labelRank == null) return 8;
  if (labelRank <= 1) return 15;
  if (labelRank <= 2) return 12;
  if (labelRank <= 3) return 10;
  if (labelRank <= 5) return 8;
  if (labelRank <= 6) return 7;
  return 0;
}

export function SalesFlatMap({
  locations,
  selectedKey,
  mapStyle,
  countries,
  countryColors,
  language,
  metrics,
  onSelect,
}: SalesFlatMapProps) {
  const { t } = useTranslation('dashboard');
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const world = useMemo(() => coverWorld(size.width, size.height), [size.height, size.width]);
  const [transform, setTransform] = useState<ViewTransform>({ scale: 1, x: 0, y: 0 });
  const initializedRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => {
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
      setTransform(clampTransform({ scale: 1, x: 0, y: 0 }, size.width, size.height, world));
      return;
    }
    setTransform((current) => clampTransform(current, size.width, size.height, world));
  }, [size.height, size.width, world]);

  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const fitted = coverWorld(rect.width, rect.height);
    setTransform((current) => {
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * factor));
      const worldX = (localX - current.x) / current.scale;
      const worldY = (localY - current.y) / current.scale;
      return clampTransform({
        scale: nextScale,
        x: localX - worldX * nextScale,
        y: localY - worldY * nextScale,
      }, rect.width, rect.height, fitted);
    });
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onWheel = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 0.88 : 1.14;
      zoomAt(event.clientX, event.clientY, factor);
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

  const oceans = useMemo(() => getOceanLabels(language), [language]);
  const visibleRank = maxRankForScale(transform.scale);

  const toScreen = useCallback((longitude: number, latitude: number) => {
    const point = projectEquirectangular(longitude, latitude, world.width, world.height);
    return {
      x: point.x * transform.scale + transform.x,
      y: point.y * transform.scale + transform.y,
    };
  }, [transform.scale, transform.x, transform.y, world.height, world.width]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative h-full min-h-[360px] cursor-grab overflow-hidden active:cursor-grabbing',
        mapStyle === 'political' ? 'bg-[#0b1220]' : 'bg-[#061018]',
      )}
      data-testid="sales-map-flat"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('button') || target.closest('[data-sales-map-nav]')) return;
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originX: transform.x,
          originY: transform.y,
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
        setTransform((current) => clampTransform({
          scale: current.scale,
          x: drag.originX + dx,
          y: drag.originY + dy,
        }, size.width, size.height, world));
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

      <div
        className="absolute left-0 top-0 origin-top-left will-change-transform"
        style={{
          width: world.width,
          height: world.height,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      >
        {mapStyle === 'satellite' ? (
          <img
            src={SATELLITE_SRC}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-fill"
            draggable={false}
          />
        ) : (
          <svg
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill={POLITICAL_OCEAN} />
            {countryPaths.map((country) => (
              <path
                key={country.code || country.path.slice(0, 24)}
                d={country.path}
                fill={country.color ?? POLITICAL_LAND}
                stroke={country.highlighted ? POLITICAL_BORDER_ACTIVE : POLITICAL_BORDER}
                strokeWidth={country.highlighted ? 1.25 : 0.9}
                style={country.highlighted ? { cursor: 'pointer' } : undefined}
                onClick={(event) => {
                  if (!country.highlighted || !country.code) return;
                  event.stopPropagation();
                  if (dragRef.current?.moved) return;
                  const location = findSalesMapLocationForCountry(locations, country.code);
                  if (location) onSelect(location);
                }}
              />
            ))}
            {oceans.map((ocean) => {
              if (ocean.rank > Math.max(1, visibleRank - 1)) return null;
              const point = projectEquirectangular(ocean.longitude, ocean.latitude, MAP_WIDTH, MAP_HEIGHT);
              return (
                <text
                  key={ocean.name}
                  x={point.x}
                  y={point.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(71,85,105,0.85)"
                  style={{ fontSize: 14, fontStyle: 'italic', fontWeight: 600 }}
                >
                  {ocean.name}
                </text>
              );
            })}
            {countryPaths.map((country) => {
              if (country.labelX == null || country.labelY == null || !country.name) return null;
              if (country.labelRank > visibleRank) return null;
              const fontSize = labelFontSize(country.labelRank);
              if (fontSize < 6) return null;
              const point = projectEquirectangular(country.labelX, country.labelY, MAP_WIDTH, MAP_HEIGHT);
              return (
                <text
                  key={`label-${country.code}`}
                  x={point.x}
                  y={point.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={country.highlighted ? 'rgba(15,23,42,0.92)' : 'rgba(75,85,99,0.88)'}
                  stroke="rgba(255,255,255,0.92)"
                  strokeWidth={fontSize * 0.16}
                  paintOrder="stroke"
                  style={{ fontSize, fontWeight: 700, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
                >
                  {country.name}
                </text>
              );
            })}
          </svg>
        )}
      </div>

      {locations.map((location) => {
        const screen = toScreen(location.longitude, location.latitude);
        const selected = selectedKey === location.key;
        const pinLabel = formatSalesMapPinLabel(location, language, metrics);
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
            <SalesMapLocationPin color={location.color} label={pinLabel} selected={selected} />
          </button>
        );
      })}

      <SalesMapNavControls
        variant="dpad"
        onZoomIn={() => {
          const node = containerRef.current;
          if (!node) return;
          const rect = node.getBoundingClientRect();
          zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.35);
        }}
        onZoomOut={() => {
          const node = containerRef.current;
          if (!node) return;
          const rect = node.getBoundingClientRect();
          zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 0.74);
        }}
        onPan={(vector) => {
          const step = 48;
          setTransform((current) => clampTransform({
            scale: current.scale,
            x: current.x - vector.x * step,
            y: current.y - vector.y * step,
          }, size.width, size.height, world));
        }}
        onResetNorth={() => setTransform(clampTransform({ scale: 1, x: 0, y: 0 }, size.width, size.height, world))}
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

import { useEffect, useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { SalesMapCountriesGeoJson } from '../types/sales-map-geo';
import {
  normalizeSalesMapProvinceKey,
  POLITICAL_LAND,
  POLITICAL_OCEAN,
} from '../utils/sales-map-geo';
import {
  buildSphereCountryMeshes,
  buildSphereProvinceMeshes,
  getOceanLabels,
  POLITICAL_BORDER_COLOR,
  type SphereCountryMeshData,
} from '../utils/sales-map-sphere-geo';

const EARTH_RADIUS = 2;
const TURKEY_LATITUDE = 39;
const TURKEY_LONGITUDE = 35;
const PROVINCE_SHOW_DISTANCE = 4.45;
const PROVINCE_LABEL_HIGHLIGHT_DISTANCE = 3.05;
const PROVINCE_LABEL_ALL_DISTANCE = 2.62;
const PROVINCE_VIEW_DOT = 0.42;

function latLngToVector(latitude: number, longitude: number, radius = EARTH_RADIUS): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - latitude);
  const theta = THREE.MathUtils.degToRad(longitude + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function maxLabelRankForDistance(distance: number): number {
  if (distance > 6.8) return 1;
  if (distance > 5.4) return 2;
  if (distance > 4.4) return 3;
  if (distance > 3.5) return 4;
  if (distance > 2.9) return 5;
  return 6;
}

function isTurkeyCentered(camera: THREE.Camera): boolean {
  const turkey = latLngToVector(TURKEY_LATITUDE, TURKEY_LONGITUDE).normalize();
  return camera.position.clone().normalize().dot(turkey) > PROVINCE_VIEW_DOT;
}

function CountryMesh({
  country,
  color,
  selectable,
  onSelectCountry,
  opacity = 1,
}: {
  country: SphereCountryMeshData;
  color: string;
  selectable: boolean;
  onSelectCountry?: (countryCode: string) => void;
  opacity?: number;
}) {
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const transparent = opacity < 0.999;

  useEffect(() => () => {
    country.fillGeometry?.dispose();
  }, [country.fillGeometry]);

  if (!country.fillGeometry) return null;
  return (
    <mesh
      geometry={country.fillGeometry}
      onPointerDown={(event) => {
        if (!selectable) return;
        pointerStartRef.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        if (!selectable || !onSelectCountry) return;
        const start = pointerStartRef.current;
        pointerStartRef.current = null;
        if (!start) return;
        const moved = Math.abs(event.clientX - start.x) + Math.abs(event.clientY - start.y);
        if (moved > 6) return;
        event.stopPropagation();
        onSelectCountry(country.code);
      }}
      onPointerOver={() => {
        if (!selectable) return;
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        if (!selectable) return;
        document.body.style.cursor = 'auto';
      }}
    >
      <meshStandardMaterial
        color={color}
        roughness={0.92}
        metalness={0.02}
        side={THREE.DoubleSide}
        transparent={transparent}
        opacity={opacity}
        depthWrite={!transparent}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}

function CountryBorders({
  countries,
  color = POLITICAL_BORDER_COLOR,
  opacity = 0.85,
}: {
  countries: SphereCountryMeshData[];
  color?: string;
  opacity?: number;
}) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    countries.forEach((country) => {
      country.borderPositions.forEach((value) => positions.push(value));
    });
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return next;
  }, [countries]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
}

export function SatelliteGlobeBorders({
  countriesGeo,
  provincesGeo,
  countryColors,
  provinceColors,
  language,
  onSelectCountry,
  onSelectProvince,
}: {
  countriesGeo: SalesMapCountriesGeoJson;
  provincesGeo?: SalesMapCountriesGeoJson;
  countryColors: Map<string, string>;
  provinceColors?: Map<string, string>;
  language: string;
  onSelectCountry?: (countryCode: string) => void;
  onSelectProvince?: (provinceCode: string) => void;
}) {
  const { camera } = useThree();
  const [maxRank, setMaxRank] = useState(3);
  const [provincesVisible, setProvincesVisible] = useState(false);
  const [provinceLabelMode, setProvinceLabelMode] = useState<'none' | 'highlight' | 'all'>('none');
  const countries = useMemo(
    () => buildSphereCountryMeshes(countriesGeo, language, EARTH_RADIUS + 0.014),
    [countriesGeo, language],
  );
  const provinces = useMemo(
    () => (provincesGeo ? buildSphereProvinceMeshes(provincesGeo, language, EARTH_RADIUS + 0.02) : []),
    [language, provincesGeo],
  );

  useFrame(() => {
    const distance = camera.position.length();
    const turkeyCentered = isTurkeyCentered(camera);
    const nextProvinces = Boolean(provincesGeo) && distance <= PROVINCE_SHOW_DISTANCE && turkeyCentered;
    const nextLabelMode: 'none' | 'highlight' | 'all' = !nextProvinces
      ? 'none'
      : distance <= PROVINCE_LABEL_ALL_DISTANCE
        ? 'all'
        : distance <= PROVINCE_LABEL_HIGHLIGHT_DISTANCE
          ? 'highlight'
          : 'none';
    const nextRank = maxLabelRankForDistance(distance);
    setMaxRank((current) => (current === nextRank ? current : nextRank));
    setProvincesVisible((current) => (current === nextProvinces ? current : nextProvinces));
    setProvinceLabelMode((current) => (current === nextLabelMode ? current : nextLabelMode));
  });

  useEffect(() => () => {
    countries.forEach((country) => country.fillGeometry?.dispose());
  }, [countries]);

  useEffect(() => () => {
    provinces.forEach((province) => province.fillGeometry?.dispose());
  }, [provinces]);

  return (
    <group>
      {countries.map((country) => {
        if (provincesVisible && country.code === 'TR') return null;
        const highlighted = countryColors.has(country.code);
        if (!highlighted) return null;
        return (
          <CountryMesh
            key={country.code}
            country={country}
            color={countryColors.get(country.code) ?? '#38bdf8'}
            selectable
            opacity={0.52}
            onSelectCountry={onSelectCountry}
          />
        );
      })}
      <CountryBorders
        countries={provincesVisible ? countries.filter((country) => country.code !== 'TR') : countries}
        color="#f8fafc"
        opacity={0.78}
      />
      {provincesVisible && (
        <>
          {provinces.map((province) => {
            const colorKey = normalizeSalesMapProvinceKey(province.name);
            const highlighted = Boolean(provinceColors?.has(colorKey));
            if (!highlighted) return null;
            return (
              <CountryMesh
                key={`province-${province.code}`}
                country={province}
                color={provinceColors?.get(colorKey) ?? '#38bdf8'}
                selectable
                opacity={0.55}
                onSelectCountry={onSelectProvince}
              />
            );
          })}
          <CountryBorders countries={provinces} color="#e2e8f0" opacity={0.9} />
        </>
      )}
      {countries.map((country) => {
        if (provincesVisible && country.code === 'TR') return null;
        if (!country.name || country.labelRank > maxRank) return null;
        if (country.labelLongitude === 0 && country.labelLatitude === 0) return null;
        return (
          <MapLabel
            key={`sat-label-${country.code}`}
            text={country.name}
            latitude={country.labelLatitude}
            longitude={country.labelLongitude}
            muted={!countryColors.has(country.code)}
            onSatellite
          />
        );
      })}
      {provinceLabelMode !== 'none' && provinces.map((province) => {
        if (!province.name) return null;
        if (province.labelLongitude === 0 && province.labelLatitude === 0) return null;
        const colorKey = normalizeSalesMapProvinceKey(province.name);
        const highlighted = Boolean(provinceColors?.has(colorKey));
        if (provinceLabelMode === 'highlight' && !highlighted) return null;
        return (
          <MapLabel
            key={`sat-province-label-${province.code}`}
            text={province.name}
            latitude={province.labelLatitude}
            longitude={province.labelLongitude}
            muted={!highlighted}
            compact
            onSatellite
          />
        );
      })}
    </group>
  );
}

function MapLabel({
  text,
  latitude,
  longitude,
  muted = false,
  ocean = false,
  compact = false,
  onSatellite = false,
}: {
  text: string;
  latitude: number;
  longitude: number;
  muted?: boolean;
  ocean?: boolean;
  compact?: boolean;
  onSatellite?: boolean;
}) {
  const { camera } = useThree();
  const [visible, setVisible] = useState(true);
  const position = useMemo(
    () => latLngToVector(latitude, longitude, EARTH_RADIUS + 0.025),
    [latitude, longitude],
  );

  useFrame(() => {
    const pinDir = position.clone().normalize();
    const camDir = camera.position.clone().normalize();
    const threshold = ocean ? 0.4 : muted ? 0.48 : 0.32;
    const next = pinDir.dot(camDir) > threshold;
    setVisible((current) => (current === next ? current : next));
  });

  if (!visible || !text) return null;

  const className = onSatellite
    ? (muted
      ? (compact ? 'whitespace-nowrap text-[9px] font-bold text-white/75' : 'whitespace-nowrap text-[10px] font-bold text-white/80')
      : (compact ? 'whitespace-nowrap text-[9px] font-bold text-white' : 'whitespace-nowrap text-[11px] font-bold text-white'))
    : ocean
      ? 'whitespace-nowrap text-[10px] font-semibold italic text-slate-500/90'
      : muted
        ? (compact ? 'whitespace-nowrap text-[9px] font-bold text-slate-600' : 'whitespace-nowrap text-[10px] font-bold text-slate-600')
        : (compact ? 'whitespace-nowrap text-[9px] font-bold text-slate-900' : 'whitespace-nowrap text-[11px] font-bold text-slate-900');

  return (
    <Html position={position} center style={{ pointerEvents: 'none', userSelect: 'none' }} zIndexRange={[8, 0]}>
      <span
        className={className}
        style={{
          textShadow: onSatellite
            ? '0 1px 2px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.75)'
            : '0 0 3px rgba(255,255,255,0.95), 0 0 6px rgba(255,255,255,0.8)',
        }}
      >
        {text}
      </span>
    </Html>
  );
}

export function PoliticalGlobeLayer({
  countriesGeo,
  provincesGeo,
  countryColors,
  provinceColors,
  language,
  onSelectCountry,
  onSelectProvince,
}: {
  countriesGeo: SalesMapCountriesGeoJson;
  provincesGeo?: SalesMapCountriesGeoJson;
  countryColors: Map<string, string>;
  provinceColors?: Map<string, string>;
  language: string;
  onSelectCountry?: (countryCode: string) => void;
  onSelectProvince?: (provinceCode: string) => void;
}) {
  const { camera } = useThree();
  const [maxRank, setMaxRank] = useState(3);
  const [provincesVisible, setProvincesVisible] = useState(false);
  const [provinceLabelMode, setProvinceLabelMode] = useState<'none' | 'highlight' | 'all'>('none');
  const countries = useMemo(
    () => buildSphereCountryMeshes(countriesGeo, language, EARTH_RADIUS + 0.012),
    [countriesGeo, language],
  );
  const provinces = useMemo(
    () => (provincesGeo ? buildSphereProvinceMeshes(provincesGeo, language, EARTH_RADIUS + 0.018) : []),
    [language, provincesGeo],
  );
  const oceans = useMemo(() => getOceanLabels(language), [language]);

  useFrame(() => {
    const distance = camera.position.length();
    const turkeyCentered = isTurkeyCentered(camera);
    const nextProvinces = Boolean(provincesGeo) && distance <= PROVINCE_SHOW_DISTANCE && turkeyCentered;
    const nextLabelMode: 'none' | 'highlight' | 'all' = !nextProvinces
      ? 'none'
      : distance <= PROVINCE_LABEL_ALL_DISTANCE
        ? 'all'
        : distance <= PROVINCE_LABEL_HIGHLIGHT_DISTANCE
          ? 'highlight'
          : 'none';
    const nextRank = maxLabelRankForDistance(distance);
    setMaxRank((current) => (current === nextRank ? current : nextRank));
    setProvincesVisible((current) => (current === nextProvinces ? current : nextProvinces));
    setProvinceLabelMode((current) => (current === nextLabelMode ? current : nextLabelMode));
  });

  useEffect(() => () => {
    countries.forEach((country) => country.fillGeometry?.dispose());
  }, [countries]);

  useEffect(() => () => {
    provinces.forEach((province) => province.fillGeometry?.dispose());
  }, [provinces]);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 96, 72]} />
        <meshStandardMaterial color={POLITICAL_OCEAN} roughness={0.95} metalness={0} />
      </mesh>
      {countries.map((country) => {
        if (provincesVisible && country.code === 'TR') return null;
        return (
          <CountryMesh
            key={country.code}
            country={country}
            color={countryColors.get(country.code) ?? POLITICAL_LAND}
            selectable={countryColors.has(country.code)}
            onSelectCountry={onSelectCountry}
          />
        );
      })}
      <CountryBorders
        countries={provincesVisible ? countries.filter((country) => country.code !== 'TR') : countries}
      />
      {provincesVisible && (
        <>
          {provinces.map((province) => {
            const colorKey = normalizeSalesMapProvinceKey(province.name);
            const highlighted = Boolean(provinceColors?.has(colorKey));
            return (
              <CountryMesh
                key={`province-${province.code}`}
                country={province}
                color={provinceColors?.get(colorKey) ?? POLITICAL_LAND}
                selectable={highlighted}
                onSelectCountry={onSelectProvince}
              />
            );
          })}
          <CountryBorders countries={provinces} color="#4b5563" opacity={0.95} />
        </>
      )}
      <mesh scale={1.05}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 48]} />
        <meshBasicMaterial
          color="#7eb8ea"
          transparent
          opacity={0.2}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      {countries.map((country) => {
        if (provincesVisible && country.code === 'TR') return null;
        if (!country.name || country.labelRank > maxRank) return null;
        if (country.labelLongitude === 0 && country.labelLatitude === 0) return null;
        return (
          <MapLabel
            key={`label-${country.code}`}
            text={country.name}
            latitude={country.labelLatitude}
            longitude={country.labelLongitude}
            muted={!countryColors.has(country.code)}
          />
        );
      })}
      {provinceLabelMode !== 'none' && provinces.map((province) => {
        if (!province.name) return null;
        if (province.labelLongitude === 0 && province.labelLatitude === 0) return null;
        const colorKey = normalizeSalesMapProvinceKey(province.name);
        const highlighted = Boolean(provinceColors?.has(colorKey));
        if (provinceLabelMode === 'highlight' && !highlighted) return null;
        return (
          <MapLabel
            key={`province-label-${province.code}`}
            text={province.name}
            latitude={province.labelLatitude}
            longitude={province.labelLongitude}
            muted={!highlighted}
            compact
          />
        );
      })}
      {oceans.map((ocean) => {
        if (ocean.rank > Math.max(1, maxRank - 1)) return null;
        return (
          <MapLabel
            key={`ocean-${ocean.name}`}
            text={ocean.name}
            latitude={ocean.latitude}
            longitude={ocean.longitude}
            ocean
          />
        );
      })}
    </group>
  );
}

export function Starfield() {
  const positions = useMemo(() => {
    const count = 1400;
    const values = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const radius = 16 + Math.random() * 22;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      values[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      values[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      values[index * 3 + 2] = radius * Math.cos(phi);
    }
    return values;
  }, []);

  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return next;
  }, [positions]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <points geometry={geometry}>
      <pointsMaterial color="#e8f1ff" size={0.038} sizeAttenuation transparent opacity={0.9} />
    </points>
  );
}

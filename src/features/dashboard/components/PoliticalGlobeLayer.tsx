import { useEffect, useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { SalesMapCountriesGeoJson } from '../types/sales-map-geo';
import {
  POLITICAL_LAND,
  POLITICAL_OCEAN,
} from '../utils/sales-map-geo';
import {
  buildSphereCountryMeshes,
  getOceanLabels,
  POLITICAL_BORDER_COLOR,
  type SphereCountryMeshData,
} from '../utils/sales-map-sphere-geo';

const EARTH_RADIUS = 2;

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
  if (distance > 7.2) return 2;
  if (distance > 5.5) return 3;
  if (distance > 4.2) return 4;
  if (distance > 3.4) return 5;
  return 6;
}

function CountryMesh({
  country,
  color,
  selectable,
  onSelectCountry,
}: {
  country: SphereCountryMeshData;
  color: string;
  selectable: boolean;
  onSelectCountry?: (countryCode: string) => void;
}) {
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

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
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}

function CountryBorders({ countries }: { countries: SphereCountryMeshData[] }) {
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
      <lineBasicMaterial color={POLITICAL_BORDER_COLOR} transparent opacity={0.85} />
    </lineSegments>
  );
}

function MapLabel({
  text,
  latitude,
  longitude,
  muted = false,
  ocean = false,
}: {
  text: string;
  latitude: number;
  longitude: number;
  muted?: boolean;
  ocean?: boolean;
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
    const next = pinDir.dot(camDir) > 0.18;
    setVisible((current) => (current === next ? current : next));
  });

  if (!visible || !text) return null;

  return (
    <Html position={position} center style={{ pointerEvents: 'none', userSelect: 'none' }} zIndexRange={[8, 0]}>
      <span
        className={ocean
          ? 'whitespace-nowrap text-[10px] font-semibold italic text-slate-500/90'
          : muted
            ? 'whitespace-nowrap text-[10px] font-bold text-slate-600'
            : 'whitespace-nowrap text-[11px] font-bold text-slate-900'}
        style={{
          textShadow: '0 0 3px rgba(255,255,255,0.95), 0 0 6px rgba(255,255,255,0.8)',
        }}
      >
        {text}
      </span>
    </Html>
  );
}

export function PoliticalGlobeLayer({
  countriesGeo,
  countryColors,
  language,
  onSelectCountry,
}: {
  countriesGeo: SalesMapCountriesGeoJson;
  countryColors: Map<string, string>;
  language: string;
  onSelectCountry?: (countryCode: string) => void;
}) {
  const { camera } = useThree();
  const [maxRank, setMaxRank] = useState(3);
  const countries = useMemo(
    () => buildSphereCountryMeshes(countriesGeo, language, EARTH_RADIUS + 0.012),
    [countriesGeo, language],
  );
  const oceans = useMemo(() => getOceanLabels(language), [language]);

  useFrame(() => {
    const next = maxLabelRankForDistance(camera.position.length());
    setMaxRank((current) => (current === next ? current : next));
  });

  useEffect(() => () => {
    countries.forEach((country) => country.fillGeometry?.dispose());
  }, [countries]);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 96, 72]} />
        <meshStandardMaterial color={POLITICAL_OCEAN} roughness={0.95} metalness={0} />
      </mesh>
      {countries.map((country) => (
        <CountryMesh
          key={country.code}
          country={country}
          color={countryColors.get(country.code) ?? POLITICAL_LAND}
          selectable={countryColors.has(country.code)}
          onSelectCountry={onSelectCountry}
        />
      ))}
      <CountryBorders countries={countries} />
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

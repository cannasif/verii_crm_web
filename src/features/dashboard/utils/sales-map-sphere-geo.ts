import * as THREE from 'three';
import type { SalesMapCountriesGeoJson, SalesMapCountryFeature } from '../types/sales-map-geo';
import {
  getSalesMapCountryIso,
  getSalesMapCountryName,
  POLITICAL_BORDER,
  POLITICAL_LAND,
} from './sales-map-geo';

export interface SphereCountryMeshData {
  code: string;
  name: string;
  labelRank: number;
  labelLongitude: number;
  labelLatitude: number;
  fillGeometry: THREE.BufferGeometry | null;
  borderPositions: Float32Array;
}

function latLngToVector(latitude: number, longitude: number, radius: number): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - latitude);
  const theta = THREE.MathUtils.degToRad(longitude + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function closedRing(ring: number[][]): number[][] {
  if (ring.length < 2) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring.slice(0, -1);
  return ring;
}

function ringCrossesAntimeridian(ring: number[][]): boolean {
  for (let index = 1; index < ring.length; index += 1) {
    if (Math.abs(ring[index][0] - ring[index - 1][0]) > 180) return true;
  }
  return false;
}

function unwrapRing(ring: number[][]): number[][] {
  if (ring.length === 0) return ring;
  const next: number[][] = [[ring[0][0], ring[0][1]]];
  for (let index = 1; index < ring.length; index += 1) {
    let longitude = ring[index][0];
    const previous = next[next.length - 1][0];
    while (longitude - previous > 180) longitude -= 360;
    while (previous - longitude > 180) longitude += 360;
    next.push([longitude, ring[index][1]]);
  }
  return next;
}

function shiftRing(ring: number[][], offset: number): number[][] {
  return ring.map(([longitude, latitude]) => [longitude + offset, latitude]);
}

const MAX_EDGE_DEG = 2.4;

function normalizeLonLat(longitude: number, latitude: number): { longitude: number; latitude: number } {
  return {
    longitude: ((((longitude + 180) % 360) + 360) % 360) - 180,
    latitude: Math.max(-90, Math.min(90, latitude)),
  };
}

function densifyRing(ring: number[][], maxStepDeg = MAX_EDGE_DEG): number[][] {
  if (ring.length < 2) return ring;
  const densified: number[][] = [];
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    densified.push(current);
    const dLon = next[0] - current[0];
    const dLat = next[1] - current[1];
    const distance = Math.hypot(dLon, dLat);
    const steps = Math.max(1, Math.ceil(distance / maxStepDeg));
    for (let step = 1; step < steps; step += 1) {
      const t = step / steps;
      densified.push([current[0] + dLon * t, current[1] + dLat * t]);
    }
  }
  return densified;
}

function pushSphereVertex(longitude: number, latitude: number, radius: number, positions: number[]): void {
  const normalized = normalizeLonLat(longitude, latitude);
  const vertex = latLngToVector(normalized.latitude, normalized.longitude, radius);
  positions.push(vertex.x, vertex.y, vertex.z);
}

function pushSubdividedTriangle(
  a: THREE.Vector2,
  b: THREE.Vector2,
  c: THREE.Vector2,
  radius: number,
  positions: number[],
  depth = 0,
): void {
  const ab = Math.hypot(a.x - b.x, a.y - b.y);
  const bc = Math.hypot(b.x - c.x, b.y - c.y);
  const ca = Math.hypot(c.x - a.x, c.y - a.y);
  const longest = Math.max(ab, bc, ca);
  if (longest <= MAX_EDGE_DEG || depth >= 8) {
    pushSphereVertex(a.x, a.y, radius, positions);
    pushSphereVertex(b.x, b.y, radius, positions);
    pushSphereVertex(c.x, c.y, radius, positions);
    return;
  }
  if (ab >= bc && ab >= ca) {
    const mid = new THREE.Vector2((a.x + b.x) * 0.5, (a.y + b.y) * 0.5);
    pushSubdividedTriangle(a, mid, c, radius, positions, depth + 1);
    pushSubdividedTriangle(mid, b, c, radius, positions, depth + 1);
    return;
  }
  if (bc >= ab && bc >= ca) {
    const mid = new THREE.Vector2((b.x + c.x) * 0.5, (b.y + c.y) * 0.5);
    pushSubdividedTriangle(a, b, mid, radius, positions, depth + 1);
    pushSubdividedTriangle(a, mid, c, radius, positions, depth + 1);
    return;
  }
  const mid = new THREE.Vector2((c.x + a.x) * 0.5, (c.y + a.y) * 0.5);
  pushSubdividedTriangle(a, b, mid, radius, positions, depth + 1);
  pushSubdividedTriangle(mid, b, c, radius, positions, depth + 1);
}

function buildPolygonGeometry(rings: number[][][], radius: number): THREE.BufferGeometry | null {
  if (rings.length === 0) return null;
  const outerRing = closedRing(rings[0]);
  if (outerRing.length < 3) return null;

  const unwrappedOuter = densifyRing(unwrapRing(outerRing));
  const holes = rings
    .slice(1)
    .map((ring) => densifyRing(unwrapRing(closedRing(ring))))
    .filter((hole) => hole.length >= 3);

  const candidates: number[][][][] = [[unwrappedOuter, ...holes]];
  if (ringCrossesAntimeridian(outerRing) || unwrappedOuter.some(([longitude]) => longitude < -180 || longitude > 180)) {
    candidates.push([shiftRing(unwrappedOuter, -360), ...holes.map((hole) => shiftRing(hole, -360))]);
    candidates.push([shiftRing(unwrappedOuter, 360), ...holes.map((hole) => shiftRing(hole, 360))]);
  }

  for (const candidate of candidates) {
    const contour = candidate[0].map(([longitude, latitude]) => new THREE.Vector2(longitude, latitude));
    const holeShapes = candidate.slice(1).map((ring) => (
      ring.map(([longitude, latitude]) => new THREE.Vector2(longitude, latitude))
    ));
    let faces: number[][];
    try {
      faces = THREE.ShapeUtils.triangulateShape(contour, holeShapes);
    } catch {
      continue;
    }
    const flat = [...contour, ...holeShapes.flat()];
    const positions: number[] = [];
    faces.forEach((face) => {
      const a = flat[face[0]];
      const b = flat[face[1]];
      const c = flat[face[2]];
      if (!a || !b || !c) return;
      pushSubdividedTriangle(a, b, c, radius, positions);
    });
    if (positions.length < 9) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  return null;
}

function buildBorderPositions(rings: number[][][], radius: number): number[] {
  const positions: number[] = [];
  rings.forEach((ring) => {
    const unwrapped = densifyRing(unwrapRing(closedRing(ring)), 1.5);
    for (let index = 0; index < unwrapped.length; index += 1) {
      const [lonA, latA] = unwrapped[index];
      const [lonB, latB] = unwrapped[(index + 1) % unwrapped.length];
      if (Math.abs(lonA - lonB) > 180) continue;
      const a = latLngToVector(latA, normalizeLonLat(lonA, latA).longitude, radius);
      const b = latLngToVector(latB, normalizeLonLat(lonB, latB).longitude, radius);
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  });
  return positions;
}

function featurePolygons(feature: SalesMapCountryFeature): number[][][][] {
  if (feature.geometry.type === 'Polygon') {
    return [feature.geometry.coordinates as number[][][]];
  }
  return feature.geometry.coordinates as number[][][][];
}

function mergeGeometriesSafe(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  geometries.forEach((geometry) => {
    const attribute = geometry.getAttribute('position');
    for (let index = 0; index < attribute.count; index += 1) {
      positions.push(attribute.getX(index), attribute.getY(index), attribute.getZ(index));
    }
  });
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.computeVertexNormals();
  return merged;
}

export function buildSphereCountryMeshes(
  geo: SalesMapCountriesGeoJson,
  language: string,
  radius: number,
): SphereCountryMeshData[] {
  return geo.features.map((feature) => {
    const code = getSalesMapCountryIso(feature.properties);
    const polygons = featurePolygons(feature);
    const geometries: THREE.BufferGeometry[] = [];
    const border: number[] = [];

    polygons.forEach((rings) => {
      const geometry = buildPolygonGeometry(rings, radius);
      if (geometry) geometries.push(geometry);
      border.push(...buildBorderPositions(rings, radius + 0.003));
    });

    let fillGeometry: THREE.BufferGeometry | null = null;
    if (geometries.length === 1) {
      fillGeometry = geometries[0];
    } else if (geometries.length > 1) {
      fillGeometry = mergeGeometriesSafe(geometries);
      geometries.forEach((geometry) => geometry.dispose());
    }

    return {
      code,
      name: getSalesMapCountryName(feature.properties, language),
      labelRank: feature.properties.LABELRANK ?? 5,
      labelLongitude: typeof feature.properties.LABEL_X === 'number' ? feature.properties.LABEL_X : 0,
      labelLatitude: typeof feature.properties.LABEL_Y === 'number' ? feature.properties.LABEL_Y : 0,
      fillGeometry,
      borderPositions: new Float32Array(border),
    };
  }).filter((country) => Boolean(country.code));
}

export function buildSphereProvinceMeshes(
  geo: SalesMapCountriesGeoJson,
  language: string,
  radius: number,
): SphereCountryMeshData[] {
  return geo.features.map((feature) => {
    const code = (feature.properties.PROVINCE_CODE || '').trim().toLowerCase();
    const polygons = featurePolygons(feature);
    const geometries: THREE.BufferGeometry[] = [];
    const border: number[] = [];

    polygons.forEach((rings) => {
      const geometry = buildPolygonGeometry(rings, radius);
      if (geometry) geometries.push(geometry);
      border.push(...buildBorderPositions(rings, radius + 0.002));
    });

    let fillGeometry: THREE.BufferGeometry | null = null;
    if (geometries.length === 1) {
      fillGeometry = geometries[0];
    } else if (geometries.length > 1) {
      fillGeometry = mergeGeometriesSafe(geometries);
      geometries.forEach((geometry) => geometry.dispose());
    }

    return {
      code,
      name: getSalesMapCountryName(feature.properties, language),
      labelRank: feature.properties.LABELRANK ?? 4,
      labelLongitude: typeof feature.properties.LABEL_X === 'number' ? feature.properties.LABEL_X : 0,
      labelLatitude: typeof feature.properties.LABEL_Y === 'number' ? feature.properties.LABEL_Y : 0,
      fillGeometry,
      borderPositions: new Float32Array(border),
    };
  }).filter((province) => Boolean(province.code));
}

export const POLITICAL_OCEAN_COLOR = '#9ec5e8';
export const POLITICAL_LAND_COLOR = POLITICAL_LAND;
export const POLITICAL_BORDER_COLOR = POLITICAL_BORDER;

export function getOceanLabels(language: string): Array<{ name: string; latitude: number; longitude: number; rank: number }> {
  if (language.startsWith('tr')) {
    return [
      { name: 'Kuzey Atlas Okyanusu', latitude: 35, longitude: -40, rank: 1 },
      { name: 'Güney Atlas Okyanusu', latitude: -30, longitude: -15, rank: 2 },
      { name: 'Hint Okyanusu', latitude: -15, longitude: 70, rank: 1 },
      { name: 'Kuzey Pasifik Okyanusu', latitude: 30, longitude: -160, rank: 1 },
      { name: 'Güney Pasifik Okyanusu', latitude: -25, longitude: -140, rank: 2 },
      { name: 'Akdeniz', latitude: 35, longitude: 18, rank: 3 },
      { name: 'Karadeniz', latitude: 43, longitude: 34, rank: 4 },
    ];
  }
  return [
    { name: 'North Atlantic Ocean', latitude: 35, longitude: -40, rank: 1 },
    { name: 'South Atlantic Ocean', latitude: -30, longitude: -15, rank: 2 },
    { name: 'Indian Ocean', latitude: -15, longitude: 70, rank: 1 },
    { name: 'North Pacific Ocean', latitude: 30, longitude: -160, rank: 1 },
    { name: 'South Pacific Ocean', latitude: -25, longitude: -140, rank: 2 },
    { name: 'Mediterranean Sea', latitude: 35, longitude: 18, rank: 3 },
    { name: 'Black Sea', latitude: 43, longitude: 34, rank: 4 },
  ];
}

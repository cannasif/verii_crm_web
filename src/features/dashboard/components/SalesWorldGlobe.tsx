import {
  forwardRef,
  Suspense,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { Html } from '@react-three/drei';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { resolveAppPath } from '@/lib/api-config';
import type { DashboardSalesMapLocation, SalesMapMetricState } from '../types/dashboard-sales-map';
import type { SalesMapCountriesGeoJson, SalesMapStyle } from '../types/sales-map-geo';
import type { RankedSalesMapLocation } from '../utils/sales-map-metrics';
import {
  formatSalesMapPinLabel,
  findSalesMapLocationForCountry,
  findSalesMapLocationForProvince,
  normalizeSalesMapCountryCode,
} from '../utils/sales-map-geo';
import { PoliticalGlobeLayer, SatelliteGlobeBorders, Starfield } from './PoliticalGlobeLayer';
import { SalesMapLocationPin } from './SalesMapLocationPin';
import type { SalesMapPanVector } from './SalesMapNavControls';

export interface SalesWorldGlobeHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  pan: (vector: SalesMapPanVector) => void;
  resetNorth: () => void;
}

interface SalesWorldGlobeProps {
  locations: RankedSalesMapLocation[];
  selectedKey: string | null;
  autoRotate: boolean;
  mapStyle: SalesMapStyle;
  countriesGeo?: SalesMapCountriesGeoJson;
  provincesGeo?: SalesMapCountriesGeoJson;
  countryColors: Map<string, string>;
  provinceColors?: Map<string, string>;
  language: string;
  metrics: SalesMapMetricState;
  onSelect: (location: DashboardSalesMapLocation) => void;
  onHover: (location: DashboardSalesMapLocation | null) => void;
}

interface GlobeNavApi {
  zoomIn: () => void;
  zoomOut: () => void;
  pan: (vector: SalesMapPanVector) => void;
  resetNorth: () => void;
}

const EARTH_RADIUS = 2;
const MIN_DISTANCE = 2.38;
const MAX_DISTANCE = 7.8;
const MIN_POLAR = 0.12;
const MAX_POLAR = Math.PI - 0.12;
const SATELLITE_SRC = resolveAppPath('/assets/maps/earth-blue-marble-5400.jpg');
const ZOOM_STEP = 1.12;
const AUTO_ROTATE_RAD_PER_SEC = 0.045;
const GLOBE_CONTROLS_VERSION = 'pixel-pan-v3';

function latLngToVector(latitude: number, longitude: number, radius = EARTH_RADIUS): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - latitude);
  const theta = THREE.MathUtils.degToRad(longitude + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function setCameraSpherical(camera: THREE.Camera, next: THREE.Spherical): void {
  next.phi = THREE.MathUtils.clamp(next.phi, MIN_POLAR, MAX_POLAR);
  next.radius = THREE.MathUtils.clamp(next.radius, MIN_DISTANCE, MAX_DISTANCE);
  camera.position.setFromSpherical(next);
  camera.up.set(0, 1, 0);
  camera.lookAt(0, 0, 0);
}

function dollyCamera(camera: THREE.Camera, factor: number): void {
  const spherical = new THREE.Spherical().setFromVector3(camera.position);
  spherical.radius *= factor;
  setCameraSpherical(camera, spherical);
}

function pointerToNdc(clientX: number, clientY: number, rect: DOMRect): THREE.Vector2 {
  return new THREE.Vector2(
    ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
    -(((clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1),
  );
}

function intersectEarth(
  camera: THREE.Camera,
  ndc: THREE.Vector2,
  target: THREE.Vector3,
): boolean {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, camera);
  const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), EARTH_RADIUS);
  return raycaster.ray.intersectSphere(sphere, target) !== null;
}

function unitToLonLat(point: THREE.Vector3): { lon: number; lat: number } {
  const n = point.clone().normalize();
  return {
    lat: Math.asin(THREE.MathUtils.clamp(n.y, -1, 1)),
    lon: Math.atan2(n.z, -n.x),
  };
}

function keepAnchorUnderCursor(
  camera: THREE.PerspectiveCamera,
  anchor: THREE.Vector3,
  ndc: THREE.Vector2,
): void {
  camera.updateMatrixWorld(true);
  const hit = new THREE.Vector3();
  if (!intersectEarth(camera, ndc, hit)) return;
  const from = unitToLonLat(hit);
  const to = unitToLonLat(anchor);
  let dLon = to.lon - from.lon;
  if (dLon > Math.PI) dLon -= Math.PI * 2;
  if (dLon < -Math.PI) dLon += Math.PI * 2;
  const spherical = new THREE.Spherical().setFromVector3(camera.position);
  spherical.theta += dLon;
  spherical.phi -= to.lat - from.lat;
  setCameraSpherical(camera, spherical);
}

function dollyTowardPointer(
  camera: THREE.PerspectiveCamera,
  clientX: number,
  clientY: number,
  factor: number,
  element: HTMLElement,
): void {
  const rect = element.getBoundingClientRect();
  const ndc = pointerToNdc(clientX, clientY, rect);
  camera.updateMatrixWorld(true);
  const anchor = new THREE.Vector3();
  const hasAnchor = intersectEarth(camera, ndc, anchor);
  dollyCamera(camera, factor);
  if (!hasAnchor) return;
  keepAnchorUnderCursor(camera, anchor, ndc);
  keepAnchorUnderCursor(camera, anchor, ndc);
}

function panCameraSpherical(camera: THREE.Camera, vector: SalesMapPanVector): void {
  const spherical = new THREE.Spherical().setFromVector3(camera.position);
  const distance = THREE.MathUtils.clamp(spherical.radius, MIN_DISTANCE, MAX_DISTANCE);
  const surfaceDistance = Math.max(0.18, distance - EARTH_RADIUS);
  const step = 0.034 * (surfaceDistance / (MAX_DISTANCE - EARTH_RADIUS));
  spherical.theta += vector.x * step;
  spherical.phi -= vector.y * step;
  setCameraSpherical(camera, spherical);
}

function pixelPanCamera(
  camera: THREE.PerspectiveCamera,
  dx: number,
  dy: number,
  canvasHeight: number,
): void {
  const distance = THREE.MathUtils.clamp(camera.position.length(), MIN_DISTANCE, MAX_DISTANCE);
  const surfaceDistance = Math.max(0.18, distance - EARTH_RADIUS);
  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  const earthPixelRadius =
    (EARTH_RADIUS / surfaceDistance) * (canvasHeight * 0.5) / Math.tan(fovRad * 0.5);
  const radiansPerPixel = 1 / Math.max(24, earthPixelRadius);
  const spherical = new THREE.Spherical().setFromVector3(camera.position);
  spherical.theta -= dx * radiansPerPixel;
  spherical.phi -= dy * radiansPerPixel;
  setCameraSpherical(camera, spherical);
}

function CameraFocus({
  locationKey,
  location,
}: {
  locationKey: string | null;
  location?: DashboardSalesMapLocation;
}) {
  const { camera, invalidate } = useThree();
  const focusedKeyRef = useRef<string | null>(null);
  const skippedInitialRef = useRef(false);

  useEffect(() => {
    if (!location || !locationKey) return;
    if (!skippedInitialRef.current) {
      skippedInitialRef.current = true;
      focusedKeyRef.current = locationKey;
      return;
    }
    if (focusedKeyRef.current === locationKey) return;
    focusedKeyRef.current = locationKey;
    const radius = THREE.MathUtils.clamp(camera.position.length(), MIN_DISTANCE, MAX_DISTANCE);
    camera.position.copy(latLngToVector(location.latitude, location.longitude, radius));
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, location, locationKey]);

  return null;
}

function ClearColor({ mapStyle }: { mapStyle: SalesMapStyle }) {
  const { gl, invalidate } = useThree();

  useEffect(() => {
    gl.setClearColor(mapStyle === 'political' ? '#0b1220' : '#061018', 1);
    invalidate();
  }, [gl, invalidate, mapStyle]);

  return null;
}

function SatelliteEarth() {
  const texture = useLoader(THREE.TextureLoader, SATELLITE_SRC);
  const { gl, invalidate } = useThree();

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;
    invalidate();
  }, [gl, invalidate, texture]);

  return (
    <mesh>
      <sphereGeometry args={[EARTH_RADIUS, 128, 96]} />
      <meshStandardMaterial map={texture} roughness={0.86} metalness={0.02} />
    </mesh>
  );
}

function GlobeControls({
  autoRotate,
  navRef,
}: {
  autoRotate: boolean;
  navRef: MutableRefObject<GlobeNavApi | null>;
}) {
  const { camera, gl, invalidate, size } = useThree();
  const dragRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
  } | null>(null);
  const velocityRef = useRef({ theta: 0, phi: 0 });

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return undefined;

    const perspective = camera;
    const element = gl.domElement;
    element.style.touchAction = 'none';
    element.style.cursor = 'grab';
    element.dataset.globeControls = GLOBE_CONTROLS_VERSION;

    navRef.current = {
      zoomIn: () => {
        dollyCamera(perspective, 1 / ZOOM_STEP);
        invalidate();
      },
      zoomOut: () => {
        dollyCamera(perspective, ZOOM_STEP);
        invalidate();
      },
      pan: (vector) => {
        panCameraSpherical(perspective, vector);
        invalidate();
      },
      resetNorth: () => {
        const spherical = new THREE.Spherical().setFromVector3(perspective.position);
        setCameraSpherical(perspective, spherical);
        invalidate();
      },
    };

    const onPointerDown = (event: PointerEvent): void => {
      if (event.button !== 0) return;
      dragRef.current = {
        pointerId: event.pointerId,
        lastX: event.clientX,
        lastY: event.clientY,
      };
      velocityRef.current = { theta: 0, phi: 0 };
      element.setPointerCapture(event.pointerId);
      element.style.cursor = 'grabbing';
    };

    const onPointerMove = (event: PointerEvent): void => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      const before = new THREE.Spherical().setFromVector3(perspective.position);
      const dx = event.clientX - drag.lastX;
      const dy = event.clientY - drag.lastY;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;

      pixelPanCamera(
        perspective,
        dx,
        dy,
        size.height || element.getBoundingClientRect().height || 1,
      );

      const after = new THREE.Spherical().setFromVector3(perspective.position);
      velocityRef.current = {
        theta: after.theta - before.theta,
        phi: after.phi - before.phi,
      };
      invalidate();
    };

    const onPointerUp = (event: PointerEvent): void => {
      if (dragRef.current?.pointerId !== event.pointerId) return;
      dragRef.current = null;
      element.style.cursor = 'grab';
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
    };

    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const delta = THREE.MathUtils.clamp(event.deltaY, -120, 120);
      const factor = Math.exp(delta * 0.0007);
      dollyTowardPointer(perspective, event.clientX, event.clientY, factor, element);
      invalidate();
    };

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointercancel', onPointerUp);
    element.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointercancel', onPointerUp);
      element.removeEventListener('wheel', onWheel);
      if (navRef.current) navRef.current = null;
    };
  }, [camera, gl, invalidate, navRef, size.height]);

  useFrame((_, delta) => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    if (dragRef.current) return;

    const velocity = velocityRef.current;
    if (Math.hypot(velocity.theta, velocity.phi) > 0.00003) {
      const spherical = new THREE.Spherical().setFromVector3(camera.position);
      spherical.theta += velocity.theta;
      spherical.phi += velocity.phi;
      setCameraSpherical(camera, spherical);
      velocityRef.current.theta *= 0.9;
      velocityRef.current.phi *= 0.9;
      if (Math.hypot(velocityRef.current.theta, velocityRef.current.phi) < 0.00003) {
        velocityRef.current = { theta: 0, phi: 0 };
      }
      invalidate();
      return;
    }

    if (autoRotate) {
      const spherical = new THREE.Spherical().setFromVector3(camera.position);
      spherical.theta -= AUTO_ROTATE_RAD_PER_SEC * delta;
      setCameraSpherical(camera, spherical);
    }
  });

  return null;
}

function PinMarker({
  location,
  selected,
  language,
  metrics,
  onSelect,
  onHover,
}: {
  location: RankedSalesMapLocation;
  selected: boolean;
  language: string;
  metrics: SalesMapMetricState;
  onSelect: (location: DashboardSalesMapLocation) => void;
  onHover: (location: DashboardSalesMapLocation | null) => void;
}) {
  const { camera } = useThree();
  const [front, setFront] = useState(true);
  const [pinSize, setPinSize] = useState<'sm' | 'md' | 'lg'>('md');
  const frontRef = useRef(true);
  const position = useMemo(
    () => latLngToVector(location.latitude, location.longitude, EARTH_RADIUS + 0.03),
    [location.latitude, location.longitude],
  );
  const label = formatSalesMapPinLabel(location, language, metrics);

  useFrame(() => {
    const camPos = camera.position;
    const distance = Math.max(camPos.length(), EARTH_RADIUS + 0.05);
    const pinDir = position.clone().normalize();
    const camDir = camPos.clone().normalize();
    const facing = pinDir.dot(camDir);
    const horizon = EARTH_RADIUS / distance;
    const hideBelow = horizon + 0.02;
    const showAbove = horizon + 0.08;

    let next = frontRef.current;
    if (frontRef.current) {
      if (facing < hideBelow) next = false;
    } else if (facing > showAbove) {
      next = true;
    }
    frontRef.current = next;
    setFront((current) => (current === next ? current : next));

    const nextSize: 'sm' | 'md' | 'lg' = distance > 5.2 ? 'sm' : distance > 3.4 ? 'md' : 'lg';
    setPinSize((current) => (current === nextSize ? current : nextSize));
  });

  if (!front) return null;

  return (
    <>
      <mesh
        position={position}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(location);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          onHover(location);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[0.048, 10, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html
        position={position}
        center={false}
        style={{ transform: 'translate(-50%, -100%)', pointerEvents: 'none' }}
        zIndexRange={[12, 2]}
      >
        <SalesMapLocationPin color={location.color} label={label} selected={selected} size={pinSize} />
      </Html>
    </>
  );
}

function GlobeScene({
  locations,
  selectedKey,
  autoRotate,
  mapStyle,
  countriesGeo,
  provincesGeo,
  countryColors,
  provinceColors,
  language,
  metrics,
  onSelect,
  onHover,
  navRef,
}: SalesWorldGlobeProps & { navRef: MutableRefObject<GlobeNavApi | null> }) {
  const { camera } = useThree();
  const [hideTurkeyCountryPin, setHideTurkeyCountryPin] = useState(false);
  const selectedLocation = locations.find((location) => location.key === selectedKey);

  useFrame(() => {
    const distance = camera.position.length();
    const turkey = latLngToVector(39, 35).normalize();
    const facingTurkey = camera.position.clone().normalize().dot(turkey) > 0.42;
    const next = distance <= 4.45 && facingTurkey;
    setHideTurkeyCountryPin((current) => (current === next ? current : next));
  });

  const visibleLocations = useMemo(
    () => locations.filter((location) => {
      if (!hideTurkeyCountryPin) return true;
      if (normalizeSalesMapCountryCode(location.countryCode, location.countryName, location.cityName) !== 'TR') {
        return true;
      }
      return location.administrativeAreaType !== 'country';
    }),
    [hideTurkeyCountryPin, locations],
  );

  return (
    <>
      <ClearColor mapStyle={mapStyle} />
      <Starfield />
      <ambientLight intensity={mapStyle === 'political' ? 1.55 : 1.15} />
      <directionalLight position={[5, 3, 4]} intensity={mapStyle === 'political' ? 1.5 : 2} color="#fff7ed" />
      <directionalLight position={[-3, -1, -4]} intensity={0.4} color="#93c5fd" />
      {mapStyle === 'political' ? (
        countriesGeo ? (
          <PoliticalGlobeLayer
            countriesGeo={countriesGeo}
            provincesGeo={provincesGeo}
            countryColors={countryColors}
            provinceColors={provinceColors}
            language={language}
            onSelectCountry={(countryCode) => {
              const location = findSalesMapLocationForCountry(locations, countryCode);
              if (location) onSelect(location);
            }}
            onSelectProvince={(provinceCode) => {
              const feature = provincesGeo?.features.find(
                (item) => (item.properties.PROVINCE_CODE || '').toLowerCase() === provinceCode.toLowerCase(),
              );
              const provinceName = feature?.properties.NAME_TR || feature?.properties.NAME || provinceCode;
              const location = findSalesMapLocationForProvince(locations, provinceName);
              if (location) onSelect(location);
            }}
          />
        ) : (
          <mesh>
            <sphereGeometry args={[EARTH_RADIUS, 64, 48]} />
            <meshStandardMaterial color="#9ec5e8" roughness={0.95} metalness={0} />
          </mesh>
        )
      ) : (
        <Suspense fallback={null}>
          <SatelliteEarth />
          {countriesGeo ? (
            <SatelliteGlobeBorders
              countriesGeo={countriesGeo}
              provincesGeo={provincesGeo}
              countryColors={countryColors}
              provinceColors={provinceColors}
              language={language}
              onSelectCountry={(countryCode) => {
                const location = findSalesMapLocationForCountry(locations, countryCode);
                if (location) onSelect(location);
              }}
              onSelectProvince={(provinceCode) => {
                const feature = provincesGeo?.features.find(
                  (item) => (item.properties.PROVINCE_CODE || '').toLowerCase() === provinceCode.toLowerCase(),
                );
                const provinceName = feature?.properties.NAME_TR || feature?.properties.NAME || provinceCode;
                const location = findSalesMapLocationForProvince(locations, provinceName);
                if (location) onSelect(location);
              }}
            />
          ) : null}
        </Suspense>
      )}
      {visibleLocations.map((location) => (
        <PinMarker
          key={location.key}
          location={location}
          selected={selectedKey === location.key}
          language={language}
          metrics={metrics}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
      <CameraFocus locationKey={selectedKey} location={selectedLocation} />
      <GlobeControls autoRotate={autoRotate} navRef={navRef} />
    </>
  );
}

const SalesWorldGlobe = forwardRef<SalesWorldGlobeHandle, SalesWorldGlobeProps>(function SalesWorldGlobe(
  props,
  ref,
) {
  const navRef = useRef<GlobeNavApi | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const invalidateRef = useRef<(() => void) | null>(null);

  useImperativeHandle(ref, () => ({
    zoomIn: () => navRef.current?.zoomIn(),
    zoomOut: () => navRef.current?.zoomOut(),
    pan: (direction) => navRef.current?.pan(direction),
    resetNorth: () => navRef.current?.resetNorth(),
  }));

  return (
    <Canvas
      key={GLOBE_CONTROLS_VERSION}
      frameloop="always"
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.35, 5.6], fov: 40, near: 0.05, far: 120 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl, camera, invalidate }) => {
        cameraRef.current = camera;
        invalidateRef.current = invalidate;
        gl.setClearColor(props.mapStyle === 'political' ? '#0b1220' : '#061018', 1);
        gl.domElement.setAttribute('data-testid', 'sales-map-canvas');
        gl.domElement.setAttribute('aria-label', 'Interactive sales world map');
        gl.domElement.dataset.globeControls = GLOBE_CONTROLS_VERSION;
      }}
    >
      <GlobeScene {...props} navRef={navRef} />
    </Canvas>
  );
});

export default SalesWorldGlobe;

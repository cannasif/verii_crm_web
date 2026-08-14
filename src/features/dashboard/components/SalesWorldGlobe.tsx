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
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { DashboardSalesMapLocation, SalesMapMetricState } from '../types/dashboard-sales-map';
import type { SalesMapCountriesGeoJson, SalesMapStyle } from '../types/sales-map-geo';
import type { RankedSalesMapLocation } from '../utils/sales-map-metrics';
import { formatSalesMapPinLabel, findSalesMapLocationForCountry } from '../utils/sales-map-geo';
import { PoliticalGlobeLayer, Starfield } from './PoliticalGlobeLayer';
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
  countryColors: Map<string, string>;
  language: string;
  metrics: SalesMapMetricState;
  onSelect: (location: DashboardSalesMapLocation) => void;
  onHover: (location: DashboardSalesMapLocation | null) => void;
}

const EARTH_RADIUS = 2;
const MIN_DISTANCE = 3.05;
const MAX_DISTANCE = 7.8;
const SATELLITE_SRC = '/assets/maps/earth-blue-marble-5400.jpg';
const ZOOM_STEP = 1.12;

function latLngToVector(latitude: number, longitude: number, radius = EARTH_RADIUS): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - latitude);
  const theta = THREE.MathUtils.degToRad(longitude + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function dollyByFactor(
  camera: THREE.Camera,
  controls: ThreeOrbitControls,
  factor: number,
): void {
  const offset = new THREE.Vector3().copy(camera.position).sub(controls.target);
  const nextDistance = THREE.MathUtils.clamp(offset.length() * factor, MIN_DISTANCE, MAX_DISTANCE);
  offset.setLength(nextDistance);
  camera.position.copy(controls.target).add(offset);
  controls.update();
}

function panCamera(
  camera: THREE.Camera,
  controls: ThreeOrbitControls,
  vector: { x: number; y: number },
): void {
  const offset = camera.position.clone().sub(controls.target);
  const distance = offset.length();
  const step = 0.007 + ((distance - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE)) * 0.014;

  camera.updateMatrixWorld();
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
  const worldUp = new THREE.Vector3(0, 1, 0);

  const yaw = new THREE.Quaternion().setFromAxisAngle(up, vector.x * step);
  offset.applyQuaternion(yaw);
  up.applyQuaternion(yaw);

  const pitched = offset.clone();
  const pitch = new THREE.Quaternion().setFromAxisAngle(right, vector.y * step);
  pitched.applyQuaternion(pitch);
  if (Math.abs(pitched.clone().normalize().dot(worldUp)) < 0.96) {
    offset.copy(pitched);
    up.applyQuaternion(pitch);
  }

  offset.setLength(distance);
  camera.position.copy(controls.target).add(offset);
  camera.up.copy(up.normalize());
  camera.lookAt(controls.target);
  controls.update();
}

function alignCameraNorthUp(camera: THREE.Camera): void {
  const position = camera.position.clone().normalize();
  const northPole = new THREE.Vector3(0, 1, 0);
  const east = new THREE.Vector3().crossVectors(northPole, position);
  if (east.lengthSq() < 1e-8) {
    camera.up.set(0, 0, position.y > 0 ? -1 : 1);
    return;
  }
  east.normalize();
  camera.up.copy(new THREE.Vector3().crossVectors(position, east).normalize());
}

function rotateSpeedForDistance(distance: number): number {
  const t = THREE.MathUtils.clamp((distance - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE), 0, 1);
  return 0.018 + t * 0.032;
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
    alignCameraNorthUp(camera);
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
  controlsRef,
}: {
  autoRotate: boolean;
  controlsRef: MutableRefObject<ThreeOrbitControls | null>;
}) {
  const { camera, gl, invalidate } = useThree();
  const controls = useMemo(() => new ThreeOrbitControls(camera, gl.domElement), [camera, gl.domElement]);

  useEffect(() => {
    controlsRef.current = controls;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = MIN_DISTANCE;
    controls.maxDistance = MAX_DISTANCE;
    controls.rotateSpeed = rotateSpeedForDistance(camera.position.length());
    controls.zoomSpeed = 0.55;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.035;
    controls.enableZoom = true;
    controls.screenSpacePanning = false;
    controls.target.set(0, 0, 0);
    controls.update();
    const handleChange = () => invalidate();
    controls.addEventListener('change', handleChange);
    return () => {
      controls.removeEventListener('change', handleChange);
      if (controlsRef.current === controls) controlsRef.current = null;
    };
  }, [autoRotate, camera, controls, controlsRef, invalidate]);

  useEffect(() => () => controls.dispose(), [controls]);

  useFrame(() => {
    controls.rotateSpeed = rotateSpeedForDistance(camera.position.length());
    controls.autoRotate = autoRotate;
    controls.update();
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
  const position = useMemo(
    () => latLngToVector(location.latitude, location.longitude, EARTH_RADIUS + 0.03),
    [location.latitude, location.longitude],
  );
  const label = formatSalesMapPinLabel(location, language, metrics);

  useFrame(() => {
    const pinDir = position.clone().normalize();
    const camDir = camera.position.clone().normalize();
    const next = pinDir.dot(camDir) > 0.22;
    setFront((current) => (current === next ? current : next));
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
        zIndexRange={[8, 0]}
      >
        <SalesMapLocationPin color={location.color} label={label} selected={selected} />
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
  countryColors,
  language,
  metrics,
  onSelect,
  onHover,
  controlsRef,
}: SalesWorldGlobeProps & { controlsRef: MutableRefObject<ThreeOrbitControls | null> }) {
  const selectedLocation = locations.find((location) => location.key === selectedKey);

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
            countryColors={countryColors}
            language={language}
            onSelectCountry={(countryCode) => {
              const location = findSalesMapLocationForCountry(locations, countryCode);
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
        </Suspense>
      )}
      {locations.map((location) => (
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
      <GlobeControls autoRotate={autoRotate} controlsRef={controlsRef} />
    </>
  );
}

const SalesWorldGlobe = forwardRef<SalesWorldGlobeHandle, SalesWorldGlobeProps>(function SalesWorldGlobe(
  props,
  ref,
) {
  const controlsRef = useRef<ThreeOrbitControls | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const invalidateRef = useRef<(() => void) | null>(null);

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      const controls = controlsRef.current;
      const camera = cameraRef.current;
      if (!controls || !camera) return;
      dollyByFactor(camera, controls, 1 / ZOOM_STEP);
      invalidateRef.current?.();
    },
    zoomOut: () => {
      const controls = controlsRef.current;
      const camera = cameraRef.current;
      if (!controls || !camera) return;
      dollyByFactor(camera, controls, ZOOM_STEP);
      invalidateRef.current?.();
    },
    pan: (direction) => {
      const controls = controlsRef.current;
      const camera = cameraRef.current;
      if (!controls || !camera) return;
      panCamera(camera, controls, direction);
      invalidateRef.current?.();
    },
    resetNorth: () => {
      const controls = controlsRef.current;
      const camera = cameraRef.current;
      if (!controls || !camera) return;
      const radius = THREE.MathUtils.clamp(camera.position.length(), MIN_DISTANCE, MAX_DISTANCE);
      camera.position.setLength(radius);
      alignCameraNorthUp(camera);
      camera.lookAt(controls.target);
      controls.update();
      invalidateRef.current?.();
    },
  }));

  return (
    <Canvas
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
      }}
    >
      <GlobeScene {...props} controlsRef={controlsRef} />
    </Canvas>
  );
});

export default SalesWorldGlobe;

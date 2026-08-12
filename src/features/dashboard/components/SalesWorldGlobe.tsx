import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, type ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { DashboardSalesMapLocation } from '../types/dashboard-sales-map';
import type { RankedSalesMapLocation } from '../utils/sales-map-metrics';

interface SalesWorldGlobeProps {
  locations: RankedSalesMapLocation[];
  selectedKey: string | null;
  autoRotate: boolean;
  onSelect: (location: DashboardSalesMapLocation) => void;
  onHover: (location: DashboardSalesMapLocation | null) => void;
}

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

function CameraFocus({ location }: { location?: DashboardSalesMapLocation }) {
  const { camera, invalidate } = useThree();

  useEffect(() => {
    if (!location) return;
    const destination = latLngToVector(location.latitude, location.longitude, 5.25);
    camera.position.copy(destination);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, location]);

  return null;
}

function Earth() {
  const texture = useLoader(THREE.TextureLoader, '/assets/maps/earth-blue-marble-2048.jpg');
  const { gl, invalidate } = useThree();

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;
    invalidate();
  }, [gl, invalidate, texture]);

  return (
    <mesh>
      <sphereGeometry args={[EARTH_RADIUS, 64, 40]} />
      <meshStandardMaterial map={texture} roughness={0.88} metalness={0.02} />
    </mesh>
  );
}

function GlobeControls({ autoRotate }: { autoRotate: boolean }) {
  const { camera, gl, invalidate } = useThree();
  const controls = useMemo(() => new ThreeOrbitControls(camera, gl.domElement), [camera, gl.domElement]);

  useEffect(() => {
    controls.enablePan = false;
    controls.enableDamping = autoRotate;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3.3;
    controls.maxDistance = 8.5;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.7;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.55;
    controls.target.set(0, 0, 0);
    controls.update();
    const handleChange = () => invalidate();
    controls.addEventListener('change', handleChange);
    return () => controls.removeEventListener('change', handleChange);
  }, [autoRotate, controls, invalidate]);

  useEffect(() => () => controls.dispose(), [controls]);

  useFrame(() => {
    if (autoRotate) controls.update();
  });

  return null;
}

function LocationMarkers({ locations, selectedKey, onSelect, onHover }: Omit<SalesWorldGlobeProps, 'autoRotate'>) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const selectedColor = useMemo(() => new THREE.Color('#fbbf24'), []);
  const radialAxis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const { invalidate } = useThree();

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    locations.forEach((location, index) => {
      const position = latLngToVector(location.latitude, location.longitude, EARTH_RADIUS + 0.095);
      dummy.position.copy(position);
      dummy.quaternion.setFromUnitVectors(radialAxis, position.clone().normalize());
      dummy.scale.setScalar(location.key === selectedKey ? 1.35 : 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(
        index,
        location.key === selectedKey
          ? selectedColor
          : new THREE.Color(location.color),
      );
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    invalidate();
  }, [dummy, invalidate, locations, radialAxis, selectedColor, selectedKey]);

  const resolveLocation = (event: ThreeEvent<PointerEvent | MouseEvent>) => {
    if (event.instanceId == null) return null;
    return locations[event.instanceId] ?? null;
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, locations.length]}
      onClick={(event) => {
        event.stopPropagation();
        const location = resolveLocation(event);
        if (location) onSelect(location);
      }}
      onPointerMove={(event) => {
        event.stopPropagation();
        onHover(resolveLocation(event));
      }}
      onPointerOut={() => onHover(null)}
    >
      <coneGeometry args={[0.065, 0.19, 10]} />
      <meshStandardMaterial roughness={0.35} metalness={0.08} emissive="#181028" emissiveIntensity={0.12} />
    </instancedMesh>
  );
}

export default function SalesWorldGlobe({
  locations,
  selectedKey,
  autoRotate,
  onSelect,
  onHover,
}: SalesWorldGlobeProps) {
  const selectedLocation = locations.find((location) => location.key === selectedKey);

  return (
    <Canvas
      frameloop={autoRotate ? 'always' : 'demand'}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.25, 5.3], fov: 42, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setClearColor('#07111f', 1);
        gl.domElement.setAttribute('data-testid', 'sales-map-canvas');
        gl.domElement.setAttribute('aria-label', 'Interactive sales world map');
      }}
    >
      <ambientLight intensity={1.25} />
      <directionalLight position={[4, 3, 5]} intensity={2.1} color="#fff7ed" />
      <directionalLight position={[-4, -2, -3]} intensity={0.55} color="#38bdf8" />
      <Suspense fallback={null}>
        <Earth />
      </Suspense>
      <LocationMarkers
        locations={locations}
        selectedKey={selectedKey}
        onSelect={onSelect}
        onHover={onHover}
      />
      <CameraFocus location={selectedLocation} />
      <GlobeControls autoRotate={autoRotate} />
    </Canvas>
  );
}

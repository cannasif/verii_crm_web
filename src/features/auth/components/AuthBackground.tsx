import React, { useEffect, useRef } from 'react';

interface AuthBackgroundProps {
  isActive: boolean;
}

export const AuthBackground: React.FC<AuthBackgroundProps> = ({ isActive }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !mountRef.current) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    void (async () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isSmallViewport = window.innerWidth < 1024;
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

      if (prefersReducedMotion) return;

      const THREE = await import('three');
      if (cancelled || !mountRef.current) return;

      while (mountRef.current.firstChild) {
        mountRef.current.removeChild(mountRef.current.firstChild);
      }

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x1a0b2e, 20, 100);

      const camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      camera.position.z = 40;

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: 'low-power',
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(devicePixelRatio);
      mountRef.current.appendChild(renderer.domElement);

      const particleCount = isSmallViewport ? 90 : 140;
      const particlesGeometry = new THREE.BufferGeometry();
      const particlesPositions = new Float32Array(particleCount * 3);
      const particlesVelocities: { x: number; y: number; z: number }[] = [];

      for (let i = 0; i < particleCount; i++) {
        particlesPositions[i * 3] = (Math.random() - 0.5) * 60;
        particlesPositions[i * 3 + 1] = (Math.random() - 0.5) * 60;
        particlesPositions[i * 3 + 2] = (Math.random() - 0.5) * 30;

        particlesVelocities.push({
          x: (Math.random() - 0.5) * 0.04,
          y: (Math.random() - 0.5) * 0.04,
          z: (Math.random() - 0.5) * 0.02,
        });
      }

      particlesGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(particlesPositions, 3)
      );
      const particlesMaterial = new THREE.PointsMaterial({
        color: 0xffedd5,
        size: 0.4,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });
      const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
      scene.add(particlesMesh);

      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xec4899,
        transparent: true,
        opacity: 0.12,
      });
      const maxLines = particleCount * particleCount;
      const linePositions = new Float32Array(maxLines * 3);
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      const linesMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(linesMesh);

      const pulsesCount = isSmallViewport ? 6 : 10;
      const pulsesGeo = new THREE.BufferGeometry();
      const pulsesPos = new Float32Array(pulsesCount * 3);
      const pulsesGeoAttr = new THREE.BufferAttribute(pulsesPos, 3);
      pulsesGeo.setAttribute('position', pulsesGeoAttr);
      const pulsesMat = new THREE.PointsMaterial({
        color: 0xfbbf24,
        size: 0.9,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
      });
      const pulsesMesh = new THREE.Points(pulsesGeo, pulsesMat);
      scene.add(pulsesMesh);

      const activePulses = Array(pulsesCount)
        .fill(null)
        .map(() => ({
          active: false,
          startIdx: 0,
          endIdx: 0,
          progress: 0,
          speed: 0,
        }));

      let animationFrameId: number;
      let mouseX = 0;
      let mouseY = 0;

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);

        const pos = particlesMesh.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          pos[i * 3] += particlesVelocities[i].x;
          pos[i * 3 + 1] += particlesVelocities[i].y;
          pos[i * 3 + 2] += particlesVelocities[i].z;

          if (pos[i * 3] > 40 || pos[i * 3] < -40) particlesVelocities[i].x *= -1;
          if (pos[i * 3 + 1] > 30 || pos[i * 3 + 1] < -30) particlesVelocities[i].y *= -1;
          if (pos[i * 3 + 2] > 15 || pos[i * 3 + 2] < -15) particlesVelocities[i].z *= -1;
        }
        particlesMesh.geometry.attributes.position.needsUpdate = true;

        let lineIdx = 0;
        const connectionDistance = isSmallViewport ? 6 : 7;
        const connections: [number, number][] = [];

        for (let i = 0; i < particleCount; i++) {
          for (let j = i + 1; j < particleCount; j++) {
            const dx = pos[i * 3] - pos[j * 3];
            const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
            const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < connectionDistance) {
              linePositions[lineIdx++] = pos[i * 3];
              linePositions[lineIdx++] = pos[i * 3 + 1];
              linePositions[lineIdx++] = pos[i * 3 + 2];
              linePositions[lineIdx++] = pos[j * 3];
              linePositions[lineIdx++] = pos[j * 3 + 1];
              linePositions[lineIdx++] = pos[j * 3 + 2];
              connections.push([i, j]);
            }
          }
        }

        linesMesh.geometry.setDrawRange(0, lineIdx / 3);
        linesMesh.geometry.attributes.position.needsUpdate = true;

        const pPos = pulsesMesh.geometry.attributes.position.array as Float32Array;
        activePulses.forEach((pulse, idx) => {
          if (!pulse.active) {
            if (Math.random() > (isSmallViewport ? 0.975 : 0.96) && connections.length > 0) {
              const conn = connections[Math.floor(Math.random() * connections.length)];
              pulse.active = true;
              pulse.startIdx = conn[0];
              pulse.endIdx = conn[1];
              pulse.progress = 0;
              pulse.speed = 0.02 + Math.random() * 0.03;
            } else {
              pPos[idx * 3] = 9999;
            }
            return;
          }

          pulse.progress += pulse.speed;
          if (pulse.progress >= 1) {
            pulse.active = false;
            return;
          }

          const x1 = pos[pulse.startIdx * 3];
          const y1 = pos[pulse.startIdx * 3 + 1];
          const z1 = pos[pulse.startIdx * 3 + 2];
          const x2 = pos[pulse.endIdx * 3];
          const y2 = pos[pulse.endIdx * 3 + 1];
          const z2 = pos[pulse.endIdx * 3 + 2];

          pPos[idx * 3] = x1 + (x2 - x1) * pulse.progress;
          pPos[idx * 3 + 1] = y1 + (y2 - y1) * pulse.progress;
          pPos[idx * 3 + 2] = z1 + (z2 - z1) * pulse.progress;
        });
        pulsesMesh.geometry.attributes.position.needsUpdate = true;

        scene.rotation.y += isSmallViewport ? 0.00035 : 0.00055;
        camera.position.x += (mouseX * (isSmallViewport ? 0.22 : 0.35) - camera.position.x) * 0.04;
        camera.position.y += (-mouseY * (isSmallViewport ? 0.22 : 0.35) - camera.position.y) * 0.04;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
      };

      const handleMouseMove = (e: MouseEvent) => {
        mouseX = e.clientX / window.innerWidth - 0.5;
        mouseY = e.clientY / window.innerHeight - 0.5;
      };
      window.addEventListener('mousemove', handleMouseMove);

      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      };
      window.addEventListener('resize', handleResize);

      animate();

      cleanup = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
        if (mountRef.current && renderer.domElement) {
          if (mountRef.current.contains(renderer.domElement)) {
            mountRef.current.removeChild(renderer.domElement);
          }
        }
        renderer.dispose();
        particlesGeometry.dispose();
        particlesMaterial.dispose();
        lineGeometry.dispose();
        lineMaterial.dispose();
        pulsesGeo.dispose();
        pulsesMat.dispose();
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [isActive]);

  return (
    <div
      ref={mountRef}
      className={`fixed inset-0 z-0 transition-opacity duration-1000 ${
        isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    />
  );
};

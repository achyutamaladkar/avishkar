import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import * as satellite from 'satellite.js';
import { createSatRec } from '../services/passPredictor';
import type { ObserverLocation, OrbitDataset, SatellitePass } from '../types/orbit';
import {
  azimuthToCompass,
  formatPassDate,
  formatPassTime,
} from '../services/passPredictor';

const EARTH_RADIUS = 1; // unit sphere
const DEG_TO_RAD = Math.PI / 180;
const ISS_ALT_SCALE = 0.06; // exaggerated to be visible

interface GlobeViewProps {
  pass: SatellitePass;
  dataset: OrbitDataset;
  location: ObserverLocation;
  timezone: string;
}

/** Convert geodetic lat/lon (degrees) to 3D position on a unit sphere */
function geoTo3D(latDeg: number, lonDeg: number, r: number = EARTH_RADIUS): [number, number, number] {
  const lat = latDeg * DEG_TO_RAD;
  const lon = lonDeg * DEG_TO_RAD;
  return [
    r * Math.cos(lat) * Math.sin(lon),
    r * Math.sin(lat),
    r * Math.cos(lat) * Math.cos(lon),
  ];
}

/** Propagate the ISS orbit for a full revolution to get positions along the orbit */
function computeOrbitTrack(
  dataset: OrbitDataset,
  centerTimeMs: number,
  steps: number = 180,
): Array<[number, number, number]> {
  try {
    const satrec = createSatRec(dataset);
    const period = (2 * Math.PI) / satrec.no; // orbital period in minutes
    const halfPeriodMs = (period * 60 * 1000) / 2;
    const startMs = centerTimeMs - halfPeriodMs;
    const stepMs = (period * 60 * 1000) / steps;
    const points: Array<[number, number, number]> = [];

    for (let i = 0; i <= steps; i++) {
      const t = new Date(startMs + i * stepMs);
      const result = satellite.propagate(satrec, t);
      if (!result || !result.position || typeof result.position === 'boolean') continue;
      const gmst = satellite.gstime(t);
      const geo = satellite.eciToGeodetic(result.position, gmst);
      const latDeg = satellite.degreesLat(geo.latitude);
      const lonDeg = satellite.degreesLong(geo.longitude);
      points.push(geoTo3D(latDeg, lonDeg, EARTH_RADIUS + ISS_ALT_SCALE));
    }
    return points;
  } catch {
    return [];
  }
}

/** Compute ground-track positions for the pass time range */
function computePassSegment(
  dataset: OrbitDataset,
  pass: SatellitePass,
): Array<[number, number, number]> {
  try {
    const satrec = createSatRec(dataset);
    const durationMs = pass.horizonSetTimeMs - pass.horizonRiseTimeMs;
    const steps = Math.max(30, Math.ceil(durationMs / 5000));
    const stepMs = durationMs / steps;
    const points: Array<[number, number, number]> = [];

    for (let i = 0; i <= steps; i++) {
      const t = new Date(pass.horizonRiseTimeMs + i * stepMs);
      const result = satellite.propagate(satrec, t);
      if (!result || !result.position || typeof result.position === 'boolean') continue;
      const gmst = satellite.gstime(t);
      const geo = satellite.eciToGeodetic(result.position, gmst);
      const latDeg = satellite.degreesLat(geo.latitude);
      const lonDeg = satellite.degreesLong(geo.longitude);
      points.push(geoTo3D(latDeg, lonDeg, EARTH_RADIUS + ISS_ALT_SCALE));
    }
    return points;
  } catch {
    return [];
  }
}

// ───────── 3D scene components ─────────

function EarthSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
      <meshStandardMaterial
        color="#e2e8f0"
        roughness={0.8}
        metalness={0.1}
      />
      {/* Wireframe overlay for continent-feel */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS + 0.001, 36, 18]} />
        <meshBasicMaterial
          color="#94a3b8"
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>
      {/* Equator ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[EARTH_RADIUS + 0.002, EARTH_RADIUS + 0.004, 128]} />
        <meshBasicMaterial color="#cbd5e1" side={THREE.DoubleSide} />
      </mesh>
    </mesh>
  );
}

function OrbitLine({ points }: { points: Array<[number, number, number]> }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const verts = new Float32Array(points.flat());
    g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    return g;
  }, [points]);

  return (
    <line>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial color="#94a3b8" linewidth={1} transparent opacity={0.5} />
    </line>
  );
}

function PassSegmentLine({ points }: { points: Array<[number, number, number]> }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const verts = new Float32Array(points.flat());
    g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    return g;
  }, [points]);

  return (
    <line>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial color="#0d9488" linewidth={2} />
    </line>
  );
}

function CityMarker({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.025, 16, 16]} />
      <meshBasicMaterial color="#e11d48" />
    </mesh>
  );
}

function ISSMarker({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 2;
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <octahedronGeometry args={[0.025, 0]} />
      <meshBasicMaterial color="#0d9488" />
    </mesh>
  );
}

function SceneContent({
  pass,
  dataset,
  location,
}: {
  pass: SatellitePass;
  dataset: OrbitDataset;
  location: ObserverLocation;
}) {
  const orbitTrack = useMemo(
    () => computeOrbitTrack(dataset, pass.peakTimeMs),
    [dataset, pass.peakTimeMs],
  );

  const passSegment = useMemo(
    () => computePassSegment(dataset, pass),
    [dataset, pass],
  );

  const cityPos = useMemo(
    () => geoTo3D(location.latitude, location.longitude),
    [location.latitude, location.longitude],
  );

  // ISS position at peak time
  const issPos = useMemo(() => {
    if (passSegment.length === 0) return geoTo3D(0, 0, EARTH_RADIUS + ISS_ALT_SCALE);
    return passSegment[Math.floor(passSegment.length / 2)];
  }, [passSegment]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 3, 5]} intensity={0.8} />
      <EarthSphere />
      {orbitTrack.length > 0 && <OrbitLine points={orbitTrack} />}
      {passSegment.length > 0 && <PassSegmentLine points={passSegment} />}
      <CityMarker position={cityPos} />
      <ISSMarker position={issPos} />
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.1}
        minDistance={1.4}
        maxDistance={4}
        target={[0, 0, 0]}
      />
    </>
  );
}

export const GlobeView: React.FC<GlobeViewProps> = ({
  pass,
  dataset,
  location,
  timezone,
}) => {
  // Initial camera: looking at the user's city
  const cameraPosition = useMemo(() => {
    const [x, y, z] = geoTo3D(location.latitude, location.longitude, 2.8);
    return new THREE.Vector3(x, y, z);
  }, [location.latitude, location.longitude]);

  return (
    <div className="panel globe-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">3D Orbit View</p>
          <h2>Predicted ISS Orbit — {formatPassDate(pass.startTimeMs, timezone)}</h2>
        </div>
      </div>

      <div className="globe-canvas-wrap">
        <Canvas
          camera={{ position: cameraPosition, fov: 45, near: 0.1, far: 100 }}
          style={{ background: '#f8fafc' }}
        >
          <SceneContent pass={pass} dataset={dataset} location={location} />
        </Canvas>
      </div>

      <div className="globe-pass-info">
        <div className="globe-info-grid">
          <div>
            <span className="metric-label">Start</span>
            <strong className="metric-value">
              {formatPassTime(pass.startTimeMs, timezone)} · {pass.startAzimuthDeg}° {azimuthToCompass(pass.startAzimuthDeg)}
            </strong>
          </div>
          <div>
            <span className="metric-label">Peak</span>
            <strong className="metric-value">
              {formatPassTime(pass.peakTimeMs, timezone)} · {pass.maxElevationDeg.toFixed(1)}° {azimuthToCompass(pass.peakAzimuthDeg)}
            </strong>
          </div>
          <div>
            <span className="metric-label">End</span>
            <strong className="metric-value">
              {formatPassTime(pass.endTimeMs, timezone)} · {pass.endAzimuthDeg}° {azimuthToCompass(pass.endAzimuthDeg)}
            </strong>
          </div>
        </div>

        <div className="globe-legend">
          <span><i className="legend-dot" style={{ background: '#94a3b8' }} /> Full predicted orbit</span>
          <span><i className="legend-dot" style={{ background: '#0d9488' }} /> Pass segment</span>
          <span><i className="legend-dot" style={{ background: '#e11d48' }} /> {location.name.split(',')[0]}</span>
        </div>

        <p className="globe-source-note muted">
          Orbit data: {dataset.sourceName} · Fetched {new Date(dataset.fetchedAt).toLocaleString()} · Epoch {new Date(dataset.epochAt).toLocaleString()}
        </p>
        <p className="globe-disclaimer muted" style={{ fontSize: '0.78rem' }}>
          The orbit line shows the ISS ground track on Earth. The direction the ISS appears in your sky is different — see the Sky-Track Radar above.
        </p>
      </div>
    </div>
  );
};

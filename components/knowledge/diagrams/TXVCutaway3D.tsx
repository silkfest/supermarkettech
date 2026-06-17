'use client'

import { useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

interface Hotspot {
  id: string
  position: [number, number, number]
  label: string
  detail: string
}

const HOTSPOTS: Hotspot[] = [
  { id: 'bulb', position: [0, 1.55, 1.05], label: 'Sensing bulb', detail: 'Clamped to the suction line. Bulb charge pressure pushes down on the diaphragm as suction-line temperature rises.' },
  { id: 'diaphragm', position: [0, 1.05, 0], label: 'Diaphragm', detail: 'Separates bulb pressure (above) from spring + evaporator pressure (below). Position balances all three forces.' },
  { id: 'spring', position: [0, 0.35, 0], label: 'Superheat spring', detail: 'Adjusting stem changes spring tension — this sets the superheat setpoint. Clockwise increases superheat.' },
  { id: 'needle', position: [0.55, -0.15, 0], label: 'Needle & seat', detail: 'Pushrod-actuated needle meters liquid refrigerant through the orifice into the evaporator.' },
  { id: 'equalizer', position: [-0.9, 0.4, 0], label: 'External equalizer', detail: 'Pipes evaporator outlet pressure to the underside of the diaphragm — required on distributor-fed coils with pressure drop.' },
]

function ValveBody() {
  // Half-section "cutaway" body built from a lathe geometry sliced at 240° so the
  // internal needle/seat/diaphragm stack (rendered separately) is visible from the front.
  const bodyGeometry = useMemo(() => {
    const points = [
      new THREE.Vector2(0.0, -0.55),
      new THREE.Vector2(0.45, -0.5),
      new THREE.Vector2(0.55, -0.2),
      new THREE.Vector2(0.55, 0.55),
      new THREE.Vector2(0.7, 0.7),
      new THREE.Vector2(0.7, 0.95),
      new THREE.Vector2(0.5, 1.0),
    ]
    return new THREE.LatheGeometry(points, 48, 0, Math.PI * 1.35)
  }, [])

  return (
    <mesh geometry={bodyGeometry} rotation={[0, Math.PI * 0.4, 0]} castShadow receiveShadow>
      <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.35} side={THREE.DoubleSide} />
    </mesh>
  )
}

function CapillaryAndBulb() {
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.05, 0.05),
    new THREE.Vector3(0.1, 1.3, 0.4),
    new THREE.Vector3(0.05, 1.5, 0.8),
    new THREE.Vector3(0, 1.55, 1.0),
  ]), [])
  const tubeGeometry = useMemo(() => new THREE.TubeGeometry(curve, 32, 0.025, 8, false), [curve])

  return (
    <group>
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.55, 1.05]}>
        <cylinderGeometry args={[0.09, 0.09, 0.5, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

function SpringCoil() {
  const curve = useMemo(() => {
    const turns = 6
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= turns * 16; i++) {
      const t = i / (turns * 16)
      const angle = t * turns * Math.PI * 2
      const y = 0.15 + t * 0.5
      pts.push(new THREE.Vector3(Math.cos(angle) * 0.18, y, Math.sin(angle) * 0.18))
    }
    return new THREE.CatmullRomCurve3(pts)
  }, [])
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 200, 0.018, 6, false), [curve])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.4} />
    </mesh>
  )
}

function NeedleAndSeat() {
  return (
    <group position={[0.3, -0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <coneGeometry args={[0.07, 0.45, 16]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  )
}

function Diaphragm() {
  return (
    <mesh position={[0, 1.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.5, 0.5, 0.04, 32]} />
      <meshStandardMaterial color="#fbbf24" metalness={0.3} roughness={0.6} />
    </mesh>
  )
}

function HotspotMarker({ spot, active, onSelect }: { spot: Hotspot; active: boolean; onSelect: (id: string | null) => void }) {
  return (
    <group position={spot.position}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onSelect(active ? null : spot.id) }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial
          color={active ? '#10b981' : '#3b82f6'}
          emissive={active ? '#10b981' : '#3b82f6'}
          emissiveIntensity={active ? 0.9 : 0.5}
        />
      </mesh>
      {active && (
        <Html distanceFactor={6} position={[0.12, 0.05, 0]} style={{ pointerEvents: 'none' }}>
          <div className="w-48 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-600 rounded-lg shadow-lg px-2.5 py-2 text-[11px] leading-snug text-slate-700 dark:text-slate-200">
            <p className="font-semibold text-emerald-700 dark:text-emerald-400 mb-0.5">{spot.label}</p>
            <p>{spot.detail}</p>
          </div>
        </Html>
      )}
    </group>
  )
}

function Scene({ active, onSelect }: { active: string | null; onSelect: (id: string | null) => void }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} />
      <group position={[0, -0.3, 0]}>
        <ValveBody />
        <Diaphragm />
        <SpringCoil />
        <NeedleAndSeat />
        <CapillaryAndBulb />
        {HOTSPOTS.map((spot) => (
          <HotspotMarker key={spot.id} spot={spot} active={active === spot.id} onSelect={onSelect} />
        ))}
      </group>
      <OrbitControls enablePan={false} minDistance={2} maxDistance={6} />
    </>
  )
}

export function TXVCutaway3D() {
  const [active, setActive] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div className="my-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Interactive 3D — TXV Bulb &amp; Diaphragm Operation
        </p>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">drag to rotate · scroll to zoom</span>
      </div>
      <div ref={containerRef} className="w-full h-72 sm:h-96 rounded-md overflow-hidden bg-slate-50 dark:bg-slate-950 touch-none">
        <Canvas camera={{ position: [2.4, 1.6, 2.8], fov: 45 }} dpr={[1, 1.5]}>
          <Scene active={active} onSelect={setActive} />
        </Canvas>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-2">
        Click a blue marker for a part description. Prototype model — primitive geometry, not to exact Sporlan scale.
      </p>
    </div>
  )
}

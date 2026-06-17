'use client'

import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

interface Hotspot {
  id: string
  position: [number, number, number]
  label: string
  detail: string
}

const HOTSPOTS: Hotspot[] = [
  { id: 'bulb', position: [0, 1.95, 1.0], label: 'Sensing bulb', detail: 'Clamped to the suction line at 4 or 8 o’clock. Bulb charge pressure pushes down on the diaphragm as suction-line temperature rises.' },
  { id: 'powerhead', position: [0.4, 1.5, 0.2], label: 'Power head', detail: 'Sealed cap welded/crimped to the body. Houses the diaphragm and thermostatic charge — never field-serviced or opened.' },
  { id: 'diaphragm', position: [0, 1.35, 0], label: 'Diaphragm', detail: 'Inside the power head. Separates bulb pressure (above) from spring + evaporator pressure (below) — its position balances all three forces and sets needle lift.' },
  { id: 'needle', position: [0.6, -0.15, 0], label: 'Needle & seat', detail: 'Pushrod-actuated needle meters liquid refrigerant through the orifice. The pressure drop across the orifice causes part of the liquid to flash into vapor immediately downstream.' },
  { id: 'spring', position: [0, -0.45, 0], label: 'Superheat spring', detail: 'Internal spring opposing bulb pressure, pushing up on the pin. Its tension — set from outside via the adjusting stem below — establishes the superheat setpoint.' },
  { id: 'stem', position: [0, -1.0, 0.18], label: 'Adjusting stem', detail: 'External adjustment point under a seal cap at the bottom of the valve. Clockwise increases spring tension and superheat setpoint. Allow 15–20 min to stabilize after each adjustment — typical target 6–12°F case superheat.' },
  { id: 'equalizer', position: [-0.95, 0.05, 0], label: 'External equalizer', detail: 'Pipes evaporator outlet pressure to the underside of the diaphragm — required on distributor-fed coils with appreciable pressure drop.' },
]

function MainBody() {
  // Mid-body "cutaway" housing the needle/seat/spring stack, sliced at 240deg so the
  // internal parts (rendered separately) are visible from the front. Narrows into a
  // neck at the top where the separate power head attaches.
  const bodyGeometry = useMemo(() => {
    const points = [
      new THREE.Vector2(0.0, -0.65),
      new THREE.Vector2(0.4, -0.6),
      new THREE.Vector2(0.5, -0.3),
      new THREE.Vector2(0.5, 0.35),
      new THREE.Vector2(0.3, 0.5),
      new THREE.Vector2(0.3, 0.62),
    ]
    return new THREE.LatheGeometry(points, 48, 0, Math.PI * 1.35)
  }, [])

  return (
    <mesh geometry={bodyGeometry} rotation={[0, Math.PI * 0.4, 0]} castShadow receiveShadow>
      <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.35} side={THREE.DoubleSide} />
    </mesh>
  )
}

function PowerHead() {
  // Sealed diaphragm cap/power assembly, modeled as a distinct domed piece sitting on
  // the body's neck — on a real valve this is welded or crimped on and never opened.
  const headGeometry = useMemo(() => {
    const points = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.3, 0.02),
      new THREE.Vector2(0.4, 0.15),
      new THREE.Vector2(0.4, 0.5),
      new THREE.Vector2(0.22, 0.62),
      new THREE.Vector2(0.0, 0.66),
    ]
    return new THREE.LatheGeometry(points, 40, 0, Math.PI * 1.35)
  }, [])

  return (
    <mesh geometry={headGeometry} position={[0, 0.62, 0]} rotation={[0, Math.PI * 0.4, 0]} castShadow receiveShadow>
      <meshStandardMaterial color="#cbd5e1" metalness={0.75} roughness={0.25} side={THREE.DoubleSide} />
    </mesh>
  )
}

function AdjustingStem() {
  // Brass seal cap + screw the technician turns from outside the valve, at the bottom
  // of the body — distinct from (and external to) the internal spring it tensions.
  return (
    <group position={[0, -0.78, 0]}>
      <mesh>
        <cylinderGeometry args={[0.2, 0.22, 0.18, 6]} />
        <meshStandardMaterial color="#b45309" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.16, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.14, 12]} />
        <meshStandardMaterial color="#92400e" metalness={0.7} roughness={0.25} />
      </mesh>
    </group>
  )
}

function InletOutletPorts() {
  return (
    <group>
      <mesh position={[-0.78, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.14, 0.14, 0.5, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0.85, -0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.13, 0.13, 0.5, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  )
}

function CapillaryAndBulb() {
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.22, 1.05, 0.1),
    new THREE.Vector3(0.15, 1.4, 0.45),
    new THREE.Vector3(0.05, 1.65, 0.8),
    new THREE.Vector3(0, 1.7, 1.0),
  ]), [])
  const tubeGeometry = useMemo(() => new THREE.TubeGeometry(curve, 32, 0.025, 8, false), [curve])

  return (
    <group>
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.7, 1.0]}>
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
      const y = -0.55 + t * 0.35
      pts.push(new THREE.Vector3(Math.cos(angle) * 0.16, y, Math.sin(angle) * 0.16))
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
    <group position={[0.35, -0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <coneGeometry args={[0.07, 0.45, 16]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  )
}

function Diaphragm() {
  return (
    <mesh position={[0, 1.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.36, 0.36, 0.035, 32]} />
      <meshStandardMaterial color="#fbbf24" metalness={0.3} roughness={0.6} />
    </mesh>
  )
}

const FLOW_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.95, 0.12, 0),
  new THREE.Vector3(-0.55, 0.1, 0),
  new THREE.Vector3(-0.1, -0.02, 0),
  new THREE.Vector3(0.35, -0.15, 0),
  new THREE.Vector3(0.6, -0.15, 0),
  new THREE.Vector3(1.0, -0.15, 0),
])
const FLOW_ORIFICE_T = 0.58
const FLOW_PARTICLE_COUNT = 14

function FlowPathGuide() {
  const geometry = useMemo(() => new THREE.TubeGeometry(FLOW_CURVE, 64, 0.05, 8, false), [])
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#7dd3fc" transparent opacity={0.12} depthWrite={false} />
    </mesh>
  )
}

function RefrigerantFlow() {
  const refs = useRef<(THREE.Mesh | null)[]>([])

  useFrame((state) => {
    const base = (state.clock.elapsedTime * 0.12) % 1
    for (let i = 0; i < FLOW_PARTICLE_COUNT; i++) {
      const mesh = refs.current[i]
      if (!mesh) continue
      const t = (base + i / FLOW_PARTICLE_COUNT) % 1
      const point = FLOW_CURVE.getPointAt(t)
      mesh.position.copy(point)
      const flashed = t > FLOW_ORIFICE_T
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.color.set(flashed ? '#e0f2fe' : '#38bdf8')
      mat.emissive.set(flashed ? '#bae6fd' : '#0ea5e9')
      mat.opacity = flashed ? 0.8 : 1
      const jitter = flashed ? Math.sin(state.clock.elapsedTime * 9 + i * 2) * 0.012 : 0
      const scale = (flashed ? 0.055 : 0.045) + jitter
      mesh.scale.setScalar(scale)
    }
  })

  return (
    <group>
      {Array.from({ length: FLOW_PARTICLE_COUNT }).map((_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el }}>
          <sphereGeometry args={[1, 10, 10]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.5} transparent />
        </mesh>
      ))}
    </group>
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
        <Html position={[0.12, 0.05, 0]} style={{ pointerEvents: 'none' }}>
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
        <MainBody />
        <PowerHead />
        <AdjustingStem />
        <InletOutletPorts />
        <Diaphragm />
        <SpringCoil />
        <NeedleAndSeat />
        <CapillaryAndBulb />
        <FlowPathGuide />
        <RefrigerantFlow />
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
          Interactive 3D — TXV Bulb, Power Head &amp; Metering
        </p>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">drag to rotate · scroll to zoom</span>
      </div>
      <div ref={containerRef} className="w-full h-72 sm:h-96 rounded-md overflow-hidden bg-slate-50 dark:bg-slate-950 touch-none">
        <Canvas camera={{ position: [2.4, 1.6, 2.8], fov: 45 }} dpr={[1, 1.5]}>
          <Scene active={active} onSelect={setActive} />
        </Canvas>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-2">
        Click a blue marker for a part description. Glowing dots show liquid refrigerant metering through the orifice and flashing to a liquid/vapor mix downstream. Modeled after typical Sporlan BQ-style construction (separate power head, bottom adjusting stem, external equalizer) — primitive geometry, not to exact scale.
      </p>
    </div>
  )
}

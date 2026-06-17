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
  { id: 'bulb', position: [-0.05, 1.62, 0.55], label: 'Sensing bulb', detail: 'Clamped to the suction line at 4 or 8 o’clock (connected by the capillary tube curling off the power head). Bulb charge pressure pushes down on the diaphragm as suction-line temperature rises.' },
  { id: 'powerhead', position: [0.62, 1.08, 0], label: 'Power head', detail: 'Sealed gray cap welded/crimped to the brass body. Houses the diaphragm and thermostatic charge — never field-serviced or opened.' },
  { id: 'diaphragm', position: [0.32, 0.85, 0.18], label: 'Diaphragm', detail: 'Hidden inside the power head, right above the body. Separates bulb pressure (above) from spring + evaporator pressure (below) — its position balances all three forces and sets needle lift.' },
  { id: 'needle', position: [0.46, -0.12, 0.12], label: 'Needle & seat', detail: 'Pushrod-actuated needle meters liquid refrigerant through the orifice, hidden inside the brass body. The pressure drop across the orifice causes part of the liquid to flash into vapor — watch the flow dots change as they exit the outlet line.' },
  { id: 'spring', position: [0.46, 0.1, 0.12], label: 'Superheat spring', detail: 'Internal spring opposing bulb pressure, pushing up on the pin. Its tension — set from outside via the adjusting stem below — establishes the superheat setpoint.' },
  { id: 'stem', position: [0.27, -0.42, 0.05], label: 'Adjusting stem', detail: 'External brass cap at the bottom of the valve, removed to access the adjusting stem with a wrench. Clockwise increases spring tension and superheat setpoint. Allow 15–20 min to stabilize after each adjustment — typical target 6–12°F case superheat.' },
  { id: 'equalizer', position: [0.88, 0.42, 0], label: 'External equalizer', detail: 'Brass hex coupling on the side body — pipes evaporator outlet pressure to the underside of the diaphragm. Required on distributor-fed coils with appreciable pressure drop.' },
]

const BRASS = '#d9b24c'
const BRASS_DARK = '#b3893a'
const COPPER = '#c2703d'

function MainBody() {
  // Real Sporlan-style valves use a hex (six-flat) brass body, not a round one — a
  // gently tapered hex prism reads much closer to the actual part than a lathed cylinder.
  const geometry = useMemo(() => new THREE.CylinderGeometry(0.34, 0.38, 1.0, 6), [])
  return (
    <mesh geometry={geometry} position={[0, 0.2, 0]} rotation={[0, Math.PI / 10, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={BRASS} metalness={0.55} roughness={0.32} />
    </mesh>
  )
}

function PowerHeadCollar() {
  // Blue-gray collar where the hex brass body necks down into the round power head.
  return (
    <mesh position={[0, 0.76, 0]}>
      <cylinderGeometry args={[0.28, 0.3, 0.1, 24]} />
      <meshStandardMaterial color="#7c8a99" metalness={0.4} roughness={0.4} />
    </mesh>
  )
}

function PowerHead() {
  // Sealed diaphragm cap — a wide, shallow gray disc (mushroom-cap profile), matching
  // the real part rather than a tall dome. Fully opaque: the real cap is welded shut
  // and the diaphragm is never actually visible from outside.
  const geometry = useMemo(() => {
    const points = [
      new THREE.Vector2(0.27, 0.0),
      new THREE.Vector2(0.45, 0.03),
      new THREE.Vector2(0.62, 0.09),
      new THREE.Vector2(0.66, 0.16),
      new THREE.Vector2(0.55, 0.24),
      new THREE.Vector2(0.28, 0.3),
      new THREE.Vector2(0.0, 0.32),
    ]
    return new THREE.LatheGeometry(points, 56)
  }, [])

  return (
    <mesh geometry={geometry} position={[0, 0.81, 0]} castShadow receiveShadow>
      <meshStandardMaterial color="#9aa3ad" metalness={0.3} roughness={0.55} />
    </mesh>
  )
}

function AdjustingStem() {
  // Brass seal cap + screw the technician removes/turns from outside the valve, at the
  // bottom of the body — distinct from (and external to) the internal spring it tensions.
  return (
    <group position={[0, -0.42, 0]}>
      <mesh>
        <cylinderGeometry args={[0.24, 0.26, 0.2, 6]} />
        <meshStandardMaterial color={BRASS_DARK} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.16, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.14, 12]} />
        <meshStandardMaterial color={BRASS_DARK} metalness={0.65} roughness={0.28} />
      </mesh>
    </group>
  )
}

function InletPort() {
  // Long horizontal copper liquid-line stub on the left, with a brass flare-nut fitting
  // where the copper tube transitions into the brass body — a distinctive, visible
  // material change on the real part.
  return (
    <group>
      <mesh position={[-1.1, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.16, 0.16, 0.85, 16]} />
        <meshStandardMaterial color={COPPER} metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh position={[-0.58, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.18, 6]} />
        <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

function OutletEqualizerAssembly() {
  // Side branch beside (not below) the main body: a small brass hex nut on top of a
  // larger brass hex coupling block, with a short copper stub exiting the bottom.
  const stubCurve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.88, 0.18, 0),
    new THREE.Vector3(0.92, 0.0, 0.05),
    new THREE.Vector3(0.98, -0.18, 0.12),
    new THREE.Vector3(1.02, -0.34, 0.16),
  ]), [])
  const stubTube = useMemo(() => new THREE.TubeGeometry(stubCurve, 24, 0.09, 12, false), [stubCurve])

  return (
    <group>
      <mesh position={[0.88, 0.66, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.18, 6]} />
        <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0.88, 0.38, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 0.38, 6]} />
        <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh geometry={stubTube}>
        <meshStandardMaterial color={COPPER} metalness={0.65} roughness={0.3} />
      </mesh>
    </group>
  )
}

function CapillaryAndBulb() {
  // Thin gray capillary tube curling off the top of the power head, ending at a small
  // sensing bulb — the bulb itself sits beyond the photographed crop (it clamps to the
  // suction line elsewhere) but is kept here for the diagram's educational purpose.
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.1, 0.95, 0.05),
    new THREE.Vector3(0.22, 1.05, 0.2),
    new THREE.Vector3(0.18, 1.18, 0.4),
    new THREE.Vector3(0.0, 1.25, 0.5),
    new THREE.Vector3(-0.1, 1.2, 0.55),
  ]), [])
  const tubeGeometry = useMemo(() => new THREE.TubeGeometry(curve, 40, 0.022, 8, false), [curve])

  return (
    <group>
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial color="#9aa5b1" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[-0.1, 1.45, 0.58]}>
        <cylinderGeometry args={[0.08, 0.08, 0.38, 16]} />
        <meshStandardMaterial color="#9aa5b1" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}

const FLOW_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-1.4, 0.2, 0),
  new THREE.Vector3(-0.8, 0.2, 0),
  new THREE.Vector3(-0.2, 0.16, 0),
  new THREE.Vector3(0.25, 0.0, 0),
  new THREE.Vector3(0.5, -0.05, 0.02),
  new THREE.Vector3(0.75, 0.1, 0.05),
  new THREE.Vector3(0.95, -0.1, 0.12),
  new THREE.Vector3(1.02, -0.32, 0.16),
])
// Fraction along the path where metering/flashing happens — placed inside the hidden
// (opaque-body) section, so the liquid-to-flash transition is revealed only once the
// flow re-emerges in the visible copper outlet line, mirroring how a tech actually
// observes a TXV: clear liquid in, two-phase mix out, the metering itself unseen.
const FLOW_ORIFICE_T = 0.55
const FLOW_PARTICLE_COUNT = 14

function RefrigerantFlow() {
  const refs = useRef<(THREE.Mesh | null)[]>([])

  useFrame((state) => {
    const base = (state.clock.elapsedTime * 0.1) % 1
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
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 5, 4]} intensity={1.3} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.5} />
      <directionalLight position={[0, -2, 3]} intensity={0.25} />
      <group position={[0, -0.3, 0]}>
        <MainBody />
        <PowerHeadCollar />
        <PowerHead />
        <AdjustingStem />
        <InletPort />
        <OutletEqualizerAssembly />
        <CapillaryAndBulb />
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
        <Canvas camera={{ position: [2.6, 1.6, 3.0], fov: 45 }} dpr={[1, 1.5]}>
          <Scene active={active} onSelect={setActive} />
        </Canvas>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-2">
        Click a blue marker for a part description. Glowing dots show liquid refrigerant entering the inlet line and a flashed liquid/vapor mix exiting the outlet after metering inside the body. Modeled after a typical Sporlan-style hex-body TXV — primitive geometry, not to exact scale.
      </p>
    </div>
  )
}

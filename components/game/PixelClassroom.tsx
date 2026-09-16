import type { GameMap, EquipmentNode, Point } from '@/lib/game/types'

// Integer-coordinate pixel sprites keep every original station footprint and walk target.
const ink = '#263b46', steel = '#8fa5aa', light = '#d2dfd9', copper = '#cf8750'
function Fan({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <path d="M-8 -5H-5V-8H5V-5H8V5H5V8H-5V5H-8Z" fill={ink} />
    <path d="M-5 -5H-1V-1H5V3H1V5H-3V1H-5Z" fill={steel} />
    <rect x="-1" y="-1" width="3" height="3" fill={light} />
  </g>
}
function Gauge({ x, y, red = false }: { x: number; y: number; red?: boolean }) {
  return <g transform={`translate(${x} ${y})`}>
    <rect x="-5" y="-5" width="10" height="10" fill={red ? '#bc6352' : '#47879b'} />
    <rect x="-3" y="-3" width="6" height="6" fill="#f5eccf" />
    <path d="M0 1V-2H2" stroke={ink} fill="none" />
  </g>
}

function SemiHermeticCompressor({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <rect x="-17" y="9" width="36" height="5" fill="#26383c" />
    <rect x="-14" y="-4" width="29" height="15" fill="#315e50" />
    <path d="M-11 -4V-10H-3V-4M4 -4V-11H12V-4" fill="#56896b" stroke={ink} strokeWidth="2" />
    <rect x="-11" y="-1" width="22" height="9" fill="#47765e" />
    {[0, 1, 2, 3, 4].map(i => <rect key={i} x={-9 + i * 4} y="0" width="1" height="7" fill="#234b43" />)}
    <rect x="-4" y="-6" width="8" height="4" fill="#d0a84f" />
    <path d="M-14 2H-19V-8M15 2H20V-6" fill="none" stroke={copper} strokeWidth="2" />
  </g>
}

function FinnedCoil({ x, y, w, h, fans = 2 }: { x: number; y: number; w: number; h: number; fans?: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <rect width={w} height={h} fill={ink} />
    <rect x="2" y="2" width={w - 4} height={h - 4} fill="#9db0af" />
    {Array.from({ length: Math.max(3, Math.floor(h / 4)) }).map((_, i) =>
      <path key={i} d={`M3 ${4 + i * 4}H${w - 3}`} stroke="#607982" />)}
    {Array.from({ length: fans }).map((_, i) => <Fan key={i} x={(w / (fans + 1)) * (i + 1)} y={h / 2} />)}
  </g>
}

function Cylinder({ x, y, color, wide = false }: { x: number; y: number; color: string; wide?: boolean }) {
  const w = wide ? 15 : 11
  return <g transform={`translate(${x} ${y})`}>
    <rect x="2" width={w - 4} height="4" fill={ink} />
    <rect width={w} y="4" height="17" fill={ink} />
    <rect x="2" y="5" width={w - 4} height="14" fill={color} />
    <rect x="3" y="7" width="2" height="10" fill="#fff" opacity="0.22" />
  </g>
}

function DigitalMeter({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <rect width="18" height="24" rx="2" fill={ink} />
    <rect x="2" y="2" width="14" height="20" fill="#e3ad32" />
    <rect x="5" y="5" width="8" height="6" fill="#bfd7c5" />
    <rect x="7" y="14" width="4" height="4" fill="#354752" />
    <path d="M3 23V29M15 23V29" stroke="#b9534b" strokeWidth="2" />
  </g>
}

function Station({ node }: { node: EquipmentNode }) {
  const { x, y, w, h } = node.rect
  const horizontal = w > h
  const electrical = ['SAFE120', 'SAFE208', 'CTRL'].includes(node.id)
  const whiteboard = node.id === 'WB'
  return <g transform={`translate(${x} ${y})`}>
    <rect x="3" y="5" width={w} height={h} fill="#20353e" opacity="0.25" />
    <rect width={w} height={h} fill={ink} />
    <rect x="2" y="2" width={w - 4} height={h - 7} fill={whiteboard ? '#e5eedc' : electrical ? '#a4b4b1' : '#527879'} />
    <rect x="2" y="2" width={w - 4} height="3" fill={whiteboard ? '#fcf8e7' : light} />
    <rect x="3" y={h - 6} width={w - 6} height="3" fill="#314e59" />
    {whiteboard ? <>
      <path d="M25 8H65V17H100V8H140M175 8H198V15H226" stroke="#547c77" strokeWidth="2" fill="none" />
      <rect x="246" y="7" width="26" height="10" fill="#dbb76c" />
      <rect x="8" y={h - 5} width="13" height="2" fill="#b45e4e" />
    </> : electrical ? <>
      <rect x="6" y="9" width={w - 12} height={h - 25} fill="#d0d7c8" />
      {[0, 1, 2, 3].map(i => <g key={i}>
        <path d={`M9 ${17 + i * 10}H${w - 9}`} stroke={i % 2 ? '#b66349' : '#3b6875'} strokeWidth="2" />
        <rect x={12 + i % 2 * 8} y={13 + i * 10} width="9" height="7" fill={ink} />
        <rect x={14 + i % 2 * 8} y={14 + i * 10} width="3" height="2" fill={light} />
      </g>)}
      <rect x="8" y={h - 18} width="5" height="5" fill={node.id === 'SAFE208' ? '#e9ad52' : '#a2c875'} />
      <rect x="19" y={h - 18} width="12" height="5" fill={ink} />
    </> : node.id === 'CRIB' ? <>
      {[0, 1, 2, 3, 4].map(i => <g key={i}>
        <rect x="6" y={11 + i * 17} width={w - 12} height="12" fill="#213b47" />
        <rect x="9" y={14 + i * 17} width="12" height="8" fill={i % 2 ? '#dca55b' : '#7fa993'} />
        <rect x="26" y={12 + i * 17} width="12" height="10" fill={i % 2 ? '#598394' : '#b96750'} />
        <rect x="13" y={16 + i * 17} width="5" height="2" fill={light} />
      </g>)}
    </> : node.id === 'PPE' ? <>
      <rect x="6" y="10" width={w - 12} height="44" fill="#c6b389" />
      <path d="M12 17H25V21H29V31H9V21H12Z" fill="#e4b851" />
      <rect x="12" y="37" width="6" height="11" fill="#ce7759" />
      <rect x="22" y="37" width="6" height="11" fill="#ce7759" />
      <rect x="10" y="59" width="20" height="8" fill="#e8dcc0" />
    </> : horizontal ? <>
      <rect x="5" y="6" width={w - 10} height={h - 16} fill="#d1b280" />
      {node.id === 'EVAP' ? <>
        <FinnedCoil x={10} y={8} w={76} h={23} fans={3} />
        <path d="M87 12H101V18H111V27H126" stroke={copper} strokeWidth="3" fill="none" />
        <path d="M101 18L105 14L109 18L105 22Z" fill="#d4a63f" stroke={ink} strokeWidth="1" />
        <path d="M109 18H119M114 18V10" stroke="#d4a63f" strokeWidth="2" />
        <circle cx="124" cy="27" r="3" fill="#4a8193" stroke={ink} />
      </> : node.id === 'SERV' ? <>
        <Cylinder x={10} y={8} color="#478264" wide /><Cylinder x={29} y={8} color="#a6a9a0" /><Cylinder x={44} y={8} color="#d2a838" />
        <rect x="67" y="10" width="25" height="18" fill={ink} /><rect x="70" y="13" width="19" height="12" fill="#6d8588" />
        <circle cx="80" cy="19" r="5" fill="#33464d" /><rect x="76" y="7" width="8" height="4" fill="#d3a14a" />
        <rect x="99" y="10" width="28" height="19" fill="#31536a" stroke={ink} strokeWidth="2" />
        <Gauge x={108} y={18} /><rect x="118" y="14" width="6" height="10" fill="#182f3a" />
      </> : <>
        <DigitalMeter x={12} y={6} />
        <path d="M15 30V33H48V12M27 30H61V10" fill="none" stroke="#b25442" strokeWidth="2" />
        <rect x="55" y="8" width="25" height="22" fill="#d6ded2" stroke={ink} strokeWidth="2" />
        <path d="M59 13H76M59 18H69M59 23H74" stroke="#467083" strokeWidth="2" />
        <rect x="88" y="7" width="37" height="23" fill={steel} stroke={ink} strokeWidth="2" />
        <rect x="93" y="11" width="10" height="9" fill="#273d48" /><rect x="109" y="11" width="10" height="9" fill="#273d48" />
        <rect x="96" y="23" width="20" height="4" fill="#b85c4b" />
      </>}
    </> : <>
      {node.id === 'RIG' ? <>
        <rect x="5" y="8" width="30" height="18" fill="#a8b6b2" stroke={ink} strokeWidth="2" />
        <Fan x={20} y={17} />
        <SemiHermeticCompressor x={20} y={42} scale={0.58} />
        <rect x="9" y="57" width="9" height="20" fill="#345465" stroke={ink} strokeWidth="2" />
        <rect x="22" y="58" width="10" height="18" fill="#777f7b" stroke={ink} strokeWidth="2" />
        <path d="M7 30H13V38H8V66H9M32 34H35V68H32M18 67H22" stroke={copper} strokeWidth="2" fill="none" />
        <Gauge x={13} y={85} /><Gauge x={27} y={85} red />
        <path d="M13 80V74M27 80V74" stroke={copper} strokeWidth="2" />
      </> : node.id === 'COMP' ? <>
        <rect x="5" y="8" width="30" height="34" fill="#b7a06f" />
        <SemiHermeticCompressor x={20} y={27} scale={0.82} />
        <rect x="8" y="45" width="25" height="8" fill="#456674" />
        <rect x="10" y="47" width="8" height="4" fill="#d2a94e" /><rect x="22" y="47" width="8" height="4" fill="#8ea6a6" />
      </> : <>
        <FinnedCoil x={5} y={8} w={w - 10} h={34} fans={1} />
      </>}
      {node.id !== 'RIG' && <>
        <path d={`M8 45H${w - 8}V65H9V84H${w - 8}`} stroke={ink} strokeWidth="5" fill="none" />
        <path d={`M8 44H${w - 8}V64H9V83H${w - 8}`} stroke={copper} strokeWidth="3" fill="none" />
        <rect x="12" y="70" width="16" height="20" fill={node.id === 'COMP' ? '#598576' : '#294954'} />
        <rect x="15" y="72" width="4" height="14" fill="#7b9e8a" />
        <Gauge x={13} y={53} /><Gauge x={27} y={53} red />
      </>}
      <rect x="7" y="94" width={w - 14} height="5" fill={steel} />
    </>}
    <rect x={Math.max(1, w / 2 - 33)} y={h + 5} width={Math.min(w, 66)} height="10" fill="#e7ddbe" opacity="0.96" />
    <text x={w / 2} y={h + 12} textAnchor="middle" fill={ink} fontSize="6" fontFamily="monospace" fontWeight="bold" shapeRendering="auto">{node.short ?? node.id}</text>
  </g>
}

export function PixelClassroomScenery({ map }: { map: GameMap }) {
  return <g shapeRendering="crispEdges" className="pointer-events-none">
    <defs><pattern id="pixel-shop-floor" width="192" height="192" patternUnits="userSpaceOnUse">
      <rect width="192" height="192" fill="#acae9d" />
      <image href="/game/classroom/floor.png" width="192" height="192" style={{ imageRendering: 'pixelated' }} />
    </pattern></defs>
    <rect width={map.w} height={map.h} fill="url(#pixel-shop-floor)" />
    <rect x="20" y="20" width={map.w - 40} height={map.h - 40} fill="#e0d2a7" opacity="0.15" />
    <path d="M114 252V398H410M610 248H720V438" stroke="#ead294" strokeWidth="3" strokeDasharray="12 8" fill="none" opacity="0.65" />
    {map.obstacles.map((o, i) => o.kind === 'wall' ? <g key={i}>
      <rect x={o.x} y={o.y} width={o.w} height={o.h} fill="#304750" />
      <rect x={o.x + 2} y={o.y + 2} width={Math.max(0, o.w - 4)} height={Math.max(0, o.h - 6)} fill="#91a4a1" />
      <path d={`M${o.x + 2} ${o.y + 2}H${o.x + o.w - 2}`} stroke="#dce0c8" strokeWidth="2" />
    </g> : <g key={i}>
      <rect x={o.x + 3} y={o.y + 4} width={o.w} height={o.h} fill={ink} opacity="0.25" />
      <rect x={o.x} y={o.y} width={o.w} height={o.h} fill={ink} />
      <rect x={o.x + 2} y={o.y + 2} width={o.w - 4} height={o.h - 7} fill="#bc986a" />
      <rect x={o.x + 3} y={o.y + 3} width={o.w - 6} height="3" fill="#e8c895" />
      <rect x={o.x + 10} y={o.y + 7} width="16" height="12" fill="#f1e8cf" /><rect x={o.x + 11} y={o.y + 9} width="12" height="1" fill="#8d9d96" />
      <rect x={o.x + 38} y={o.y + 8} width="10" height="13" fill="#456674" /><rect x={o.x + 41} y={o.y + 8} width="2" height="13" fill="#87a3a7" />
    </g>)}
    {map.zones.map(z => <text key={z.label} x={z.x} y={z.y} textAnchor="middle" fill="#344d52" fontFamily="monospace" fontWeight="bold" fontSize="9" shapeRendering="auto">{z.label}</text>)}
    {map.equipment.map(node => <Station key={node.id} node={node} />)}
  </g>
}

export function PixelTechnician({ pos, facing, walking, color }: { pos: Point; facing: number; walking: boolean; color: string }) {
  const side = Math.abs(Math.sin(facing * Math.PI / 180)) > 0.7
  const back = !side && Math.cos(facing * Math.PI / 180) > 0
  const stride = walking ? Math.floor(performance.now() / 160) % 2 * 2 - 1 : 0
  return <g transform={`translate(${Math.round(pos.x)} ${Math.round(pos.y)})`} shapeRendering="crispEdges" className="pointer-events-none">
    <rect x="-10" y="-1" width="23" height="6" fill="#213942" opacity="0.28" />
    <g transform={`scale(${side && Math.sin(facing * Math.PI / 180) < 0 ? -1 : 1} 1)`}>
      <rect x="-6" y={-7 + stride} width="5" height="10" fill="#25394c" /><rect x="2" y={-7 - stride} width="5" height="10" fill="#25394c" />
      <rect x="-7" y={1 + stride} width="7" height="3" fill="#233139" /><rect x="2" y={1 - stride} width="7" height="3" fill="#233139" />
      <rect x="-8" y="-22" width="17" height="17" fill={ink} /><rect x="-6" y="-21" width="13" height="14" fill={color} />
      <rect x="-5" y="-20" width="3" height="11" fill="#fff" opacity="0.16" />
      <rect x="-10" y={-19 - stride} width="4" height="11" fill={color} /><rect x="-10" y={-9 - stride} width="4" height="4" fill="#d49a6d" />
      <rect x="7" y={-19 + stride} width="4" height="10" fill={color} /><rect x="7" y={-10 + stride} width="4" height="4" fill="#d49a6d" />
      <rect x="-6" y="-31" width="13" height="11" fill={back ? '#684b36' : '#dca575'} />
      {!back && <><rect x={side ? 4 : -3} y="-27" width="2" height="2" fill={ink} />{!side && <rect x="3" y="-27" width="2" height="2" fill={ink} />}<rect x="-3" y="-23" width="8" height="3" fill="#976746" /></>}
      <rect x="-7" y="-34" width="15" height="7" fill={ink} /><rect x="-5" y="-34" width="11" height="5" fill={color} />
      <rect x={side ? 3 : -6} y="-29" width={side ? 9 : 15} height="3" fill={color} />
      <rect x="11" y="-9" width="8" height="3" fill={ink} /><rect x="9" y="-6" width="13" height="9" fill="#805733" /><rect x="10" y="-5" width="11" height="2" fill="#c59855" />
    </g>
  </g>
}

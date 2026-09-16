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
        <rect x="12" y="9" width="74" height="21" fill={steel} />
        <Fan x={29} y={19} /><Fan x={53} y={19} /><Fan x={77} y={19} />
        <path d="M91 13H122V27H102" stroke={copper} strokeWidth="3" fill="none" />
      </> : node.id === 'SERV' ? <>
        {[0, 1, 2].map(i => <g key={i}><rect x={13 + i * 19} y="13" width="12" height="16" fill={['#d4a94f', '#819c89', '#b5c3bc'][i]} /><rect x={16 + i * 19} y="9" width="6" height="4" fill={ink} /></g>)}
        <rect x="84" y="11" width="34" height="19" fill="#3b6277" /><Gauge x={103} y={19} />
      </> : <>
        <rect x="12" y="10" width="24" height="20" fill="#d99c45" /><rect x="16" y="13" width="16" height="7" fill="#cee0ba" />
        <path d="M20 26V31H49V12M30 26H61V11" fill="none" stroke="#b25442" strokeWidth="2" />
        <rect x="78" y="10" width="38" height="19" fill={steel} />
        <rect x="83" y="14" width="11" height="10" fill={ink} />
        <rect x="100" y="14" width="11" height="10" fill={ink} />
      </>}
    </> : <>
      {node.id === 'COMP' ? <>
        <rect x="9" y="16" width="23" height="21" fill="#355d50" />
        <rect x="12" y="12" width="8" height="9" fill="#78a17e" /><rect x="23" y="12" width="7" height="9" fill="#78a17e" />
        <rect x="12" y="22" width="18" height="10" fill="#527c63" />
        {[0, 1, 2, 3].map(i => <rect key={i} x={13 + i * 4} y="23" width="1" height="8" fill="#264b45" />)}
        <rect x="7" y="35" width="27" height="4" fill={steel} />
      </> : <>
        <rect x="6" y="10" width={w - 12} height="30" fill={steel} />
        {[0, 1, 2, 3, 4, 5].map(i => <path key={i} d={`M8 ${13 + i * 4}H${w - 8}`} stroke="#607d86" />)}
        <Fan x={w / 2} y={25} />
      </>}
      <path d={`M8 45H${w - 8}V65H9V84H${w - 8}`} stroke={ink} strokeWidth="5" fill="none" />
      <path d={`M8 44H${w - 8}V64H9V83H${w - 8}`} stroke={copper} strokeWidth="3" fill="none" />
      <rect x="12" y="70" width="16" height="20" fill={node.id === 'COMP' ? '#598576' : '#294954'} />
      <rect x="15" y="72" width="4" height="14" fill="#7b9e8a" />
      <Gauge x={13} y={53} /><Gauge x={27} y={53} red />
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

import { useMemo, type ReactNode } from 'react'
import type { Character, EquipmentNode, GameMap, Obstacle, Point } from '@/lib/game/types'
import type { VisualFaultState } from '@/lib/game/inspection/types'
import { FLOOR_DEPTH, WALL_HEIGHT, depthOrder } from '@/lib/game/oblique'
import { PixelEquipment, PixelObstacle } from './inspection/PixelEquipment'

const ink = '#253841'
const products = ['#c98163', '#edca74', '#80a88c', '#c47781', '#8eb7ce']

/** All solids end at their collision footprint's front edge. Height extends
 * north on screen, never south into a walkable aisle. No rotated sprites. */
function Cabinet({ node, visual }: { node: EquipmentNode; visual?: VisualFaultState }) {
  const { x, y, w, h } = node.rect
  const bunker = node.kind === 'bunker'
  const room = node.kind === 'walk-in-freezer' || node.kind === 'walk-in-cooler'
  const tall = room ? 68 : bunker ? 22 : 84
  const roof = h * FLOOR_DEPTH
  const doors = Math.max(1, Math.round(w / 44))
  return <g transform={`translate(${x} ${y + h}) scale(1 ${1 / FLOOR_DEPTH})`} shapeRendering="crispEdges" className="pointer-events-none">
    <title>{node.label}</title>
    <path d={`M0 0h${w}l10 7H8z`} fill="#304544" opacity=".2" />
    <rect y={-tall - roof} width={w} height={roof + tall} fill={ink} />
    <rect x="2" y={-tall - roof + 2} width={w - 4} height={roof - 2} fill={bunker ? '#a5cbd0' : '#c4d4d2'} />
    <path d={`M2 ${-tall - roof + 2}h${w - 4}v4H2z`} fill="#edf0da" />
    <rect x={w - 8} y={-tall - roof + 6} width="6" height={roof + tall - 8} fill="#77959b" />
    {room ? <>
      <rect x="3" y={-tall} width={w - 12} height={tall - 4} fill="#a6bec2" />
      {Array.from({ length: Math.floor(w / 20) }, (_, i) => <rect key={i} x={i * 20 + 5} y={-tall + 2} width="1" height={tall - 8} fill="#829da4" />)}
      <rect x={w / 2 - 20} y={-tall + 10} width="40" height={tall - 14} fill={ink} />
      <rect x={w / 2 - 17} y={-tall + 13} width="34" height={tall - 20} fill="#d5e3df" />
      <rect x={w / 2 + 9} y="-29" width="4" height="13" fill="#465b64" />
      <rect x="9" y={-tall - roof + 10} width={w - 24} height="5" fill="#abbfbd" />
    </> : bunker ? <>
      <rect x="7" y={-tall - roof + 8} width={w - 20} height={roof - 14} fill="#517681" />
      {Array.from({ length: Math.floor((w - 20) / 16) }, (_, i) => <rect key={i} x={12 + i * 16} y={-tall - roof + 13} width="11" height={Math.max(4, roof - 24)} fill={products[i % products.length]} />)}
      <path d={`M${w / 2} ${-tall - roof + 7}v${roof - 12}`} stroke="#dfebe0" strokeWidth="3" />
      <rect x="3" y={-tall} width={w - 12} height={tall - 4} fill="#b3c8c6" />
      <rect x="4" y="-8" width={w - 14} height="4" fill="#617c81" />
    </> : <>
      <rect x="3" y={-tall} width={w - 12} height="9" fill="#365569" />
      {Array.from({ length: doors }, (_, i) => {
        const dw = (w - 16) / doors
        const left = 5 + i * dw
        const frost = visual?.frost[Math.min(2, Math.floor(i * 3 / doors))] ?? 0
        return <g key={i}>
          <rect x={left} y={-tall + 11} width={dw - 3} height={tall - 21} fill="#1e3947" />
          <rect x={left + 3} y={-tall + 13} width={dw - 9} height={tall - 26} fill="#68909f" />
          {[0, 1, 2].map(row => <g key={row}>
            {Array.from({ length: Math.max(1, Math.floor((dw - 12) / 9)) }, (_, col) => <rect key={col} x={left + 5 + col * 9} y={-tall + 17 + row * 11} width="6" height="7" fill={products[(row + col + i) % products.length]} />)}
            <rect x={left + 3} y={-tall + 25 + row * 11} width={dw - 9} height="2" fill="#cddeda" />
          </g>)}
          <path d={`M${left + 5} ${-tall + 14}h3v${tall - 29}h-3z`} fill="#e6ffff" opacity=".4" />
          {Array.from({ length: 12 }, (_, j) => ((j * 29 + i * 7) % 100 < frost) && <rect key={j} x={left + 4 + (j % 3) * (dw - 12) / 3} y={-tall + 14 + Math.floor(j / 3) * 9} width={(dw - 12) / 3} height="9" fill="#d4eff0" opacity=".82" />)}
          <rect x={left + dw - 9} y="-36" width="3" height="12" fill="#e5e5c9" />
        </g>
      })}
      <rect x="3" y="-8" width={w - 12} height="5" fill="#475f69" />
      {visual?.defrost && <rect x="5" y="-7" width="7" height="3" fill="#e7a763" />}
    </>}
    <rect x="4" y="-3" width={w - 8} height="3" fill="#233740" />
    <text x={w / 2 - 3} y={room ? -tall + 8 : bunker ? -10 : -tall + 7} textAnchor="middle" fontSize="8" fontWeight="800" fill={bunker ? ink : '#f4efd9'}>{room ? (node.kind === 'walk-in-freezer' ? 'FREEZER' : 'COOLER') : bunker ? node.id : `FROZEN FOOD · ${node.id}`}</text>
  </g>
}

function SolidObstacle({ o, map }: { o: Obstacle; map: GameMap }) {
  if (o.walkable || !['wall', 'shelf', 'checkout', 'produce'].includes(o.kind)) return <PixelObstacle o={o} />
  // Foreground and side boundary walls are cut away to keep the technician visible.
  const wall = o.kind === 'wall'
  const height = wall ? (o.y === 0 ? WALL_HEIGHT : o.y + o.h >= map.h || o.h > o.w ? 8 : 26) : o.kind === 'shelf' ? 34 : 18
  const d = o.h * FLOOR_DEPTH
  return <g transform={`translate(${o.x} ${o.y + o.h}) scale(1 ${1 / FLOOR_DEPTH})`} shapeRendering="crispEdges" className="pointer-events-none">
    <path d={`M0 0h${o.w}l7 6H6z`} fill="#344949" opacity=".18" />
    <rect y={-d - height} width={o.w} height={d + height} fill={ink} />
    <rect x="2" y={-d - height + 2} width={o.w - 4} height={d - 2} fill={wall ? '#e0dcc8' : '#b7c6ba'} />
    <rect x="2" y={-height} width={o.w - 4} height={height - 2} fill={wall ? '#9cafb2' : '#768f8e'} />
    {wall && <rect x="2" y={-height + 6} width={o.w - 4} height="5" fill="#547984" />}
    {o.kind === 'shelf' && Array.from({ length: Math.floor((d - 12) / 18) }, (_, row) => <g key={`stock-${row}`}>
      <rect x="6" y={-d - height + 6 + row * 18} width={o.w - 12} height="13" fill="#496169" />
      {[0, 1, 2, 3].map(col => <rect key={col} x={8 + col * (o.w - 16) / 4} y={-d - height + 8 + row * 18} width={(o.w - 20) / 4} height="9" fill={products[(row + col) % products.length]} />)}
    </g>)}
    {!wall && Array.from({ length: Math.max(1, Math.floor(o.w / 12) - 1) }, (_, i) => <g key={i}>
      <rect x={6 + i * 12} y={-height + 4} width="8" height={height - 11} fill={products[i % products.length]} />
      <rect x={6 + i * 12} y={-height + 8} width="8" height="3" fill="#f4e4bd" />
    </g>)}
  </g>
}

function Technician({ pos, character, facing, walking }: { pos: Point; character: Character; facing: number; walking: boolean }) {
  const angle = (facing % 360 + 360) % 360
  const back = angle < 45 || angle > 315
  const side = angle >= 45 && angle <= 135 ? 1 : angle >= 225 && angle <= 315 ? -1 : 0
  return <g data-testid="oblique-technician" transform={`translate(${pos.x} ${pos.y}) scale(1 ${1 / FLOOR_DEPTH})`} className="pointer-events-none" shapeRendering="crispEdges">
    <ellipse cy="2" rx="11" ry="4" fill="#304744" opacity=".3" />
    <g>
      {walking && <animateTransform attributeName="transform" type="translate" values="0 0;0 -1;0 0" dur=".3s" repeatCount="indefinite" />}
      <rect x="-7" y="-13" width="6" height="11" fill="#304859" /><rect x="2" y="-13" width="6" height="11" fill="#304859" />
      <rect x="-8" y="-4" width="8" height="4" fill={ink} /><rect x="2" y="-4" width="8" height="4" fill={ink} />
      <rect x="-9" y="-26" width="18" height="15" fill={character.color} />
      <rect x="-12" y="-23" width="4" height="13" fill="#d7a77b" /><rect x="9" y="-23" width="4" height="13" fill="#d7a77b" />
      <rect x="-8" y="-13" width="17" height="3" fill={ink} />
      <rect x="7" y="-15" width="7" height="8" fill="#aa8150" /><rect x="9" y="-19" width="2" height="6" fill="#d5e0da" />
      <rect x="-6" y="-36" width="13" height="12" fill={back ? '#66503c' : '#d7a77b'} />
      <rect x="-7" y="-38" width="15" height="6" fill={character.color} />
      <rect x={side < 0 ? -11 : -6} y="-33" width="17" height="3" fill={character.color} />
      {!back && <><rect x={side < 0 ? -5 : 0} y="-29" width="2" height="2" fill={ink} />{!side && <rect x="4" y="-29" width="2" height="2" fill={ink} />}</>}
      {!back && <rect x="-4" y="-23" width="4" height="3" fill="#e2e9d9" />}
    </g>
  </g>
}

export default function ObliqueScene({ map, pos, character, facing, walking, visualStates }: {
  map: GameMap; pos: Point; character: Character; facing: number; walking: boolean; visualStates?: Record<string, VisualFaultState>
}) {
  // Reuse static SVG subtrees while the follow camera/technician moves.
  const scenery = useMemo<{ key: string; depth: number; art: ReactNode }[]>(() => [
    ...map.obstacles.map((o, i) => ({ key: `obstacle-${i}`, depth: o.walkable ? -1 : o.y + o.h, art: <SolidObstacle o={o} map={map} /> })),
    ...map.equipment.map(node => ({ key: node.id, depth: node.walkable ? -1 : node.rect.y + node.rect.h, art: ['reach-in-freezer', 'bunker', 'walk-in-freezer', 'walk-in-cooler'].includes(node.kind)
      ? <Cabinet node={node} visual={visualStates?.[node.id]} /> : <PixelEquipment node={node} visual={visualStates?.[node.id]} /> }))
  ], [map, visualStates])
  const items = [...scenery,
    { key: 'technician', depth: pos.y, art: <Technician pos={pos} character={character} facing={facing} walking={walking} /> }
  ]
  return <g data-testid="oblique-scene">{depthOrder(items).map(item => <g key={item.key} data-depth={item.depth} data-object={item.key}>{item.art}</g>)}</g>
}

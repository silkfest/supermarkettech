import type { EquipmentNode, Obstacle, Point } from '@/lib/game/types'
import type { VisualFaultState } from '@/lib/game/inspection/types'

// Integer-grid, oblique sprites: shallow front faces, no diamond/isometric floor.
// Native SVG components stay transparent, reusable and resolution independent.
const ink = '#263845',
  steel = '#a8bbc0',
  light = '#e1ebe8'
/** A stopped fan reads as a dead pilot light and a blade sat still, so the one
 *  that is not turning is visible at a glance the way it is in the case. */
export function PixelFan({
  x,
  y,
  stopped = false
}: {
  x: number
  y: number
  stopped?: boolean
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="12" height="12" fill={ink} />
      <path
        d={stopped ? 'M1 4h10v4H1z' : 'M4 1h4v3h3v4H8v3H4V8H1V4h3z'}
        fill={stopped ? '#6b6f72' : steel}
      />
      <rect x="5" y="5" width="2" height="2" fill={stopped ? '#8c3b32' : '#f4e0a5'} />
    </g>
  )
}
export function PixelCompressor({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="1" y="20" width="23" height="3" fill={ink} />
      <rect x="3" y="8" width="19" height="12" fill="#286d50" />
      <rect x="1" y="5" width="9" height="8" fill="#69ae65" />
      <rect x="14" y="5" width="10" height="8" fill="#69ae65" />
      <rect x="8" y="12" width="8" height="8" fill="#418450" />
      <rect x="10" y="14" width="4" height="3" fill="#f3d992" />
      <rect x="5" y="3" width="3" height="3" fill="#d9c9a1" />
      <rect x="18" y="3" width="3" height="3" fill="#d9c9a1" />
    </g>
  )
}
export function PixelVessel({
  x,
  y,
  horizontal = false
}: {
  x: number
  y: number
  horizontal?: boolean
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d={
          horizontal
            ? 'M3 0h29v3h3v10h-3v3H3v-3H0V3h3z'
            : 'M3 0h8v3h3v22h-3v3H3v-3H0V3h3z'
        }
        fill={steel}
      />
      <rect
        x="3"
        y="4"
        width={horizontal ? 28 : 3}
        height={horizontal ? 3 : 18}
        fill={light}
      />
    </g>
  )
}
export function PixelPanel({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="15" height="22" fill={ink} />
      <rect x="1" y="1" width="13" height="18" fill="#d9d3bd" />
      <rect x="3" y="3" width="8" height="4" fill="#41686b" />
      <rect x="4" y="4" width="5" height="1" fill="#8ee09b" />
      <rect x="10" y="11" width="2" height="5" fill={ink} />
      <rect x="3" y="10" width="3" height="3" fill="#efbd50" />
    </g>
  )
}
export function FrostPixels({
  amount,
  seed = 0
}: {
  amount: number
  seed?: number
}) {
  return (
    <g opacity="0.92">
      {Array.from({ length: 36 }, (_, i) => {
        const visible = (i * 29 + seed * 13) % 100 < amount
        return visible ? (
          <rect
            key={i}
            x={4 + (i % 6) * 4}
            y={4 + Math.floor(i / 6) * 5}
            width={i % 3 === 0 ? 6 : 4}
            height={i % 2 ? 5 : 3}
            fill={i % 3 ? '#ecffff' : '#a9d8e0'}
          />
        ) : null
      })}
    </g>
  )
}
export function FrozenSection({
  frost = 0,
  heating = false,
  index = 0
}: {
  frost?: number
  heating?: boolean
  index?: number
}) {
  return (
    <g>
      <rect width="34" height="44" fill={ink} />
      <rect x="2" y="2" width="30" height="35" fill="#678f9e" />
      {[0, 1, 2].map((row) => (
        <g key={row}>
          <rect x="4" y={6 + row * 10} width="25" height="2" fill={light} />
          {[0, 1, 2, 3].map((col) => (
            <rect
              key={col}
              x={5 + col * 6}
              y={9 + row * 10}
              width="4"
              height="6"
              fill={
                ['#d78859', '#e4cd76', '#90ae76', '#c47670'][
                  (col + row + index) % 4
                ]
              }
            />
          ))}
        </g>
      ))}
      <path d="M4 3h2v31H4zM9 3h1v31H9z" fill="#bce0e0" opacity="0.5" />
      <rect x="29" y="17" width="2" height="8" fill="#f3e6ca" />
      <FrostPixels amount={frost} seed={index} />
      <rect
        x="2"
        y="38"
        width="30"
        height="4"
        fill={heating ? '#d99557' : '#48535a'}
      />
    </g>
  )
}
// ── Sprites drawn at the node's own size ─────────────────────────────────────
// The generic case body below scales a 120x80 drawing to fit, which distorts
// anything that is not roughly that shape. These draw at real size instead.
function seams(w: number, h: number, step: number, colour: string) {
  return Array.from({ length: Math.max(1, Math.floor(w / step) - 1) }, (_, i) => (
    <rect key={i} x={(i + 1) * step} y="2" width="1" height={h - 4} fill={colour} />
  ))
}
/** A room you walk into: insulated panels, a door on the aisle side, and the
 *  unit cooler hung inside on the back wall. */
function WalkIn({ w, h, freezer }: { w: number; h: number; freezer: boolean }) {
  const doorW = Math.min(34, Math.round(w * 0.32))
  const doorX = Math.round(w / 2 - doorW / 2)
  return (
    <>
      <rect width={w} height={h} fill={ink} />
      <rect x="2" y="2" width={w - 4} height={h - 4} fill={freezer ? '#8fa8b5' : '#a7b8b4'} />
      <rect x="5" y="5" width={w - 10} height={h - 14} fill={freezer ? '#c3d8e0' : '#d3ddd4'} />
      {seams(w, h, 18, freezer ? '#9db6c2' : '#b3c0b8')}
      {/* unit cooler on the back wall */}
      <rect x={Math.round(w / 2 - 20)} y="8" width="40" height="12" fill="#7f9199" />
      <rect x={Math.round(w / 2 - 17)} y="11" width="34" height="3" fill={light} />
      <PixelFan x={Math.round(w / 2 - 14)} y={14} />
      <PixelFan x={Math.round(w / 2 + 2)} y={14} />
      {/* door on the front face */}
      <rect x={doorX} y={h - 12} width={doorW} height="12" fill="#6d7f86" />
      <rect x={doorX + 3} y={h - 10} width={doorW - 6} height="7" fill={freezer ? '#dbeef5' : '#e8efe6'} />
      <rect x={doorX + doorW - 7} y={h - 9} width="3" height="5" fill="#3d4f57" />
      {freezer && (
        <g opacity="0.75">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={doorX + 5 + i * 6} y={h - 9} width="2" height="2" fill="#f2ffff" />
          ))}
        </g>
      )}
    </>
  )
}
/** Glass-door drinks cooler. Tall and narrow, so it is drawn upright. */
function ReachInCooler({ w, h }: { w: number; h: number }) {
  const rows = Math.max(2, Math.floor((h - 12) / 22))
  return (
    <>
      <rect width={w} height={h} fill={ink} />
      <rect x="2" y="2" width={w - 4} height={h - 8} fill="#3e626d" />
      {Array.from({ length: rows }, (_, r) => (
        <g key={r}>
          <rect x="4" y={6 + r * 22} width={w - 8} height="2" fill="#c1c8bc" />
          {Array.from({ length: Math.max(1, Math.floor((w - 8) / 9)) }, (_, c) => (
            <rect key={c} x={5 + c * 9} y={9 + r * 22} width="6" height="12"
              fill={['#c8663f', '#3f7fa8', '#6c9c52', '#d8b74a'][(c + r) % 4]} />
          ))}
        </g>
      ))}
      <rect x="3" y="3" width="3" height={h - 12} fill="#cfe6e6" opacity="0.45" />
      <rect x={Math.round(w / 2) - 1} y="3" width="2" height={h - 12} fill="#8fa6ab" />
      <rect x="0" y={h - 6} width={w} height="6" fill="#708a90" />
    </>
  )
}
/** Top-opening chest freezer: lids seen from above. */
function ChestFreezer({ w, h }: { w: number; h: number }) {
  const lids = Math.max(2, Math.floor(h / 36))
  return (
    <>
      <rect width={w} height={h} fill={ink} />
      <rect x="2" y="2" width={w - 4} height={h - 4} fill="#8fa8b5" />
      {Array.from({ length: lids }, (_, i) => (
        <g key={i}>
          <rect x="5" y={5 + i * ((h - 10) / lids)} width={w - 10} height={(h - 10) / lids - 3} fill="#cfe4ec" />
          <rect x="7" y={7 + i * ((h - 10) / lids)} width={w - 14} height="3" fill="#eef9fb" opacity="0.8" />
        </g>
      ))}
    </>
  )
}
/** Ice machine: head unit over a storage bin, with its control panel. */
function IceMachine({ w, h }: { w: number; h: number }) {
  const head = Math.round(h * 0.45)
  return (
    <>
      <rect width={w} height={h} fill={ink} />
      <rect x="2" y="2" width={w - 4} height={head} fill="#93a7ae" />
      <rect x="5" y="5" width={w - 10} height={head - 7} fill={light} />
      {seams(w, head, 12, '#b6c6ca')}
      <rect x="2" y={head + 3} width={w - 4} height={h - head - 5} fill="#7c8f96" />
      <rect x="5" y={head + 6} width={w - 10} height={h - head - 11} fill="#cfe0e4" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={7 + (i % 3) * 14} y={head + 9 + Math.floor(i / 3) * 8} width="9" height="5" fill="#f1fbfd" />
      ))}
      <rect x={w - 16} y="7" width="10" height="6" fill="#39525c" />
      <rect x={w - 14} y="9" width="3" height="2" fill="#8ee09b" />
    </>
  )
}
/** Air-cooled condensing unit: coil on the sides, fan on top, compressor inside. */
function CondensingUnit({ w, h }: { w: number; h: number }) {
  return (
    <>
      <rect width={w} height={h} fill={ink} />
      <rect x="2" y="2" width={w - 4} height={h - 4} fill="#8d9a86" />
      {Array.from({ length: Math.max(3, Math.floor(h / 6)) }, (_, i) => (
        <rect key={i} x="3" y={4 + i * 6} width={w - 6} height="2" fill="#6f7f72" />
      ))}
      <rect x={Math.round(w / 2 - 13)} y={Math.round(h / 2 - 13)} width="26" height="26" fill="#55645c" />
      <g transform={`translate(${Math.round(w / 2 - 6)} ${Math.round(h / 2 - 6)})`}>
        <PixelFan x={0} y={0} />
      </g>
      <rect x="4" y={h - 12} width="14" height="8" fill="#2f6a52" />
      <rect x="6" y={h - 10} width="4" height="3" fill="#8bd6a6" />
    </>
  )
}
/** Wall-hung split head: grille and louvre vanes. */
function SplitAc({ w, h }: { w: number; h: number }) {
  return (
    <>
      <rect width={w} height={h} fill={ink} />
      <rect x="2" y="2" width={w - 4} height={h - 4} fill={light} />
      {Array.from({ length: Math.max(2, Math.floor((h - 16) / 5)) }, (_, i) => (
        <rect key={i} x="5" y={6 + i * 5} width={w - 10} height="2" fill="#9fb0b5" />
      ))}
      <rect x="4" y={h - 10} width={w - 8} height="6" fill="#6f8288" />
      <rect x="6" y={h - 9} width={w - 12} height="2" fill="#c3d2d6" />
    </>
  )
}
/** A shop on the town map. Keeps the sign band, its accent and the short name,
 *  and faces whichever street its pin is on. */
function Storefront({ node }: { node: EquipmentNode }) {
  const { w, h } = node.rect
  const faceUp = node.pin.y < node.rect.y + h / 2
  const accent = node.accent ?? '#2563eb'
  const bandH = Math.min(22, Math.round(h * 0.2))
  const bandY = faceUp ? 6 : h - bandH - 6
  const roofY = faceUp ? bandH + 12 : 8
  const roofH = h - bandH - 22
  const glassY = faceUp ? bandH + 8 : h - bandH - 14
  const bays = Math.max(2, Math.floor(w / 60))
  return (
    <>
      <rect width={w} height={h} fill="#8d8577" />
      <rect x="3" y="3" width={w - 6} height={h - 6} fill="#cec6b4" />
      <rect x="9" y={roofY} width={w - 18} height={roofH} fill="#b9b2a1" />
      {Array.from({ length: Math.max(1, Math.floor(roofH / 16)) }, (_, i) => (
        <rect key={i} x="12" y={roofY + 6 + i * 16} width={w - 24} height="1" fill="#9d9788" />
      ))}
      {[0.3, 0.7].map((f, i) => (
        <g key={i} transform={`translate(${Math.round(w * f) - 11} ${Math.round(roofY + roofH / 2) - 8})`}>
          <rect width="22" height="16" fill="#7d8a8c" />
          <rect x="2" y="2" width="18" height="12" fill="#a4b2b3" />
          <PixelFan x={5} y={2} />
        </g>
      ))}
      {/* glass front on the street side */}
      {Array.from({ length: bays }, (_, i) => (
        <rect key={i} x={10 + i * ((w - 20) / bays)} y={glassY} width={(w - 20) / bays - 7} height="7" fill="#9fd0d8" />
      ))}
      <rect x="5" y={bandY} width={w - 10} height={bandH} fill={accent} />
      <rect x="5" y={bandY} width={w - 10} height={Math.round(bandH / 3)} fill="#ffffff" opacity="0.2" />
      <text x={Math.round(w / 2)} y={bandY + Math.round(bandH / 2) + 4} textAnchor="middle"
        fontSize={w > 240 ? 11 : 9} fontWeight="800" letterSpacing="1.1" fill="#ffffff">
        {node.short ?? node.id}
      </text>
    </>
  )
}
export function PixelEquipment({
  node,
  visual
}: {
  node: EquipmentNode
  visual?: VisualFaultState
}) {
  const { x, y, w, h } = node.rect
  const kind = node.kind
  const vertical = h > w * 1.4
  // Kinds whose shape is nothing like a display case get drawn at their own
  // size, so nothing is stretched to fit the 120x80 body further down.
  const own: Record<string, React.ReactNode> = {
    'walk-in-cooler': <WalkIn w={w} h={h} freezer={false} />,
    'walk-in-freezer': <WalkIn w={w} h={h} freezer />,
    'reach-in-cooler': <ReachInCooler w={w} h={h} />,
    'chest-freezer': <ChestFreezer w={w} h={h} />,
    'ice-machine': <IceMachine w={w} h={h} />,
    'condensing-unit': <CondensingUnit w={w} h={h} />,
    'split-ac': <SplitAc w={w} h={h} />,
    storefront: <Storefront node={node} />
  }
  if (own[kind])
    return (
      <g
        transform={`translate(${x} ${y})`}
        shapeRendering="crispEdges"
        className="pointer-events-none"
      >
        <rect x="2" y="4" width={w} height={h} fill="#273e48" opacity="0.18" />
        {own[kind]}
        {kind !== 'storefront' && (
          <text
            x={w / 2}
            y={h + 9}
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill={ink}
          >
            {node.id}
          </text>
        )}
      </g>
    )

  const freezer = kind === 'reach-in-freezer'
  if (freezer)
    return (
      <g
        transform={`translate(${x} ${y})`}
        shapeRendering="crispEdges"
        className="pointer-events-none"
      >
        {[0, 1, 2].map((i) => (
          <g
            key={i}
            transform={
              vertical
                ? `translate(0 ${(i * h) / 3}) scale(${w / 34} ${h / 132})`
                : `translate(${(i * w) / 3} 0) scale(${w / 102} ${h / 44})`
            }
          >
            <FrozenSection
              index={i}
              frost={visual?.frost[i] ?? 0}
              heating={visual?.defrost && (i !== 2 || visual.repaired)}
            />
          </g>
        ))}
        <text x={w / 2} y={h + 9} textAnchor="middle" fontSize="8" fill={ink}>
          {node.id}
        </text>
      </g>
    )
  return (
    <g
      transform={`translate(${x} ${y}) scale(${w / 120} ${h / 80})`}
      shapeRendering="crispEdges"
      className="pointer-events-none"
    >
      <rect x="2" y="4" width="118" height="76" fill="#263845" opacity="0.25" />
      <rect width="118" height="74" fill={steel} />
      <rect x="2" y="2" width="114" height="63" fill={light} />
      <rect y="66" width="118" height="12" fill="#708a90" />
      {kind === 'rack' ? (
        <>
          <rect x="5" y="12" width="104" height="4" fill="#a95747" />
          <rect x="5" y="21" width="104" height="5" fill="#567f95" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <path
                d={`M${14 + i * 28} 14v17 M${26 + i * 28} 24v7`}
                stroke="#bda67f"
                strokeWidth="3"
              />
              <PixelCompressor x={6 + i * 28} y={28} />
            </g>
          ))}
          <PixelVessel x={7} y={57} horizontal />
          <PixelVessel x={88} y={29} />
          <PixelPanel x={101} y={29} />
          <path
            d="M41 64h45v-10h8M20 54v5h67"
            fill="none"
            stroke="#be9756"
            strokeWidth="2"
          />
        </>
      ) : kind.startsWith('walk-in') ? (
        <>
          <rect x="5" y="5" width="108" height="54" fill="#aac8cb" />
          <rect x="12" y="8" width="94" height="20" fill="#eef0e3" />
          {[22, 52, 82].map((v) => (
            <PixelFan key={v} x={v} y={12} />
          ))}
          <rect x="40" y="61" width="40" height="14" fill={ink} />
          <rect x="43" y="61" width="34" height="10" fill="#d9ddcb" />
          <rect x="68" y="64" width="3" height="5" fill={ink} />
        </>
      ) : kind === 'rtu' ? (
        <>
          {[10, 16, 22, 28, 34].map((v) => (
            <rect key={v} x="8" y={v} width="42" height="3" fill="#65777a" />
          ))}
          <g transform="translate(64 10) scale(3)">
            <PixelFan x={0} y={0} />
          </g>
          <PixelPanel x={12} y={42} />
        </>
      ) : kind === 'entrance' ? (
        <>
          <rect width="120" height="80" fill="#385665" />
          <rect x="5" y="5" width="50" height="68" fill="#abcfd1" />
          <rect x="65" y="5" width="50" height="68" fill="#abcfd1" />
        </>
      ) : kind === 'floor-drain' ? (
        <>
          {[10, 25, 40, 55, 70, 85, 100].map((v) => (
            <rect key={v} x={v} y="8" width="7" height="52" fill={ink} />
          ))}
        </>
      ) : (
        <>
          <rect
            x="6"
            y="6"
            width="106"
            height="55"
            fill={kind === 'produce-case' ? '#455c3d' : '#3e626d'}
          />
          {[0, 1, 2].map((row) => (
            <g key={row}>
              <rect
                x="8"
                y={9 + row * 17}
                width="102"
                height="3"
                fill="#c1c8bc"
              />
              {Array.from({ length: 8 }, (_, col) => (
                <rect
                  key={col}
                  x={10 + col * 12}
                  y={13 + row * 17}
                  width="9"
                  height="10"
                  fill={
                    kind === 'meat-case' || kind === 'deli-case'
                      ? ['#cc7775', '#e1a890', '#b95960'][col % 3]
                      : kind === 'produce-case'
                        ? ['#84a458', '#d9bb55', '#bd7254'][col % 3]
                        : ['#e3dfc8', '#82aeb3', '#b2bb84'][col % 3]
                  }
                />
              ))}
            </g>
          ))}
          {(kind === 'bunker' ||
            kind === 'meat-case' ||
            kind === 'deli-case') && (
            <path
              d="M8 7h104v8H8zM13 8h4v50h-4zM58 8h4v50h-4z"
              fill="#c8e1df"
              opacity="0.6"
            />
          )}
        </>
      )}
      <text
        x="59"
        y="74"
        textAnchor="middle"
        fontSize="8"
        fontWeight="bold"
        fill="#f3f0dc"
      >
        {node.id}
      </text>
    </g>
  )
}
/** Asphalt. Roads get a dashed centre line along their long axis; parking gets
 *  stall markings across it. */
function PixelGround({ o }: { o: Obstacle }) {
  const { x, y, w, h } = o
  const road = o.kind === 'road'
  const horizontal = w >= h
  const marks = horizontal
    ? Math.max(1, Math.floor(w / (road ? 34 : 26)))
    : Math.max(1, Math.floor(h / (road ? 34 : 26)))
  return (
    <g shapeRendering="crispEdges" className="pointer-events-none">
      <rect x={x} y={y} width={w} height={h} fill={road ? '#6f7478' : '#7b7f80'} />
      {road ? (
        Array.from({ length: marks }, (_, i) =>
          horizontal ? (
            <rect key={i} x={x + 10 + i * 34} y={y + Math.round(h / 2) - 1} width="16" height="3" fill="#e0c65c" />
          ) : (
            <rect key={i} x={x + Math.round(w / 2) - 1} y={y + 10 + i * 34} width="3" height="16" fill="#e0c65c" />
          )
        )
      ) : (
        Array.from({ length: marks }, (_, i) =>
          horizontal ? (
            <rect key={i} x={x + 8 + i * 26} y={y + 4} width="2" height={h - 8} fill="#cfd3cf" opacity="0.7" />
          ) : (
            <rect key={i} x={x + 4} y={y + 8 + i * 26} width={w - 8} height="2" fill="#cfd3cf" opacity="0.7" />
          )
        )
      )}
    </g>
  )
}
/** A plain block of town: roof, a parapet and lit windows on the front face. */
function PixelBuilding({ o }: { o: Obstacle }) {
  const { x, y, w, h } = o
  const cols = Math.max(1, Math.floor((w - 12) / 16))
  return (
    <g shapeRendering="crispEdges" className="pointer-events-none">
      <rect x={x + 2} y={y + 5} width={w} height={h} fill="#273e48" opacity="0.2" />
      <rect x={x} y={y} width={w} height={h} fill="#8b8579" />
      <rect x={x + 3} y={y + 3} width={w - 6} height={h - 12} fill="#b6ad9c" />
      <rect x={x + 3} y={y + h - 9} width={w - 6} height="6" fill="#756e63" />
      {Array.from({ length: cols }, (_, i) => (
        <rect key={i} x={x + 8 + i * 16} y={y + h - 8} width="9" height="4" fill="#d8c98d" />
      ))}
      {o.label && (
        <text x={x + w / 2} y={y + h - 12} textAnchor="middle" fontSize="7"
          fontWeight="bold" letterSpacing="0.8" fill="#4a4539">
          {o.label}
        </text>
      )}
    </g>
  )
}
/** Canopy and trunk, drawn from above and slightly in front. */
function PixelTree({ o }: { o: Obstacle }) {
  const { x, y, w, h } = o
  const cx = x + Math.round(w / 2)
  const r = Math.round(Math.min(w, h) / 2) - 1
  return (
    <g shapeRendering="crispEdges" className="pointer-events-none">
      <rect x={cx - 2} y={y + h - 8} width="4" height="8" fill="#6b5236" />
      <rect x={cx - r} y={y + 2} width={r * 2} height={r * 2 - 2} fill="#4f7a3f" />
      <rect x={cx - r + 3} y={y + 5} width={r * 2 - 6} height={r * 2 - 8} fill="#679a4c" />
      <rect x={cx - r + 6} y={y + 8} width={Math.max(2, r - 4)} height={Math.max(2, r - 4)} fill="#86b45e" />
    </g>
  )
}
export function PixelObstacle({ o }: { o: Obstacle }) {
  const { x, y, w, h } = o
  // Town scenery is not shelving. Without these it would all fall through to
  // the shelf body below and the streets would be drawn as grocery aisles.
  if (o.kind === 'road' || o.kind === 'parking')
    return <PixelGround o={o} />
  if (o.kind === 'building') return <PixelBuilding o={o} />
  if (o.kind === 'tree') return <PixelTree o={o} />
  if (o.kind === 'counter')
    return (
      <g shapeRendering="crispEdges" className="pointer-events-none">
        <rect x={x + 2} y={y + 4} width={w} height={h} fill="#273e48" opacity="0.18" />
        <rect x={x} y={y} width={w} height={h} fill="#6d5c47" />
        <rect x={x + 2} y={y + 2} width={w - 4} height={h - 8} fill="#c8b48e" />
        <rect x={x + 2} y={y + h - 6} width={w - 4} height="4" fill="#574a3a" />
        <rect x={x + 8} y={y + 5} width="18" height="12" fill="#37494c" />
        <rect x={x + 10} y={y + 7} width="14" height="7" fill="#a4d0bc" />
      </g>
    )

  const wall = o.kind === 'wall'
  return (
    <g shapeRendering="crispEdges" className="pointer-events-none">
      <rect
        x={x + 2}
        y={y + 4}
        width={w}
        height={h}
        fill="#273e48"
        opacity="0.18"
      />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={wall ? '#b0b7a7' : '#9e8b6b'}
      />
      <rect
        x={x + 2}
        y={y + 2}
        width={w - 4}
        height={h - 7}
        fill={wall ? '#e1dfcb' : '#dbceb0'}
      />
      {!wall &&
        Array.from(
          { length: Math.max(1, Math.floor((h - 8) / 14)) },
          (_, row) => (
            <g key={row}>
              <rect
                x={x + 4}
                y={y + 5 + row * 14}
                width={w - 8}
                height="2"
                fill="#65726b"
              />
              {Array.from(
                { length: Math.max(1, Math.floor((w - 10) / 10)) },
                (_, col) => (
                  <rect
                    key={col}
                    x={x + 5 + col * 10}
                    y={y + 8 + row * 14}
                    width="7"
                    height="7"
                    fill={
                      o.kind === 'produce'
                        ? ['#709b51', '#d4a24f', '#ba6b4a'][(col + row) % 3]
                        : ['#b66453', '#a2ae82', '#d7bc68', '#789aab'][
                            (col + row) % 4
                          ]
                    }
                  />
                )
              )}
            </g>
          )
        )}
      {o.kind === 'checkout' &&
        [0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${x + 15 + i * 65} ${y + 6})`}>
            <rect width="46" height="25" fill="#37494c" />
            <rect x="32" y="25" width="12" height="12" fill="#536c70" />
            <rect x="34" y="27" width="8" height="5" fill="#a4d0bc" />
          </g>
        ))}
    </g>
  )
}
export function PixelTechnician({
  pos,
  color,
  walking
}: {
  pos: Point
  color: string
  walking: boolean
}) {
  return (
    <g
      transform={`translate(${Math.round(pos.x) - 8} ${Math.round(pos.y) - 23})`}
      shapeRendering="crispEdges"
      className="pointer-events-none"
    >
      <rect x="1" y="25" width="16" height="3" fill="#334943" opacity="0.3" />
      <rect x="4" y="1" width="10" height="9" fill="#d6ac88" />
      <rect x="3" y="0" width="12" height="4" fill="#654d3b" />
      <rect x="2" y="10" width="14" height="12" fill={color} />
      <rect x="0" y="12" width="3" height="8" fill="#d6ac88" />
      <rect x="16" y="12" width="3" height="8" fill="#d6ac88" />
      <rect x="3" y="20" width="5" height={walking ? 8 : 6} fill="#243947" />
      <rect x="11" y="20" width="5" height={walking ? 5 : 6} fill="#243947" />
      <rect x="14" y="18" width="7" height="6" fill="#b7914d" />
    </g>
  )
}

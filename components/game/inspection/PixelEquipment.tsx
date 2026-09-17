import type { EquipmentNode, Obstacle, Point } from '@/lib/game/types'
import type { VisualFaultState } from '@/lib/game/inspection/types'

// Integer-grid, oblique sprites: shallow front faces, no diamond/isometric floor.
// Native SVG components stay transparent, reusable and resolution independent.
const ink = '#263845',
  steel = '#a8bbc0',
  light = '#e1ebe8'
export function PixelFan({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="12" height="12" fill={ink} />
      <path d="M4 1h4v3h3v4H8v3H4V8H1V4h3z" fill={steel} />
      <rect x="5" y="5" width="2" height="2" fill="#f4e0a5" />
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
export function PixelObstacle({ o }: { o: Obstacle }) {
  const { x, y, w, h } = o
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

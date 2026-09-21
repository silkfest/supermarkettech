import {
  FrozenSection,
  PixelFan,
  FrostPixels,
  PixelPanel,
  PixelCompressor,
  PixelVessel
} from './PixelEquipment'
import { defOf } from '@/lib/game/inspection/defs'
import type { ComponentId, InspectionState } from '@/lib/game/inspection/types'
export default function EquipmentScene({
  state,
  selected,
  onSelect
}: {
  state: InspectionState
  selected: ComponentId
  onSelect: (id: ComponentId) => void
}) {
  const def = defOf(state)
  if (def.id === 'f3-liquid-drier')
    return <RackScene state={state} def={def} selected={selected} onSelect={onSelect} />
  const fanCall = def.id === 'f2-evap-fan'
  const internal = ['coil', 'fans', 'heaters', 'electrical'].includes(selected)
  // On the defrost call the glow means "this element is heating"; on the fan
  // call there is no defrost running, so the strip stays cold throughout.
  const heating = (i: number) =>
    !fanCall && state.defrostStarted !== null && (i !== 2 || state.repaired)
  const stopped = (i: number) => fanCall && !(state.fans ?? [])[i]
  return (
    <div className="rounded-xl bg-[#d6d3bb] p-2">
      <svg
        viewBox="0 0 180 130"
        role="img"
        aria-label={
          fanCall
            ? 'Meat multideck: three fan sections, one fan stopped'
            : 'F1 frozen case: three sections with uneven frost'
        }
        shapeRendering="crispEdges"
        className="w-full max-h-64"
      >
        <rect x="0" y="0" width="180" height="130" fill="#d6d3bb" />
        <path
          d="M0 110h180M0 90h180M20 0v130M60 0v130M100 0v130M140 0v130"
          stroke="#babda9"
        />
        <rect x="27" y="19" width="135" height="90" fill="#758582" />
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${25 + i * 44} 13)`}>
            {internal ? (
              <g>
                <rect x="1" y="1" width="40" height="71" fill="#304a50" />
                {Array.from({ length: 12 }, (_, fin) => (
                  <rect
                    key={fin}
                    x={3 + fin * 3}
                    y="4"
                    width="1"
                    height="61"
                    fill="#a9bdba"
                  />
                ))}
                <path
                  d="M5 9h31v10H5v10h31v10H5v10h31v10H5"
                  fill="none"
                  stroke="#bf9b67"
                  strokeWidth="2"
                />
                <g transform="scale(1.2 1.8)">
                  <FrostPixels amount={state.frost[i]} seed={i} />
                </g>
                <rect
                  x="2"
                  y="67"
                  width="36"
                  height="3"
                  fill={heating(i) ? '#e6a15c' : '#7a7970'}
                />
                <rect x="2" y="70" width="3" height="3" fill="#d5c8a1" />
                <rect x="35" y="70" width="3" height="3" fill="#d5c8a1" />
              </g>
            ) : (
              <g transform="scale(1.2 1.65)">
                <FrozenSection
                  index={i}
                  frost={state.frost[i]}
                  heating={heating(i)}
                />
              </g>
            )}
            <PixelFan x={14} y={77} stopped={stopped(i)} />
            <rect
              x="3"
              y="92"
              width="36"
              height="3"
              fill={heating(i) ? '#ea9b48' : '#5c6f6d'}
            />
            <text
              x="21"
              y="108"
              textAnchor="middle"
              fontSize="7"
              fill="#263845"
            >
              {['SUPPLY', 'CENTRE', 'RETURN'][i]}
            </text>
          </g>
        ))}
        {selected === 'electrical' && (
          <g transform="translate(2 25)">
            <PixelPanel x={0} y={0} />
            <path
              d="M8 23v45h15"
              fill="none"
              stroke="#a75d45"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>
      <div
        className="grid grid-cols-3 gap-1"
        aria-label="Equipment interaction areas"
      >
        {def.components.map((c) => (
          <button
            key={c.id}
            aria-pressed={selected === c.id}
            onClick={() => onSelect(c.id)}
            className={`min-h-11 px-1 py-2 rounded text-[10px] font-semibold ${selected === c.id ? 'bg-blue-800 text-white' : 'bg-[#f1efdf] text-slate-800'}`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** The machine room rather than a case: compressor group, condenser, receiver
 *  and the liquid line running through the drier out to the store. The drier
 *  sweats and the glass bubbles until the cores are changed. */
function RackScene({
  state,
  def,
  selected,
  onSelect
}: {
  state: InspectionState
  def: ReturnType<typeof defOf>
  selected: ComponentId
  onSelect: (id: ComponentId) => void
}) {
  const plugged = !state.repaired
  const down = state.isolated
  return (
    <div className="rounded-xl bg-[#d6d3bb] p-2">
      <svg
        viewBox="0 0 180 130"
        role="img"
        aria-label="Rack A: compressor group, receiver and liquid line drier"
        shapeRendering="crispEdges"
        className="w-full max-h-64"
      >
        <rect x="0" y="0" width="180" height="130" fill="#d6d3bb" />
        <path d="M0 108h180M0 88h180M30 0v130M90 0v130M140 0v130" stroke="#babda9" />
        {/* condenser up on the roof line */}
        <g transform="translate(112 8)">
          <rect width="58" height="22" fill="#263845" />
          <rect x="2" y="2" width="54" height="18" fill="#6f8790" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <rect key={i} x={4 + i * 7} y="4" width="3" height="14" fill="#a9bdba" />
          ))}
          <PixelFan x={12} y={5} />
          <PixelFan x={34} y={5} />
        </g>
        {/* compressor group on the rack frame */}
        <g transform="translate(8 58)">
          <rect x="0" y="26" width="76" height="4" fill="#4a5a62" />
          <PixelCompressor x={2} y={2} />
          <PixelCompressor x={28} y={2} />
          <PixelCompressor x={54} y={2} />
        </g>
        {/* receiver, with a level that is plainly not low */}
        <g transform="translate(96 54)">
          <PixelVessel x={0} y={0} />
          <rect x="3" y={4 + 18 * 0.32} width="3" height={18 * 0.68} fill="#7fc4d8" />
          <text x="20" y="14" fontSize="7" fill="#263845">
            {state.repaired ? '62%' : '68%'}
          </text>
        </g>
        {/* liquid line: receiver -> drier -> out to the store */}
        <path
          d="M104 82v14h24"
          fill="none"
          stroke={down ? '#9aa39c' : '#c07f52'}
          strokeWidth="3"
        />
        <g transform="translate(128 90)">
          <rect width="22" height="12" fill="#263845" />
          <rect x="2" y="2" width="9" height="8" fill="#b8a488" />
          <rect x="11" y="2" width="9" height="8" fill={plugged ? '#8fd0e6' : '#b8a488'} />
          {plugged && [0, 1, 2].map((i) => (
            <rect key={i} x={12 + i * 3} y="11" width="2" height="3" fill="#dff4fb" />
          ))}
        </g>
        <path
          d="M150 96h22"
          fill="none"
          stroke={down ? '#9aa39c' : plugged ? '#b9a48d' : '#c07f52'}
          strokeWidth="3"
        />
        {/* sight glass downstream of the drier */}
        <g transform="translate(154 88)">
          <rect width="10" height="10" fill="#263845" />
          <rect x="1" y="1" width="8" height="8" fill={plugged ? '#9fc6cf' : '#c98b5c'} />
          {plugged && (
            <>
              <rect x="2" y="3" width="2" height="2" fill="#f2ffff" />
              <rect x="6" y="6" width="2" height="2" fill="#f2ffff" />
            </>
          )}
        </g>
        <text x="129" y="112" fontSize="7" fill="#263845">DRIER</text>
        <text x="10" y="112" fontSize="7" fill="#263845">COMPRESSORS</text>
        <text x="96" y="50" fontSize="7" fill="#263845">RECEIVER</text>
        {down && (
          <text x="96" y="122" fontSize="7" fill="#8c3b32">
            SECTION PUMPED DOWN
          </text>
        )}
      </svg>
      <div className="grid grid-cols-3 gap-1" aria-label="Equipment interaction areas">
        {def.components.map((c) => (
          <button
            key={c.id}
            aria-pressed={selected === c.id}
            onClick={() => onSelect(c.id)}
            className={`min-h-11 px-1 py-2 rounded text-[10px] font-semibold ${selected === c.id ? 'bg-blue-800 text-white' : 'bg-[#f1efdf] text-slate-800'}`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}

import {
  FrozenSection,
  PixelFan,
  FrostPixels,
  PixelPanel
} from './PixelEquipment'
import { COMPONENTS } from '@/lib/game/inspection/f1'
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
  const internal = ['coil', 'fans', 'heaters', 'electrical'].includes(selected)
  return (
    <div className="rounded-xl bg-[#d6d3bb] p-2">
      <svg
        viewBox="0 0 180 130"
        role="img"
        aria-label="F1 frozen case: three sections with uneven frost"
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
                  fill={
                    state.defrostStarted !== null && (i !== 2 || state.repaired)
                      ? '#e6a15c'
                      : '#7a7970'
                  }
                />
                <rect x="2" y="70" width="3" height="3" fill="#d5c8a1" />
                <rect x="35" y="70" width="3" height="3" fill="#d5c8a1" />
              </g>
            ) : (
              <g transform="scale(1.2 1.65)">
                <FrozenSection
                  index={i}
                  frost={state.frost[i]}
                  heating={
                    state.defrostStarted !== null && (i !== 2 || state.repaired)
                  }
                />
              </g>
            )}
            <PixelFan x={14} y={77} />
            <rect
              x="3"
              y="92"
              width="36"
              height="3"
              fill={
                state.defrostStarted !== null && (i !== 2 || state.repaired)
                  ? '#ea9b48'
                  : '#5c6f6d'
              }
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
        {COMPONENTS.map((c) => (
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

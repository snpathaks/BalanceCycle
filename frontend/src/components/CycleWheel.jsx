/**
 * CycleWheel — SVG radial wheel showing one spoke per cycle day.
 * Spoke length & color depth = severity.
 * Current day marked with a solid ink dot.
 * Hover/tap → tooltip with day info.
 */
import { useState, useRef, useEffect } from 'react'

const COLORS = {
  0:   '#E8D8CC',   // no data — hairline/cream tone
  0.5: '#F3D4D8',   // blood-soft whisper
  1:   '#F3D4D8',
  1.5: '#F5C4A8',   // peach-soft
  2:   '#F5B487',   // peach
  2.5: '#DE8F58',   // peach-deep
  3:   '#C45040',   // midpoint — warm blood
  3.5: '#B03020',
  4:   '#A6041A',   // blood
  4.5: '#8A031A',
  5:   '#6E0311',   // blood-deep
}

function severityColor(score) {
  const rounded = Math.round(score * 2) / 2  // nearest 0.5
  return COLORS[rounded] ?? COLORS[5]
}

const PHASE_LABEL = {
  menstrual: 'Menstrual',
  follicular: 'Follicular',
  ovulation: 'Ovulation',
  luteal: 'Luteal',
}

export default function CycleWheel({ data, size = 340 }) {
  const [tooltip, setTooltip] = useState(null)
  const prefersReduced = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current

  if (!data) {
    return (
      <div
        style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div
          className="skeleton"
          style={{ width: size, height: size, borderRadius: '50%' }}
        />
      </div>
    )
  }

  const { spokes = [], cycle_length = 28, current_day = 1 } = data
  const cx = size / 2
  const cy = size / 2

  // Sizing
  const innerR = size * 0.12    // hub radius
  const minLen = size * 0.08    // min spoke extension beyond hub
  const maxLen = size * 0.28    // max spoke extension beyond hub

  const totalSpokes = cycle_length
  const angleStep = (2 * Math.PI) / totalSpokes
  const startAngle = -Math.PI / 2  // 12 o'clock

  const spokeElements = spokes.map((spoke, i) => {
    const angle = startAngle + i * angleStep
    const score = spoke.severity_score ?? 0
    const normalised = score / 5  // 0-1
    const spokeLen = minLen + normalised * (maxLen - minLen)
    const color = score === 0 ? COLORS[0] : severityColor(score)

    const x1 = cx + Math.cos(angle) * innerR
    const y1 = cy + Math.sin(angle) * innerR
    const x2 = cx + Math.cos(angle) * (innerR + spokeLen)
    const y2 = cy + Math.sin(angle) * (innerR + spokeLen)

    const isCurrentDay = spoke.day_number === current_day

    const dotR = isCurrentDay ? 5 : 0

    const delay = prefersReduced ? 0 : i * 18

    return (
      <g
        key={spoke.day_number}
        role="button"
        tabIndex={0}
        aria-label={`Day ${spoke.day_number}: ${PHASE_LABEL[spoke.phase] || spoke.phase}, severity ${score.toFixed(1)}`}
        style={{ cursor: 'pointer', outline: 'none' }}
        onMouseEnter={() => setTooltip({ spoke, x: x2, y: y2, angle })}
        onMouseLeave={() => setTooltip(null)}
        onFocus={() => setTooltip({ spoke, x: x2, y: y2, angle })}
        onBlur={() => setTooltip(null)}
        onClick={() => setTooltip(t => t?.spoke.day_number === spoke.day_number ? null : { spoke, x: x2, y: y2, angle })}
      >
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color}
          strokeWidth={score === 0 ? 1.5 : 2.5}
          strokeLinecap="round"
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: prefersReduced
              ? 'none'
              : `spokeIn 0.4s ease forwards ${delay}ms`,
            opacity: prefersReduced ? 1 : 0,
          }}
        />
        {isCurrentDay && (
          <circle
            cx={cx + Math.cos(angle) * (innerR + spokeLen + 6)}
            cy={cy + Math.sin(angle) * (innerR + spokeLen + 6)}
            r={dotR}
            fill="var(--color-ink)"
            aria-label="Today"
          />
        )}
      </g>
    )
  })

  return (
    <div
      style={{ position: 'relative', width: size, height: size, userSelect: 'none' }}
      aria-label={`Cycle wheel showing ${cycle_length} days. Currently on day ${current_day}.`}
    >
      <style>{`
        @keyframes spokeIn {
          from { opacity: 0; transform: scaleY(0); }
          to   { opacity: 1; transform: scaleY(1); }
        }
      `}</style>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Cycle severity wheel"
      >
        {/* Hub circle */}
        <circle
          cx={cx} cy={cy} r={innerR}
          fill="var(--color-cream-deep)"
          stroke="var(--color-hairline)"
          strokeWidth={1.5}
        />

        {/* Phase arc labels (subtle) */}
        {['follicular', 'ovulation', 'luteal', 'menstrual'].map((phase) => {
          const phaseSpokes = spokes.filter(s => s.phase === phase)
          if (!phaseSpokes.length) return null
          const midIndex = phaseSpokes[Math.floor(phaseSpokes.length / 2)]?.day_number - 1
          const angle = startAngle + midIndex * angleStep
          const labelR = innerR + maxLen + 18
          const lx = cx + Math.cos(angle) * labelR
          const ly = cy + Math.sin(angle) * labelR
          return (
            <text
              key={phase}
              x={lx} y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={8}
              fill="var(--color-ink-soft)"
              fontFamily="'IBM Plex Mono', monospace"
              style={{ pointerEvents: 'none', textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
              {phase}
            </text>
          )
        })}

        {spokeElements}

        {/* Hub label */}
        <text
          x={cx} y={cy - 5}
          textAnchor="middle"
          fontSize={11}
          fontFamily="'Fraunces', serif"
          fill="var(--color-ink)"
        >
          Day
        </text>
        <text
          x={cx} y={cy + 10}
          textAnchor="middle"
          fontSize={15}
          fontWeight="900"
          fontFamily="'Fraunces', serif"
          fill="var(--color-blood)"
        >
          {current_day}
        </text>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            top: Math.min(tooltip.y, size - 110),
            left: Math.min(tooltip.x, size - 180),
            transform: 'translate(-50%, -110%)',
            background: 'var(--color-ink)',
            color: 'white',
            borderRadius: 10,
            padding: '0.5rem 0.75rem',
            fontSize: '0.78rem',
            lineHeight: 1.5,
            pointerEvents: 'none',
            width: 170,
            zIndex: 10,
            boxShadow: '0 4px 16px -4px rgba(43,21,24,0.4)',
          }}
          role="tooltip"
        >
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.65rem', opacity: 0.7, marginBottom: 2 }}>
            DAY {tooltip.spoke.day_number} · {PHASE_LABEL[tooltip.spoke.phase]}
          </div>
          <div style={{ fontWeight: 600 }}>
            Severity: {tooltip.spoke.severity_score.toFixed(1)} / 5
          </div>
          {tooltip.spoke.symptoms.length > 0 && (
            <div style={{ marginTop: 4, opacity: 0.85 }}>
              {tooltip.spoke.symptoms.slice(0, 3).join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

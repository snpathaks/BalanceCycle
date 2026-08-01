/**
 * TrendsBars — weekly severity bar chart using Recharts.
 * Filterable by category.
 */
import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'

const CATEGORIES = ['all', 'pain', 'mood', 'energy', 'skin', 'digestive', 'sleep', 'other']

const CATEGORY_COLORS = {
  pain:       '#A6041A',   // blood — highest concern
  mood:       '#C45040',   // warm blood-mid
  energy:     '#DE8F58',   // peach-deep
  skin:       '#F5B487',   // peach
  digestive:  '#B03020',   // blood-warm
  sleep:      '#6E0311',   // blood-deep
  other:      '#E8D8CC',   // hairline/neutral
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'var(--color-ink)',
        color: 'white',
        borderRadius: 10,
        padding: '0.6rem 0.9rem',
        fontSize: '0.8rem',
        lineHeight: 1.6,
        boxShadow: '0 4px 16px -4px rgba(43,21,24,0.4)',
      }}
    >
      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.65rem', opacity: 0.7 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey}>
          <span style={{ fontWeight: 600 }}>{p.value.toFixed(1)}</span>
          <span style={{ opacity: 0.7 }}> avg severity · {p.payload.category}</span>
        </div>
      ))}
    </div>
  )
}

export default function TrendsBars({ bars, loading, onCategoryChange }) {
  const [active, setActive] = useState('all')

  const handleFilter = (cat) => {
    setActive(cat)
    onCategoryChange?.(cat === 'all' ? null : cat)
  }

  if (loading) {
    return <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
  }

  if (!bars?.length) {
    return (
      <p style={{ color: 'var(--color-ink-soft)', fontStyle: 'italic', fontSize: '0.9rem' }}>
        No trend data yet — log a few symptoms to see your weekly patterns.
      </p>
    )
  }

  const chartData = bars.map((b) => ({
    name: b.week_label,
    severity: b.avg_severity,
    category: b.category,
    count: b.count,
  }))

  return (
    <div>
      {/* Category filter pills */}
      <div
        role="group"
        aria-label="Filter by category"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1rem' }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            id={`filter-${cat}`}
            onClick={() => handleFilter(cat)}
            className="tag"
            aria-pressed={active === cat}
            style={{
              background: active === cat ? 'var(--color-blood)' : 'var(--color-blood-soft)',
              color: active === cat ? 'white' : 'var(--color-blood)',
              border: `1px solid ${active === cat ? 'var(--color-blood)' : 'rgba(165,4,26,0.15)'}`,
              cursor: 'pointer',
              padding: '0.25rem 0.65rem',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono', fill: 'var(--color-ink-soft)' }}
          />
          <YAxis
            domain={[0, 5]}
            tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono', fill: 'var(--color-ink-soft)' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="severity" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={CATEGORY_COLORS[entry.category] ?? '#D97D8B'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

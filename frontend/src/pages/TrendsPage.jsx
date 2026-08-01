/**
 * TrendsPage — reference-matched layout.
 */
import { useState, useEffect } from 'react'
import CycleWheel from '../components/CycleWheel'
import TrendsBars from '../components/TrendsBars'
import { api } from '../hooks/useApi'
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'

const USER_ID = 'local'

const CONFIDENCE_COLOR = {
  possible: 'var(--color-peach)',
  likely:   'var(--color-peach-deep)',
  strong:   'var(--color-blood)',
}

export default function TrendsPage() {
  const [wheelData, setWheelData] = useState(null)
  const [bars, setBars] = useState([])
  const [summary, setSummary] = useState(null)
  const [barsLoading, setBarsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getCycleWheel(USER_ID),
      api.getTrendsBars(USER_ID, null, 8),
      api.getTrendsSummary(USER_ID),
    ]).then(([wheel, b, s]) => {
      setWheelData(wheel)
      setBars(b)
      setSummary(s)
    }).catch(console.error)
      .finally(() => setBarsLoading(false))
  }, [])

  const handleCategoryChange = async (cat) => {
    try {
      const b = await api.getTrendsBars(USER_ID, cat, 8)
      setBars(b)
    } catch (e) { console.error(e) }
  }

  const thisAvg = summary?.this_cycle_avg_severity
  const lastAvg = summary?.last_cycle_avg_severity
  const delta = thisAvg != null && lastAvg != null ? thisAvg - lastAvg : null
  const trendColor = delta == null ? 'var(--color-ink-soft)' : delta < -0.3 ? '#3D9B6B' : delta > 0.3 ? 'var(--color-blood)' : 'var(--color-ink-soft)'

  return (
    <div className="page-outer">
      <span className="eyebrow">TRENDS</span>
      <h1 className="section-heading">
        Your cycle, <span className="accent">at a glance.</span>
      </h1>
      <p className="body-soft" style={{ maxWidth: 480, marginBottom: '2.5rem' }}>
        Patterns emerge when you keep logging. Every spoke tells a story.
      </p>

      {/* Cycle Wheel */}
      <section className="wheel-wrapper" style={{ marginBottom: '2.5rem' }} aria-label="Cycle severity wheel">
        <CycleWheel data={wheelData} size={Math.min(340, (typeof window !== 'undefined' ? window.innerWidth : 400) - 80)} />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--color-ink-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Spoke depth + length = severity
        </p>
      </section>

      {/* This vs last */}
      {(thisAvg != null || lastAvg != null) && (
        <div style={{ background: 'var(--color-cream-deep)', border: '1.5px solid var(--color-hairline)', borderRadius: 18, padding: '1.4rem 1.6rem', marginBottom: '1.25rem' }}>
          <span className="eyebrow">THIS CYCLE VS LAST</span>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.5rem' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-ink-soft)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>This cycle</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-blood)', lineHeight: 1 }}>
                {thisAvg?.toFixed(1) ?? '—'}
              </p>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-ink-soft)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Last cycle</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-peach-deep)', lineHeight: 1 }}>
                {lastAvg?.toFixed(1) ?? '—'}
              </p>
            </div>
            {delta != null && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: trendColor, fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 600 }}>
                {delta > 0 ? '+' : ''}{delta.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bar chart */}
      <div style={{ background: 'var(--color-cream-deep)', border: '1.5px solid var(--color-hairline)', borderRadius: 18, padding: '1.4rem 1.6rem', marginBottom: '1.25rem' }}>
        <span className="eyebrow">WEEKLY SEVERITY</span>
        <div style={{ marginTop: '0.75rem' }}>
          <TrendsBars bars={bars} loading={barsLoading} onCategoryChange={handleCategoryChange} />
        </div>
      </div>

      {/* Correlation insights */}
      {summary?.correlations?.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <span className="eyebrow">PATTERNS NOTICED</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
            {summary.correlations.map((c, i) => (
              <div key={i} style={{ background: 'var(--color-cream-deep)', border: '1.5px solid var(--color-hairline)', borderRadius: 14, padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: CONFIDENCE_COLOR[c.confidence], marginTop: 7, flexShrink: 0 }} aria-hidden />
                <div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-ink)', lineHeight: 1.55 }}>{c.insight}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: CONFIDENCE_COLOR[c.confidence], marginTop: 3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {c.confidence} pattern
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Irregularity notice */}
      {summary?.variability?.some(v => v.flagged) && (
        <div style={{ background: 'var(--color-blood-soft)', border: '1px solid var(--color-hairline)', borderRadius: 14, padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
          <AlertTriangle size={15} style={{ color: 'var(--color-blood)', marginTop: 3, flexShrink: 0 }} aria-hidden />
          <div>
            <p style={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: '0.9rem' }}>Some cycles have been notably irregular</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-ink-soft)', marginTop: 2 }}>Cycle length variability of more than 7 days may be worth mentioning to your doctor.</p>
          </div>
        </div>
      )}

      <div className="note-banner" role="note">
        <strong>NOTE</strong>
        This app provides general wellness information. It is not a substitute for professional medical advice, diagnosis, or treatment. In an emergency, contact local emergency services.
      </div>
    </div>
  )
}

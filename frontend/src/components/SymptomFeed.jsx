/**
 * SymptomFeed — reverse-chronological list of recent symptom log entries.
 */
import { format, isToday, isYesterday } from '../lib/dateUtils'

function formatDate(iso) {
  const d = new Date(iso)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d)
}

const SEV_STYLE = {
  mild:     { bg: 'var(--color-blood-soft)',               color: 'var(--color-blood)'      },
  moderate: { bg: 'rgba(245, 180, 135, 0.35)',             color: 'var(--color-blood-deep)' },
  severe:   { bg: 'var(--color-blood)',                    color: 'white'                   },
}

export default function SymptomFeed({ logs, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16 }} />
        ))}
      </div>
    )
  }

  if (!logs?.length) {
    return (
      <div
        style={{
          textAlign: 'center',
          color: 'var(--color-ink-soft)',
          padding: '2.5rem 1rem',
          fontSize: '0.95rem',
        }}
      >
        <p className="state-label">Your body's been quiet.</p>
        <p style={{ fontStyle: 'italic' }}>Start by telling it you're here.</p>
      </div>
    )
  }

  return (
    <div
      role="feed"
      aria-label="Recent symptom logs"
      style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
    >
      {logs.map((log) => {
        const sev = log.severity || 'moderate'
        const style = SEV_STYLE[sev] || SEV_STYLE.moderate
        const symptoms = log.extracted_symptoms || []

        return (
          <article
            key={log.id}
            className="card entry-new"
            style={{ padding: '1rem 1.25rem', cursor: 'default' }}
            aria-label={`Log entry from ${formatDate(log.created_at)}`}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <time
                dateTime={log.created_at}
                className="eyebrow"
                style={{ paddingTop: 2 }}
              >
                {formatDate(log.created_at)} ·{' '}
                {new Date(log.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
              <span
                className="badge"
                style={{ background: style.bg, color: style.color, flexShrink: 0 }}
              >
                {sev}
              </span>
            </div>

            <p style={{ color: 'var(--color-ink)', marginBottom: symptoms.length ? '0.6rem' : 0, fontSize: '0.9rem' }}>
              {log.raw_text}
            </p>

            {symptoms.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {symptoms.map((sym) => (
                  <span key={sym.id} className="tag" style={{ cursor: 'default' }}>
                    {sym.symptom_name}
                  </span>
                ))}
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

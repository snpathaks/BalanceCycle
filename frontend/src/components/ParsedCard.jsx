/**
 * ParsedCard — shows LLM-extracted symptom data before saving.
 * User can tap any tag to edit symptom name, category, or severity.
 */
import { useState } from 'react'

const CATEGORIES = ['pain', 'mood', 'energy', 'skin', 'digestive', 'sleep', 'other']

function StarRating({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '0.125rem', alignItems: 'center' }} aria-label="Severity rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} out of 5`}
          style={{
            fontSize: '1rem',
            background: 'none',
            border: 'none',
            padding: '0 1px',
            cursor: 'pointer',
            color: n <= value ? 'var(--color-blood)' : 'var(--color-hairline)',
          }}
        >
          ●
        </button>
      ))}
    </div>
  )
}

export default function ParsedCard({ parsed, onConfirm, onDiscard, loading }) {
  const [symptoms, setSymptoms] = useState(
    parsed.symptoms?.map((s, i) => ({ ...s, _key: i })) ?? []
  )
  const [editingIdx, setEditingIdx] = useState(null)

  if (!parsed) return null

  const updateSymptom = (idx, patch) =>
    setSymptoms((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))

  const removeSymptom = (idx) =>
    setSymptoms((prev) => prev.filter((_, i) => i !== idx))

  const handleConfirm = () =>
    onConfirm({ ...parsed, symptoms })

  return (
    <div className="card" style={{ border: '2px solid var(--color-blood-soft)', background: 'var(--color-cream-deep)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 2 }}>Parsed by AI — tap to edit</p>
          <p style={{ color: 'var(--color-ink-soft)', fontSize: '0.85rem' }}>
            {parsed.summary || 'Review before saving.'}
          </p>
        </div>
        <span
          className="badge"
          style={{
            background:
              parsed.severity === 'severe'   ? 'var(--color-blood)'      :
              parsed.severity === 'moderate' ? 'rgba(245,180,135,0.35)'  : 'var(--color-blood-soft)',
            color:
              parsed.severity === 'severe'   ? 'white'                   :
              parsed.severity === 'moderate' ? 'var(--color-blood-deep)' : 'var(--color-blood)',
            flexShrink: 0,
          }}
        >
          {parsed.severity}
        </span>
      </div>

      {/* Symptom chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        {symptoms.map((sym, idx) => (
          <div key={sym._key} style={{ position: 'relative' }}>
            {editingIdx === idx ? (
              <div
                className="card"
                style={{
                  position: 'absolute', zIndex: 20, top: '100%', left: 0,
                  padding: '0.75rem', minWidth: 220, marginTop: 4,
                  boxShadow: '0 8px 24px -8px rgba(43,23,18,0.18)',
                  background: 'var(--color-cream)',
                  border: '1.5px solid var(--color-hairline)',
                }}
              >
                <p className="eyebrow" style={{ marginBottom: 6 }}>Edit symptom</p>
                <input
                  type="text"
                  value={sym.symptom_name}
                  onChange={(e) => updateSymptom(idx, { symptom_name: e.target.value })}
                  style={{ marginBottom: 8, fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
                  autoFocus
                  aria-label="Symptom name"
                />
                <select
                  value={sym.category || 'other'}
                  onChange={(e) => updateSymptom(idx, { category: e.target.value })}
                  style={{ marginBottom: 8, fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                  aria-label="Category"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 8 }}>
                  <span className="eyebrow">Severity</span>
                  <StarRating
                    value={sym.severity_score ?? 3}
                    onChange={(v) => updateSymptom(idx, { severity_score: v })}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    onClick={() => setEditingIdx(null)}>Save</button>
                  <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    onClick={() => { removeSymptom(idx); setEditingIdx(null) }}>Remove</button>
                </div>
              </div>
            ) : null}
            <button
              className="tag"
              onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
              aria-label={`Edit ${sym.symptom_name}`}
              aria-expanded={editingIdx === idx}
            >
              {sym.symptom_name}
              {sym.severity_score && (
                <span style={{ opacity: 0.65, fontWeight: 500 }}>·{sym.severity_score}</span>
              )}
              {sym.category && (
                <span style={{ opacity: 0.55 }}>[{sym.category}]</span>
              )}
            </button>
          </div>
        ))}

        {symptoms.length === 0 && (
          <p style={{ color: 'var(--color-ink-soft)', fontSize: '0.85rem', fontStyle: 'italic' }}>
            No symptoms extracted. Add context to your description and try again.
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          id="confirm-parsed-btn"
          className="btn btn-primary"
          onClick={handleConfirm}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? 'Saving…' : 'Save entry'}
        </button>
        <button className="btn btn-ghost" onClick={onDiscard}>
          Discard
        </button>
      </div>
    </div>
  )
}

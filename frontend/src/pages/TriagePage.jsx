/**
 * TriagePage — reference-matched layout.
 */
import { useState, useEffect } from 'react'
import { ChevronRight, Plus, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../hooks/useApi'
import Toast from '../components/ui/Toast'

const USER_ID = 'local'

const BADGE_CONFIG = {
  'routine':        { label: 'Routine',           cls: 'badge-routine' },
  'watch':          { label: 'Keep an eye on it',  cls: 'badge-watch' },
  'talk-to-doctor': { label: 'Talk to a doctor',   cls: 'badge-doctor' },
}

function RemedyModal({ symptom, onClose }) {
  const [text, setText] = useState('')
  const [helped, setHelped] = useState(null)
  const [rating, setRating] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      await api.logRemedy({ user_id: USER_ID, symptom_name: symptom, remedy_text: text, helped, rating: rating || null })
      setSaved(true)
      setTimeout(onClose, 1200)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`Log remedy for ${symptom}`} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-panel" style={{ background: 'var(--color-cream)', border: '1.5px solid var(--color-hairline)' }}>
        <span className="eyebrow">LOG A REMEDY</span>
        <p style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.95rem', fontFamily: 'var(--font-display)' }}>For: {symptom}</p>
        {saved ? (
          <p style={{ color: 'var(--color-primary)', fontWeight: 500 }}>✓ Saved to your journal</p>
        ) : (
          <>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="e.g. ginger tea, yoga, heating pad…"
              rows={2}
              autoFocus
              style={{ width: '100%', border: '1px solid var(--color-hairline)', borderRadius: 10, padding: '0.6rem 0.8rem', fontFamily: 'var(--font-body)', fontSize: '0.9rem', marginBottom: '0.75rem', resize: 'none', outline: 'none' }}
              aria-label="Remedy description"
            />
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {[{ val: true, label: '✓ Helped' }, { val: false, label: '✗ Didn\'t help' }, { val: null, label: '? Unsure' }].map(({ val, label }) => (
                <button key={String(val)} className="pill-btn" onClick={() => setHelped(val)} aria-pressed={helped === val}
                  style={{ background: helped === val ? 'var(--color-blood)' : 'var(--color-cream-deep)', color: helped === val ? 'white' : 'var(--color-ink)', fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center', marginBottom: '1rem' }}>
              <span className="eyebrow" style={{ marginBottom: 0, marginRight: '0.4rem' }}>RATING</span>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.15rem', color: n <= rating ? 'var(--color-blood)' : 'var(--color-hairline)', padding: '0 1px' }}>★</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="pill-btn pill-btn-primary" onClick={handleSave} disabled={!text.trim() || loading} style={{ flex: 1 }}>
                {loading ? 'Saving…' : 'Save remedy'}
              </button>
              <button className="pill-btn pill-btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function TriagePage() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [remedyTarget, setRemedyTarget] = useState(null)
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.getTriageCards(USER_ID)
      .then(data => setCards(data.cards || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const seeDoctorCards = cards.filter(c => c.badge === 'talk-to-doctor')
  const watchCards     = cards.filter(c => c.badge === 'watch')
  const routineCards   = cards.filter(c => c.badge === 'routine')

  const renderCard = (card, isAlert = false) => {
    const b = BADGE_CONFIG[card.badge] || BADGE_CONFIG.watch
    const shapeClass = isAlert ? 'triage-card triage-card--alert' : 'triage-card triage-card--remedy'
    return (
      <article key={card.log_id} className={shapeClass} style={{ marginBottom: '0.7rem' }} aria-label={`${b.label}: ${card.symptom_summary}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, margin: 0, flex: 1, color: 'var(--color-ink)' }}>{card.symptom_summary}</h3>
          <span className={`badge ${b.cls}`} style={{ flexShrink: 0 }}>{b.label}</span>
        </div>
        <p style={{ fontSize: '0.83rem', color: 'var(--color-ink-soft)', lineHeight: 1.55, marginBottom: '0.75rem' }}>{card.rationale}</p>
        {card.personal_remedies?.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <span className="eyebrow" style={{ marginBottom: 4 }}>WHAT WORKED FOR YOU</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {card.personal_remedies.map((r, i) => <span key={i} className="tag"><Star size={9} aria-hidden /> {r}</span>)}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="pill-btn" style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
            onClick={() => setRemedyTarget(card.symptom_summary.split(',')[0]?.trim())}>
            <Plus size={12} aria-hidden /> Log a remedy
          </button>
          {card.see_doctor && (
            <button className="pill-btn" style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', color: 'var(--color-primary)' }}
              onClick={() => navigate('/resources')}>
              See care options <ChevronRight size={12} aria-hidden />
            </button>
          )}
        </div>
      </article>
    )
  }

  return (
    <div className="page-outer">
      <span className="eyebrow">TRIAGE</span>
      <h1 className="section-heading">
        What your body's been <span className="accent">telling you.</span>
      </h1>
      <p className="body-soft" style={{ maxWidth: 480, marginBottom: '2rem' }}>
        Based on your logged entries. Not a diagnosis — a starting point for awareness.
      </p>

        {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <p className="state-label" style={{ marginBottom: '0.5rem' }}>Listening to what you've logged…</p>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 18 }} />)}
        </div>
      )}

      {!loading && cards.length === 0 && (
        <p style={{ color: 'var(--color-ink-soft)', fontStyle: 'italic' }}>
          No triage cards yet — start by logging how you feel on the Log page.
        </p>
      )}

      {seeDoctorCards.length > 0 && (
        <section style={{ marginBottom: '1.5rem' }} aria-label="Talk to a doctor">
          <span className="eyebrow">TALK TO A DOCTOR</span>
          <div style={{ marginTop: '0.5rem' }}>{seeDoctorCards.map(c => renderCard(c, true))}</div>
        </section>
      )}
      {watchCards.length > 0 && (
        <section style={{ marginBottom: '1.5rem' }} aria-label="Keep an eye on it">
          <span className="eyebrow">KEEP AN EYE ON IT</span>
          <div style={{ marginTop: '0.5rem' }}>{watchCards.map(c => renderCard(c, false))}</div>
        </section>
      )}
      {routineCards.length > 0 && (
        <section style={{ marginBottom: '1.5rem' }} aria-label="Routine">
          <span className="eyebrow">ROUTINE</span>
          <div style={{ marginTop: '0.5rem' }}>{routineCards.map(c => renderCard(c, false))}</div>
        </section>
      )}

      <div className="note-banner" role="note" style={{ marginTop: '1rem' }}>
        <strong>NOTE</strong>
        This app provides general wellness information and symptom tracking. It is not a substitute for professional medical advice, diagnosis, or treatment. In an emergency, contact local emergency services.
      </div>

      {remedyTarget && <RemedyModal symptom={remedyTarget} onClose={() => { setRemedyTarget(null); setToast({ message: 'Remedy saved', type: 'success' }) }} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

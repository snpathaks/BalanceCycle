/**
 * LogPage — matches the reference site design exactly.
 * Large Fraunces heading, full-width borderless textarea card,
 * "voice" pill (left) + "read this" pill (right), note banner,
 * and reverse-chron feed of entries.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Mic, Square } from 'lucide-react'
import { api } from '../hooks/useApi'
import ParsedCard from '../components/ParsedCard'
import Toast from '../components/ui/Toast'
import { useSpeech } from '../hooks/useSpeech'
import { scheduleNudge } from '../lib/notifications'

const USER_ID = 'local'

const SEV_STYLE = {
  mild:     { bg: 'var(--color-blood-soft)',       color: 'var(--color-blood)'      },
  moderate: { bg: 'rgba(245, 180, 135, 0.35)',     color: 'var(--color-blood-deep)' },
  severe:   { bg: 'var(--color-blood)',            color: 'white'                   },
}

function formatEntryDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return `Today · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getTodayLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  }).toUpperCase()
}

export default function LogPage() {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [prediction, setPrediction] = useState(null)
  const [toast, setToast] = useState(null)
  const textareaRef = useRef(null)

  const { listening, supported: voiceSupported, start: startVoice, stop: stopVoice } = useSpeech(
    useCallback((t) => setText(t), [])
  )

  useEffect(() => {
    Promise.all([
      api.getLogs(USER_ID, 0, 20),
      api.predictCycle(USER_ID).catch(() => null),
    ]).then(([logsData, pred]) => {
      setLogs(logsData?.items || [])
      setPrediction(pred)
      const lastLog = logsData?.items?.[0]?.created_at
      scheduleNudge(lastLog)
    }).catch(console.error)
      .finally(() => setLogsLoading(false))
  }, [])

  const handleSubmit = async () => {
    if (!text.trim() || parsing) return
    setParsing(true)
    try {
      const result = await api.logSymptom(text, USER_ID)
      setParsed({
        summary: result.extracted_symptoms?.map(s => s.symptom_name).join(', ') || '',
        severity: result.severity,
        symptoms: result.extracted_symptoms || [],
        _logId: result.id,
      })
      setLogs(prev => [result, ...prev])
    } catch (err) {
      setToast({ message: `Couldn't save: ${err.message}`, type: 'error' })
    } finally {
      setParsing(false)
    }
  }

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
  }

  const handleConfirm = () => {
    setParsed(null)
    setText('')
    setToast({ message: 'Entry saved', type: 'success' })
    textareaRef.current?.focus()
  }

  // Cycle countdown strip
  const countdownStr = prediction?.days_until_next_period != null
    ? `Next period in ${prediction.days_until_next_period} day${prediction.days_until_next_period !== 1 ? 's' : ''}`
    : null

  return (
    <div className="page-outer">
      {/* Date eyebrow */}
      <span className="eyebrow">TODAY, {getTodayLabel()}</span>

      {/* Hero heading */}
      <h1 className="display-heading">
        Tell it how <span className="accent">you feel.</span>
      </h1>

      {/* Subtitle */}
      <p className="body-soft" style={{ maxWidth: 520, marginBottom: '2rem' }}>
        Free-form. Just type. A local model reads it, extracts a symptom,
        and gives you an editable confirmation before anything is saved.
      </p>

      {/* Cycle countdown */}
      {countdownStr && (
        <div className="cycle-pill">
          {countdownStr.toUpperCase()}
          {prediction.fertile_window_start && (
            <span style={{ color: 'var(--color-ink-soft)', marginLeft: '0.5rem' }}>
              · FERTILE {prediction.fertile_window_start}
            </span>
          )}
        </div>
      )}

      {/* Note banner */}
      <div className="note-banner" role="note">
        <strong>NOTE</strong>
        This app provides general wellness information and symptom tracking.
        It is not a substitute for professional medical advice, diagnosis, or treatment.
        In an emergency, contact local emergency services.
      </div>

      {/* Input card or parsed card */}
      {parsed ? (
        <ParsedCard
          parsed={parsed}
          onConfirm={handleConfirm}
          onDiscard={() => { setParsed(null) }}
          loading={false}
        />
      ) : (
        <div className="log-card">
          <textarea
            ref={textareaRef}
            id="symptom-input"
            className="log-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. 'sharp lower-back cramp since morning, maybe a 4 out of 5, and my mood is weepy'"
            aria-label="Describe how you're feeling"
            rows={5}
          />
          <div className="log-actions">
            {/* Voice button */}
            {voiceSupported ? (
              <button
                type="button"
                id="voice-btn"
                className="pill-btn"
                onClick={listening ? stopVoice : startVoice}
                aria-pressed={listening}
                aria-label={listening ? 'Stop voice input' : 'Start voice input'}
                style={{
                  background: listening ? 'var(--color-blood-soft)' : 'var(--color-cream-deep)',
                  color: listening ? 'var(--color-blood)' : 'var(--color-ink-soft)',
                  position: 'relative',
                }}
              >
                {listening && (
                  <span style={{
                    position: 'absolute', inset: 0, borderRadius: 9999,
                    background: 'var(--color-blood)', opacity: 0.12,
                    animation: 'pulse 1.2s ease infinite',
                  }} />
                )}
                <style>{`
                  @keyframes pulse {
                    0%,100% { transform: scale(1); opacity: 0.12; }
                    50%      { transform: scale(1.4); opacity: 0; }
                  }
                `}</style>
                {listening ? <Square size={14} aria-hidden /> : <Mic size={14} aria-hidden />}
                voice
              </button>
            ) : <span />}

            {/* Submit button */}
            <button
              id="submit-btn"
              className="pill-btn pill-btn-primary"
              onClick={handleSubmit}
              disabled={!text.trim() || parsing}
              aria-busy={parsing}
            >
              <Send size={14} aria-hidden />
              {parsing ? 'reading…' : 'read this'}
            </button>
          </div>
        </div>
      )}

      {/* Recent entries feed */}
      {(logs.length > 0 || logsLoading) && (
        <section style={{ marginTop: '3rem' }} aria-label="Recent entries">
          <span className="eyebrow" style={{ marginBottom: '1rem' }}>RECENT ENTRIES</span>

          {logsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              <p className="state-label" style={{ marginBottom: '0.5rem' }}>Reading your body's signals…</p>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16 }} />
              ))}
            </div>
          ) : (
            <div role="feed" aria-label="Symptom log feed" style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {logs.map(log => {
                const sev = log.severity || 'moderate'
                const sevStyle = SEV_STYLE[sev] || SEV_STYLE.moderate
                const symptoms = log.extracted_symptoms || []
                return (
                  <article key={log.id} className="feed-card" aria-label={`Entry: ${log.raw_text.slice(0, 60)}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.4rem' }}>
                      <time dateTime={log.created_at} className="eyebrow" style={{ marginBottom: 0 }}>
                        {formatEntryDate(log.created_at)}
                      </time>
                      <span className={`badge badge-${sev}`}>{sev}</span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-ink)', marginBottom: symptoms.length ? '0.5rem' : 0 }}>
                      {log.raw_text}
                    </p>
                    {symptoms.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {symptoms.map(sym => (
                          <span key={sym.id} className="tag">{sym.symptom_name}</span>
                        ))}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      {logs.length === 0 && !logsLoading && (
        <div style={{ marginTop: '3rem' }}>
          <p className="state-label">Your body's been quiet.</p>
          <p style={{ color: 'var(--color-ink-soft)', fontStyle: 'italic', fontSize: '0.9rem' }}>
            Start by telling it you're here.
          </p>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

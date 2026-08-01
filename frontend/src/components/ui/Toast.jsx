/**
 * Toast — lightweight in-app notification.
 * Usage: <Toast message="Saved" onClose={() => {}} />
 */
import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle } from 'lucide-react'

export default function Toast({ message, type = 'success', onClose, duration = 3500 }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [message, duration, onClose])

  if (!message) return null

  return (
    <div
      className="toast"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {type === 'success'
        ? <CheckCircle size={16} style={{ color: '#6fcf97', flexShrink: 0 }} aria-hidden />
        : <AlertCircle size={16} style={{ color: '#eb5757', flexShrink: 0 }} aria-hidden />}
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
          cursor: 'pointer', padding: 0, flexShrink: 0,
        }}
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  )
}

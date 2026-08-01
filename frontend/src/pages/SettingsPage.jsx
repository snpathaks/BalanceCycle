/**
 * SettingsPage — cycle length override, notifications, export, delete-all.
 */
import { useState } from 'react'
import { useLocalSettings } from '../hooks/useLocalSettings'
import { api } from '../hooks/useApi'
import { exportToPDF } from '../lib/pdfExport'
import { requestPermission } from '../lib/notifications'
import Toast from '../components/ui/Toast'
import { Download, Trash2, Bell, BellOff } from 'lucide-react'

const USER_ID = 'local'

export default function SettingsPage() {
  const { settings, update } = useLocalSettings()
  const [toast, setToast] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleCycleLengthChange = (e) => {
    const val = parseInt(e.target.value, 10)
    update({ cycleLengthOverride: isNaN(val) ? null : Math.max(21, Math.min(40, val)) })
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await api.getExportData(USER_ID)
      await exportToPDF(data)
      setToast({ message: 'PDF downloaded', type: 'success' })
    } catch (err) {
      setToast({ message: `Export failed: ${err.message}`, type: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const handleNotifications = async () => {
    if (settings.notificationsEnabled) {
      update({ notificationsEnabled: false })
      setToast({ message: 'Daily nudge turned off', type: 'success' })
      return
    }
    const perm = await requestPermission()
    if (perm === 'granted') {
      update({ notificationsEnabled: true })
      setToast({ message: 'Daily nudge enabled — we\'ll remind you at 8 pm', type: 'success' })
    } else if (perm === 'unsupported') {
      setToast({ message: 'Notifications not supported in this browser', type: 'error' })
    } else {
      setToast({ message: 'Permission denied — enable notifications in browser settings', type: 'error' })
    }
  }

  const handleDeleteAll = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      await api.deleteAllData(USER_ID)
      setConfirmDelete(false)
      setToast({ message: 'All data deleted', type: 'success' })
    } catch (err) {
      setToast({ message: `Delete failed: ${err.message}`, type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page-outer">
      <header style={{ marginBottom: '2rem' }}>
        <p className="eyebrow" style={{ marginBottom: '0.3rem' }}>Settings</p>
        <h1
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 4vw, 2rem)', marginBottom: '0.25rem' }}
        >
          Your preferences
        </h1>
        <p style={{ color: 'var(--color-ink-soft)', fontSize: '0.9rem' }}>
          Your data stays on this device. No accounts, no cloud sync.
        </p>
      </header>

      {/* Cycle length override */}
      <section className="card" style={{ marginBottom: '1rem' }}>
        <p className="eyebrow" style={{ marginBottom: '0.3rem' }}>Cycle length</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
          Override the automatically calculated cycle length. Leave blank to use your logged average.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            id="cycle-length-input"
            type="number"
            min={21}
            max={40}
            value={settings.cycleLengthOverride ?? ''}
            onChange={handleCycleLengthChange}
            placeholder="Auto (21–40 days)"
            aria-label="Cycle length in days"
            style={{ maxWidth: 160 }}
          />
          {settings.cycleLengthOverride && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              onClick={() => update({ cycleLengthOverride: null })}
            >
              Reset to auto
            </button>
          )}
        </div>
      </section>

      {/* Notifications */}
      <section className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <p style={{ fontWeight: 600, marginBottom: 2 }}>Daily check-in nudge</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-ink-soft)', lineHeight: 1.5 }}>
              Opt-in local reminder at 8 pm if no entry logged today. No push server — stays on your device.
            </p>
          </div>
          <button
            id="toggle-notifications-btn"
            className={`btn ${settings.notificationsEnabled ? 'btn-primary' : 'btn-ghost'}`}
            onClick={handleNotifications}
            aria-pressed={settings.notificationsEnabled}
            style={{ flexShrink: 0 }}
          >
            {settings.notificationsEnabled ? (
              <><Bell size={15} aria-hidden /> On</>
            ) : (
              <><BellOff size={15} aria-hidden /> Off</>
            )}
          </button>
        </div>
      </section>

      {/* Export */}
      <section className="card" style={{ marginBottom: '1rem' }}>
        <p style={{ fontWeight: 600, marginBottom: 2 }}>Export for your doctor</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--color-ink-soft)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
          Generate a formatted PDF summary of your last 3 cycles' data — handy for appointments.
          Built entirely in your browser; no data is sent anywhere.
        </p>
        <button
          id="export-pdf-btn"
          className="btn btn-primary"
          onClick={handleExport}
          disabled={exporting}
          aria-busy={exporting}
        >
          <Download size={15} aria-hidden />
          {exporting ? 'Generating…' : 'Download PDF'}
        </button>
      </section>

      {/* Delete all */}
      <section
        className="card"
        style={{ marginBottom: '1.5rem', borderColor: confirmDelete ? 'var(--color-blood)' : 'var(--color-hairline)' }}
      >
        <p style={{ fontWeight: 700, marginBottom: 2, color: 'var(--color-blood)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Delete all data</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--color-ink-soft)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
          Permanently removes all symptom logs, cycle records, and remedy journal entries. This cannot be undone.
        </p>
        {confirmDelete && (
          <p
            style={{
              background: 'var(--color-blood-soft)',
              borderRadius: 8,
              padding: '0.6rem 0.8rem',
              fontSize: '0.85rem',
              color: 'var(--color-blood)',
              marginBottom: '0.75rem',
              fontWeight: 500,
            }}
            role="alert"
          >
            Are you sure? This is permanent and irreversible.
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            id="delete-all-btn"
            className="btn btn-danger"
            onClick={handleDeleteAll}
            disabled={deleting}
            aria-busy={deleting}
          >
            <Trash2 size={15} aria-hidden />
            {deleting ? 'Deleting…' : confirmDelete ? 'Yes, delete everything' : 'Delete all data'}
          </button>
          {confirmDelete && (
            <button
              className="btn btn-ghost"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      <p className="disclaimer">
        BalanceCycle stores all your data locally in a self-hosted PostgreSQL database.
        No data is sent to third-party AI services or analytics platforms.
      </p>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

/**
 * VoiceInput — mic button using Web Speech API.
 * Shows pulsing animation while listening.
 */
import { Mic, MicOff, Square } from 'lucide-react'
import { useSpeech } from '../hooks/useSpeech'

export default function VoiceInput({ onTranscript }) {
  const { listening, supported, start, stop } = useSpeech((text) => {
    onTranscript(text)
  })

  if (!supported) return null

  return (
    <button
      type="button"
      id="voice-input-btn"
      onClick={listening ? stop : start}
      className="btn"
      aria-label={listening ? 'Stop voice input' : 'Start voice input'}
      aria-pressed={listening}
      style={{
        padding: '0.55rem',
        borderRadius: '50%',
        background: listening ? 'var(--color-primary)' : 'var(--color-lightest)',
        color: listening ? 'white' : 'var(--color-primary)',
        border: 'none',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {listening ? (
        <>
          <span
            style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              background: 'var(--color-primary)',
              opacity: 0.3,
              animation: 'pulse 1.2s ease-in-out infinite',
            }}
          />
          <style>{`
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 0.3; }
              50%       { transform: scale(1.5); opacity: 0; }
            }
          `}</style>
          <Square size={18} aria-hidden />
        </>
      ) : (
        <Mic size={18} aria-hidden />
      )}
    </button>
  )
}

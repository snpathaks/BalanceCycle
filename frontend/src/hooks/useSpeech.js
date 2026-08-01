/**
 * Web Speech API hook for voice-to-text input.
 * Returns { transcript, listening, supported, start, stop, reset }.
 */
import { useState, useRef, useCallback } from 'react'

export function useSpeech(onResult) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)

  const supported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const start = useCallback(() => {
    if (!supported) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(' ')
      setTranscript(text)
      if (onResult) onResult(text)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)

    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }, [supported, onResult])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const reset = useCallback(() => {
    stop()
    setTranscript('')
  }, [stop])

  return { transcript, listening, supported, start, stop, reset }
}

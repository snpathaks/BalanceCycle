/**
 * Local settings persisted in localStorage.
 * Stores: cycleLengthOverride, notificationsEnabled, userId.
 */
import { useState, useCallback } from 'react'

const STORAGE_KEY = 'bc_settings'

const defaults = {
  userId: 'local',
  cycleLengthOverride: null,  // null = use calculated average
  notificationsEnabled: false,
  theme: 'light',
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults }
  } catch {
    return { ...defaults }
  }
}

function save(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage unavailable — fail silently
  }
}

export function useLocalSettings() {
  const [settings, setSettings] = useState(load)

  const update = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      save(next)
      return next
    })
  }, [])

  return { settings, update }
}

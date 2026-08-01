/**
 * Lightweight API hook wrapping fetch.
 * Base URL is inferred from the Vite proxy (/api → http://localhost:8000).
 */

const BASE = '/api'

export async function apiFetch(path, options = {}) {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `API error ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Symptoms
  logSymptom: (text, userId = 'local') =>
    apiFetch('/log-symptom', { method: 'POST', body: { raw_text: text, user_id: userId } }),

  getLogs: (userId = 'local', skip = 0, limit = 20) =>
    apiFetch(`/logs?user_id=${userId}&skip=${skip}&limit=${limit}`),

  getLog: (id) => apiFetch(`/logs/${id}`),

  // Cycles
  logCycle: (payload) => apiFetch('/cycles', { method: 'POST', body: payload }),
  updateCycle: (id, payload) => apiFetch(`/cycles/${id}`, { method: 'PATCH', body: payload }),
  getCycles: (userId = 'local') => apiFetch(`/cycles?user_id=${userId}`),
  predictCycle: (userId = 'local') => apiFetch(`/cycles/predict?user_id=${userId}`),
  getCycleWheel: (userId = 'local') => apiFetch(`/cycles/wheel?user_id=${userId}`),

  // Trends
  getTrendsBars: (userId = 'local', category = null, weeks = 8) => {
    const cat = category ? `&category=${category}` : ''
    return apiFetch(`/trends/bars?user_id=${userId}${cat}&weeks=${weeks}`)
  },
  getTrendsSummary: (userId = 'local') => apiFetch(`/trends/summary?user_id=${userId}`),

  // Triage
  getTriageCards: (userId = 'local') => apiFetch(`/triage/cards?user_id=${userId}`),

  // Remedies
  logRemedy: (payload) => apiFetch('/remedies', { method: 'POST', body: payload }),
  getRemedies: (userId = 'local', symptom = null) => {
    const s = symptom ? `&symptom=${encodeURIComponent(symptom)}` : ''
    return apiFetch(`/remedies?user_id=${userId}${s}`)
  },
  deleteRemedy: (id, userId = 'local') =>
    apiFetch(`/remedies/${id}?user_id=${userId}`, { method: 'DELETE' }),

  // Export
  getExportData: (userId = 'local') => apiFetch(`/export/data?user_id=${userId}`),

  // Settings
  deleteAllData: (userId = 'local') =>
    apiFetch(`/user-data?user_id=${userId}`, { method: 'DELETE' }),
}

/**
 * Minimal date helpers (no date-fns dependency needed).
 */
export function isToday(date) {
  const now = new Date()
  return date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
}

export function isYesterday(date) {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
}

export function format(date) {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatShort(date) {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

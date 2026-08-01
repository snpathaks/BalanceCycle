/**
 * Local notification nudge using the Notifications API.
 * Only fires if: 1) user opted in, 2) no entry logged today.
 * No push server — purely local/browser.
 */

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result
}

export function scheduleNudge(lastLogDate) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const today = new Date().toDateString()
  const lastLog = lastLogDate ? new Date(lastLogDate).toDateString() : null

  if (lastLog === today) return  // already logged today

  // Schedule nudge for 8pm local time if not already logged
  const now = new Date()
  const target = new Date(now)
  target.setHours(20, 0, 0, 0)

  if (now > target) return  // already past 8pm

  const delay = target - now
  setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification('BalanceCycle', {
        body: "Nothing logged yet today — how's your body feeling right now?",
        icon: '/favicon.svg',
        tag: 'daily-nudge',
        renotify: false,
      })
    }
  }, delay)
}

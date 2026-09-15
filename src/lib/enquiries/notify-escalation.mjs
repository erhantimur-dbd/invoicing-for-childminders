export function shouldSendEscalationEmail(lastSentAt, now = Date.now()) {
  if (!lastSentAt) return true
  const t = new Date(lastSentAt).getTime()
  if (Number.isNaN(t)) return true
  return now - t >= 15 * 60 * 1000
}

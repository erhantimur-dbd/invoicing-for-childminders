export function assertCanSendPlaceOffer(prospect) {
  const email = String(prospect?.parent_email || '').trim()
  if (!email || !email.includes('@')) {
    const err = new Error('Add the parent email before sending a signup form.')
    err.code = 'missing_email'
    throw err
  }
  return email
}

export function closeLostPatch(lostReason) {
  return {
    stage: 'lost',
    lost_reason: String(lostReason || 'No interest').trim() || 'No interest',
    visit_at: null,
    updated_at: new Date().toISOString(),
  }
}

export function closeWonPatch() {
  return {
    stage: 'accepted',
    onboarding_sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

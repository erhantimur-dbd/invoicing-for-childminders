export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'number', label: 'One number', test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character', test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(p) },
]

export function passwordRequirements(password) {
  return PASSWORD_RULES.map((r) => ({ id: r.id, label: r.label, met: r.test(password || '') }))
}

export function passwordScore(password) {
  return passwordRequirements(password).filter((r) => r.met).length
}

export function passwordIsStrong(password) {
  return PASSWORD_RULES.every((r) => r.test(password || ''))
}

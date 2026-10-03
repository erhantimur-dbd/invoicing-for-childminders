export type PasswordRequirement = {
  label: string
  met: boolean
}

const SPECIAL_CHARACTER = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/

export type PasswordCheck = {
  score: number
  requirements: PasswordRequirement[]
  meetsAll: boolean
}

/**
 * Single password policy for the strength meter and signup.
 * Score is the number of checklist requirements met (0–4), so the meter
 * and the submit gate cannot drift apart.
 */
export function checkPassword(password: string): PasswordCheck {
  const requirements: PasswordRequirement[] = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: SPECIAL_CHARACTER.test(password) },
  ]
  const score = password ? requirements.filter((requirement) => requirement.met).length : 0

  return {
    score,
    requirements,
    meetsAll: requirements.every((requirement) => requirement.met),
  }
}

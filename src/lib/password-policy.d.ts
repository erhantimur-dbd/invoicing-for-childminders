export const PASSWORD_RULES: {
  id: string
  label: string
  test: (p: string) => boolean
}[]

export function passwordRequirements(password: string): {
  id: string
  label: string
  met: boolean
}[]

export function passwordScore(password: string): number

export function passwordIsStrong(password: string): boolean

type Props = {
  password: string
}

export function getScore(password: string): number {
  if (!password) return 0
  let score = 0
  if (password.length >= 10) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) score += 1
  return score
}

type StrengthLevel = {
  bars: number
  colour: string
  label: string
}

function getStrengthLevel(score: number): StrengthLevel | null {
  if (score === 0) return null
  if (score === 1) return { bars: 1, colour: 'bg-red-500', label: 'Weak' }
  if (score === 2) return { bars: 2, colour: 'bg-orange-400', label: 'Fair' }
  if (score === 3) return { bars: 3, colour: 'bg-yellow-400', label: 'Good' }
  return { bars: 4, colour: 'bg-emerald-500', label: 'Strong' }
}

export default function PasswordStrength({ password }: Props) {
  const score = getScore(password)
  const level = getStrengthLevel(score)

  if (!level) return null

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < level.bars ? level.colour : 'bg-gray-200'
            }`}
          />
        ))}
        <span className={`text-xs font-semibold ml-1 leading-none self-center transition-colors duration-300 ${
          score === 1 ? 'text-red-500' :
          score === 2 ? 'text-orange-400' :
          score === 3 ? 'text-yellow-500' :
          'text-emerald-600'
        }`}>
          {level.label}
        </span>
      </div>
    </div>
  )
}

/**
 * Minimal structured logger.
 *
 * Why not pino/winston: keeps deps to zero. Vercel and most log shippers parse
 * single-line JSON natively, which is all this writes.
 *
 * Why not @sentry/nextjs hard-installed: invasive setup (instrumentation.ts,
 * sentry config files, build-time bundling), and Next 16 / React Compiler
 * compatibility is in flux. Instead, we ship a soft Sentry hook: if you
 * install @sentry/nextjs and call `attachSentry(Sentry)` from a top-level
 * module, errors will fan out. Until then this is a no-op extension point.
 *
 * Conventions:
 *   - First arg is a short snake_case `event` name (greppable).
 *   - Second arg is a flat object of fields. Avoid nesting deeper than 1 level.
 *   - Use `log.error` for things you'd want paged on; `log.warn` for things
 *     worth investigating but expected; `log.info` for state transitions.
 */

type Fields = Record<string, unknown>

interface SentryLike {
  captureException: (err: unknown, ctx?: { extra?: Fields; tags?: Record<string, string> }) => void
  captureMessage: (msg: string, ctx?: { level?: 'info' | 'warning' | 'error'; extra?: Fields }) => void
}

let sentry: SentryLike | null = null

export function attachSentry(s: SentryLike) {
  sentry = s
}

function emit(level: 'info' | 'warn' | 'error', event: string, fields: Fields = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  }
  // Single-line JSON; Vercel parses this for free.
  const line = JSON.stringify(payload, replacer)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

// Errors don't serialize cleanly via JSON.stringify by default.
function replacer(_key: string, value: unknown) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...(value as Error & { code?: string }).code ? { code: (value as Error & { code?: string }).code } : {},
    }
  }
  return value
}

export const log = {
  info(event: string, fields?: Fields) {
    emit('info', event, fields)
  },
  warn(event: string, fields?: Fields) {
    emit('warn', event, fields)
    if (sentry) sentry.captureMessage(event, { level: 'warning', extra: fields })
  },
  error(event: string, err: unknown, fields?: Fields) {
    emit('error', event, { ...fields, error: err })
    if (sentry) sentry.captureException(err, { extra: { event, ...fields } })
  },
}

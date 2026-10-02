import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const srcRoot = new URL('../', import.meta.url)

async function withExtension(href, context, nextResolve) {
  try {
    return await nextResolve(href, context)
  } catch (err) {
    if (!err || err.code !== 'ERR_MODULE_NOT_FOUND') throw err
    const base = new URL(href)
    for (const ext of ['.ts', '.tsx', '.mjs', '.js']) {
      const candidate = new URL(`${base.pathname}${ext}`, base)
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context)
    }
    throw err
  }
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    return withExtension(new URL(specifier.slice(2), srcRoot).href, context, nextResolve)
  }
  if (
    (specifier.startsWith('./') || specifier.startsWith('../'))
    && !/\.(ts|tsx|mjs|js|json|css)$/.test(specifier)
  ) {
    const parent = context.parentURL ? new URL(specifier, context.parentURL).href : specifier
    return withExtension(parent, context, nextResolve)
  }
  return nextResolve(specifier, context)
}

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DEFAULT_ENQUIRY_AGENTS_POLICY = {
  learning: true,
  require_approval: true,
  auto_apply_safe: false,
  learn_from: ['unanswered_question'],
  never_learn: ['extra_needs', 'sen_notes', 'funded_not_accepted', 'age_outside'],
  max_pending_per_account: 20,
  safe_topics: ['pets', 'school_run', 'food'],
}

function parseBool(value, fallback) {
  if (value === true || value === 'true' || value === 'on' || value === 'yes') return true
  if (value === false || value === 'false' || value === 'off' || value === 'no') return false
  return fallback
}

function parseFrontmatter(body) {
  const scalars = {}
  const lists = {}
  let currentList = null
  for (const raw of body.split(/\r?\n/)) {
    const listItem = raw.match(/^\s+-\s+(.+)$/)
    if (listItem && currentList) {
      lists[currentList].push(listItem[1].trim())
      continue
    }
    const line = raw.match(/^([a-z_]+):\s*(.*)$/)
    if (!line) {
      currentList = null
      continue
    }
    const key = line[1]
    const val = line[2].trim()
    if (val === '') {
      currentList = key
      lists[key] = []
    } else {
      currentList = null
      scalars[key] = val
    }
  }
  return { scalars, lists }
}

export function parseEnquiryAgentsPolicy(markdown) {
  const text = String(markdown || '')
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  const policy = {
    ...DEFAULT_ENQUIRY_AGENTS_POLICY,
    learn_from: [...DEFAULT_ENQUIRY_AGENTS_POLICY.learn_from],
    never_learn: [...DEFAULT_ENQUIRY_AGENTS_POLICY.never_learn],
    safe_topics: [...DEFAULT_ENQUIRY_AGENTS_POLICY.safe_topics],
  }
  if (!match) return policy
  const { scalars, lists } = parseFrontmatter(match[1])
  if (scalars.learning != null) policy.learning = parseBool(scalars.learning, policy.learning)
  if (scalars.require_approval != null) policy.require_approval = parseBool(scalars.require_approval, policy.require_approval)
  if (scalars.auto_apply_safe != null) policy.auto_apply_safe = parseBool(scalars.auto_apply_safe, policy.auto_apply_safe)
  if (lists.learn_from?.length) policy.learn_from = lists.learn_from
  if (lists.never_learn?.length) {
    policy.never_learn = [...new Set([...lists.never_learn, 'extra_needs', 'sen_notes'])]
  }
  if (scalars.max_pending_per_account) {
    const n = Number(scalars.max_pending_per_account)
    if (Number.isFinite(n) && n > 0) policy.max_pending_per_account = n
  }
  if (lists.safe_topics?.length) policy.safe_topics = lists.safe_topics
  return policy
}

export function loadEnquiryAgentsPolicy() {
  try {
    const md = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'AGENTS.md'), 'utf8')
    return parseEnquiryAgentsPolicy(md)
  } catch {
    return { ...DEFAULT_ENQUIRY_AGENTS_POLICY }
  }
}

export function mayLearnFromReasons(policy, reasons) {
  if (!policy.learning) return false
  const set = reasons || []
  if (set.some((r) => policy.never_learn.includes(r))) return false
  return set.some((r) => policy.learn_from.includes(r))
}

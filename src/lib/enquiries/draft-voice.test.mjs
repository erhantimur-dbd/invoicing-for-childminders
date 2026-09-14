import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const grok = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'grok.ts'), 'utf8')

test('enquiry drafts sign as the childminder and only offer computed visit slots', () => {
  assert.match(grok, /nextVisitSlots/)
  assert.match(grok, /Next visit slots/)
  assert.match(grok, /Sign off as \$\{name\} only/)
  assert.doesNotMatch(grok, /Sign off as \$\{name\}'s assistant/)
  assert.doesNotMatch(grok, /You are \$\{name\}'s assistant/)
  assert.match(grok, /Never invent .*calendar dates/)
})

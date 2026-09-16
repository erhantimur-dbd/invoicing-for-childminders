import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const grok = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'grok.ts'), 'utf8')

test('enquiry drafts assemble the letter in code, AI only extracts leftover facts', () => {
  assert.match(grok, /assembleEnquiryLetter/)
  assert.match(grok, /extractFactsFromText/)
  assert.match(grok, /enquiry_extract/)
  assert.doesNotMatch(grok, /knowledgeLines/)
  assert.doesNotMatch(grok, /You are \$\{name\}'s assistant/)
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('sync-enquiries cron', () => {
  const route = readFileSync(join(root, 'app/api/cron/sync-enquiries/route.ts'), 'utf8')
  const auto = readFileSync(join(root, 'lib/enquiries/auto-reply.ts'), 'utf8')
  const sync = readFileSync(join(root, 'lib/enquiries/gmail/sync.ts'), 'utf8')

  it('skips Gmail reads unless enquiries_status is active', () => {
    assert.match(route, /enquiriesActive/)
    assert.match(route, /enquiries_status/)
    assert.match(route, /skipped: 'inactive'/)
    const inactive = route.indexOf("skipped: 'inactive'")
    const syncCall = route.indexOf('await syncEnquiryGmail')
    assert.ok(inactive > -1 && syncCall > inactive)
  })

  it('auto-sends only mail received after connected_at', () => {
    const gate = auto.indexOf('receivedAfterConnect(item.receivedAt')
    const hold = auto.indexOf('resolveAutoSendDecision({')
    const send = auto.lastIndexOf("via: 'auto'")
    assert.ok(gate > -1 && hold > gate && send > hold)
    assert.match(sync, /receivedAfterConnect\(receivedAt, account\.connected_at\)/)
    assert.match(sync, /autoInbound\.push/)
    assert.match(sync, /'historical'/)
  })
})

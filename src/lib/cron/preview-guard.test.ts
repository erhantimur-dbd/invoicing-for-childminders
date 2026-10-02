import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { markOverdueInvoices } from './overdue.ts'
import { sendDueReminders } from './reminders.ts'

type Filter = [string, unknown[]]

function recordingClient() {
  const calls: { table: string; filters: Filter[] }[] = []
  function builder(table: string) {
    const filters: Filter[] = []
    calls.push({ table, filters })
    const api = {
      update() { return api },
      select() { return api },
      eq(...args: unknown[]) { filters.push(['eq', args]); return api },
      not(...args: unknown[]) { filters.push(['not', args]); return api },
      lt(...args: unknown[]) { filters.push(['lt', args]); return api },
      lte(...args: unknown[]) { filters.push(['lte', args]); return api },
      in(...args: unknown[]) { filters.push(['in', args]); return api },
      limit() { return api },
      then(resolve: (value: unknown) => void) {
        resolve({ data: [], error: null })
      },
    }
    return api
  }
  return {
    calls,
    client: { from: (table: string) => builder(table) } as unknown as SupabaseClient,
  }
}

describe('cron queries outside Production', () => {
  it('filters overdue updates and reminders by the allowlist', async () => {
    const env = { VERCEL_ENV: 'preview', CRON_USER_ALLOWLIST: 'cm-1, cm-2' }
    const overdue = recordingClient()
    const reminders = recordingClient()

    assert.deepEqual(await markOverdueInvoices(overdue.client, env), { marked: 0 })
    assert.deepEqual(await sendDueReminders(reminders.client, env), { sent: 0, deactivated: 0, failed: 0 })

    assert.deepEqual(overdue.calls[0].filters.find(([method]) => method === 'in'), ['in', ['childminder_id', ['cm-1', 'cm-2']]])
    assert.equal(overdue.calls[0].table, 'invoices')
    assert.deepEqual(reminders.calls[0].filters.find(([method]) => method === 'in'), ['in', ['childminder_id', ['cm-1', 'cm-2']]])
    assert.equal(reminders.calls[0].table, 'reminders')
  })

  it('does not query when the allowlist is unset', async () => {
    const env = { VERCEL_ENV: 'preview' }
    const overdue = recordingClient()
    const reminders = recordingClient()
    await markOverdueInvoices(overdue.client, env)
    await sendDueReminders(reminders.client, env)
    assert.equal(overdue.calls.length, 0)
    assert.equal(reminders.calls.length, 0)
  })

  it('does not query when the allowlist is empty', async () => {
    const env = { VERCEL_ENV: 'preview', CRON_USER_ALLOWLIST: ' , ' }
    const overdue = recordingClient()
    const reminders = recordingClient()
    await markOverdueInvoices(overdue.client, env)
    await sendDueReminders(reminders.client, env)
    assert.equal(overdue.calls.length, 0)
    assert.equal(reminders.calls.length, 0)
  })

  it('does not filter in Production', async () => {
    const env = { VERCEL_ENV: 'production', CRON_USER_ALLOWLIST: 'cm-1' }
    const overdue = recordingClient()
    const reminders = recordingClient()
    await markOverdueInvoices(overdue.client, env)
    await sendDueReminders(reminders.client, env)
    assert.equal(overdue.calls[0].filters.some(([method]) => method === 'in'), false)
    assert.equal(reminders.calls[0].filters.some(([method]) => method === 'in'), false)
    assert.equal(overdue.calls[0].table, 'invoices')
    assert.equal(reminders.calls[0].table, 'reminders')
  })
})

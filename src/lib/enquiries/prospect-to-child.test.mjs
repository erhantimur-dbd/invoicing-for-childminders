import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import {
  addToInvoicingHref,
  childFormPrefill,
  fundingFromEnquiry,
  hoursPerDayFromText,
  notesFromProspect,
  scheduleDaysFromProspect,
  splitChildName,
} from './prospect-to-child.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (rel) => readFileSync(join(root, rel), 'utf8')

const prospect = {
  id: 'prospect-1',
  parent_name: 'Priya Patel',
  parent_email: 'priya@example.com',
  parent_phone: '07700 900123',
  child_name: 'Emma Patel',
  child_dob: '2023-04-12',
  days_needed: 'Mon–Wed',
  hours_needed: '8am–6pm',
  funding: '3to4_working',
  start_date: '2026-09-07',
  eligibility_code: '50012345678',
  sen_notes: 'Peanut allergy. No other extra needs.',
  notes: null,
  stretched: false,
}

test('splitChildName keeps a single given name and hyphenated surnames', () => {
  assert.deepEqual(splitChildName('Emma Patel'), { first: 'Emma', last: 'Patel' })
  assert.deepEqual(splitChildName('Emma'), { first: 'Emma', last: '' })
  assert.deepEqual(splitChildName('Emma-Jane Patel-Smith'), {
    first: 'Emma-Jane',
    last: 'Patel-Smith',
  })
  assert.deepEqual(splitChildName('  '), { first: '', last: '' })
  assert.deepEqual(splitChildName(null), { first: '', last: '' })
})

test('scheduleDaysFromProspect uses weekday tokens as full days and skips weekends', () => {
  assert.deepEqual(scheduleDaysFromProspect('Mon–Wed'), [
    { day: 'monday', type: 'full' },
    { day: 'tuesday', type: 'full' },
    { day: 'wednesday', type: 'full' },
  ])
  assert.deepEqual(scheduleDaysFromProspect('Tue and Thu'), [
    { day: 'tuesday', type: 'full' },
    { day: 'thursday', type: 'full' },
  ])
  assert.equal(scheduleDaysFromProspect('Saturday only').length, 0)
  assert.deepEqual(scheduleDaysFromProspect(''), [])
})

test('hoursPerDayFromText treats 15/30 hours as weekly funding language, not a day length', () => {
  assert.equal(hoursPerDayFromText('8am–6pm'), 10)
  assert.equal(hoursPerDayFromText('8:00 to 18:00'), 10)
  assert.equal(hoursPerDayFromText('8 hours a day'), 8)
  assert.equal(hoursPerDayFromText('8 hours per day'), 8)
  assert.equal(hoursPerDayFromText('9'), 9)
  assert.equal(hoursPerDayFromText('30 hours'), null)
  assert.equal(hoursPerDayFromText('15 hours government-funded'), null)
  assert.equal(hoursPerDayFromText(''), null)
})

test('fundingFromEnquiry maps entitlement ids and leaves private/unknown unset', () => {
  assert.deepEqual(fundingFromEnquiry('3to4_working'), {
    funding_type: '30',
    funding_scheme: '3to4_working',
  })
  assert.deepEqual(fundingFromEnquiry('3to4_universal'), {
    funding_type: '15',
    funding_scheme: '3to4_universal',
  })
  assert.deepEqual(fundingFromEnquiry('2yo_working'), {
    funding_type: '15',
    funding_scheme: '2yo_working',
  })
  assert.deepEqual(fundingFromEnquiry('private'), { funding_type: 'none', funding_scheme: null })
  assert.deepEqual(fundingFromEnquiry('unknown'), { funding_type: 'none', funding_scheme: null })
  assert.deepEqual(fundingFromEnquiry('tfc'), { funding_type: 'none', funding_scheme: null })
})

test('childFormPrefill copies parent/child fields and never invents rates', () => {
  const form = childFormPrefill(prospect)
  assert.equal(form.first_name, 'Emma')
  assert.equal(form.last_name, 'Patel')
  assert.equal(form.date_of_birth, '2023-04-12')
  assert.equal(form.parent_name, 'Priya Patel')
  assert.equal(form.parent_email, 'priya@example.com')
  assert.equal(form.parent_phone, '07700 900123')
  assert.equal(form.daily_rate, 0)
  assert.equal(form.half_day_rate, null)
  assert.equal(form.hourly_rate, null)
  assert.equal(form.hours_per_day, 10)
  assert.equal(form.funding_type, '30')
  assert.equal(form.funding_scheme, '3to4_working')
  assert.equal(form.funded_hours_per_day, 10)
  assert.deepEqual(form.funded_days, ['monday', 'tuesday', 'wednesday'])
  assert.equal(form.enquiry_prospect_id, 'prospect-1')
  assert.match(form.notes, /Peanut allergy/)
  assert.match(form.notes, /Start date: 2026-09-07/)
  assert.match(form.notes, /Eligibility code: 50012345678/)
  assert.doesNotMatch(form.notes, /Hours requested/)
})

test('SEN and unparseable hours stay on notes; Tax-Free Childcare is not a scheme', () => {
  const notes = notesFromProspect({
    sen_notes: 'ADHD medication at lunch.',
    hours_needed: '30 hours',
    funding: 'tfc',
    days_needed: 'some weekdays',
  })
  assert.match(notes, /ADHD medication/)
  assert.match(notes, /Hours requested: 30 hours/)
  assert.match(notes, /Tax-Free Childcare/)
  assert.match(notes, /Days requested: some weekdays/)
})

test('addToInvoicingHref goes to ChildForm when invoicing is on, else subscribe with return path', () => {
  assert.equal(
    addToInvoicingHref({ invoicingActive: true, prospectId: 'p1' }),
    '/children/new?from=prospect&id=p1',
  )
  const subscribe = addToInvoicingHref({ invoicingActive: false, prospectId: 'p1' })
  assert.match(subscribe, /^\/subscribe\?product=invoicing&next=/)
  assert.match(decodeURIComponent(subscribe), /\/children\/new\?from=prospect&id=p1/)
})

test('Add to invoicing is wired through prospect, ChildForm and invoices child picker', () => {
  const detail = read('app/(dashboard)/enquiries/[id]/ProspectDetail.tsx')
  assert.match(detail, /addToInvoicingHref/)
  assert.match(detail, /Add to invoicing/)
  assert.doesNotMatch(detail, /invoicing can take it from there/)

  const newChild = read('app/(dashboard)/children/new/page.tsx')
  assert.match(newChild, /from=prospect|from === 'prospect'/)
  assert.match(newChild, /childFormPrefill/)

  const form = read('components/ChildForm.tsx')
  assert.match(form, /enquiry_prospect_id/)
  assert.match(form, /stage: 'started'/)

  const invoiceNew = read('app/(dashboard)/invoices/new/page.tsx')
  assert.match(invoiceNew, /from\('children'\)/)
  assert.doesNotMatch(invoiceNew, /enquiry_prospects/)

  const bulk = read('app/api/invoices/bulk-create/route.ts')
  assert.match(bulk, /from\('children'\)/)
})

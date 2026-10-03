import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { decryptField, encryptField } from '../crypto.ts'
import { parseTableScope, planBankRow } from '../../../scripts/encrypt-bank-fields.ts'

process.env.BANK_DETAIL_ENCRYPTION_KEY ||= 'ab'.repeat(32)

describe('bank field backfill', () => {
  it('encrypts plaintext and the ciphertext round-trips', () => {
    const plan = planBankRow({ sort_code: '04-00-04', account_number: '12345678' })
    assert.equal(plan.outcome, 'encrypt')
    if (plan.outcome !== 'encrypt') return
    assert.equal(decryptField(plan.update.sort_code), '04-00-04')
    assert.equal(decryptField(plan.update.account_number), '12345678')
    assert.ok(plan.update.sort_code.startsWith('enc:v1:'))
    assert.ok(plan.update.account_number.startsWith('enc:v1:'))
  })

  it('leaves an already-prefixed value byte-identical', () => {
    const prefixed = encryptField('99887766')
    assert.ok(prefixed)
    const row = { sort_code: prefixed, account_number: '' }
    const plan = planBankRow(row)
    assert.equal(plan.outcome, 'skip')
    assert.equal(row.sort_code, prefixed)
    assert.equal(encryptField(prefixed), prefixed)
  })

  it('skips null and empty values and only updates columns that need encryption', () => {
    const empty = planBankRow({ sort_code: null, account_number: '' })
    assert.equal(empty.outcome, 'skip')

    const partial = planBankRow({ sort_code: null, account_number: '12345678' })
    assert.equal(partial.outcome, 'encrypt')
    if (partial.outcome !== 'encrypt') return
    assert.deepEqual(Object.keys(partial.update), ['account_number'])
    assert.equal(decryptField(partial.update.account_number), '12345678')
  })

  it('changes nothing the second time', () => {
    const first = planBankRow({
      default_bank_sort_code: '11-22-33',
      default_bank_account_number: '87654321',
    })
    assert.equal(first.outcome, 'encrypt')
    if (first.outcome !== 'encrypt') return
    const stored = {
      default_bank_sort_code: first.update.default_bank_sort_code,
      default_bank_account_number: first.update.default_bank_account_number,
    }
    const second = planBankRow(stored)
    assert.equal(second.outcome, 'skip')
    assert.equal(stored.default_bank_sort_code, first.update.default_bank_sort_code)
    assert.equal(stored.default_bank_account_number, first.update.default_bank_account_number)
  })

  it('writes nothing for a row when any value fails the round-trip', () => {
    const plan = planBankRow(
      { sort_code: '04-00-04', account_number: '12345678' },
      { encrypt: (value) => `bad:${value}`, decrypt: () => 'nope' },
    )
    assert.equal(plan.outcome, 'failed')
    assert.equal('update' in plan, false)
  })

  it('defaults to bank_accounts and parses --tables', () => {
    assert.deepEqual(parseTableScope([]).tables, ['bank_accounts'])
    assert.equal(parseTableScope(['--commit']).error, undefined)
    assert.deepEqual(parseTableScope(['--commit']).tables, ['bank_accounts'])
    assert.deepEqual(parseTableScope(['--tables=bank_accounts']).tables, ['bank_accounts'])
    assert.deepEqual(
      parseTableScope(['--tables=bank_accounts,profiles,children']).tables,
      ['bank_accounts', 'profiles', 'children'],
    )
    assert.deepEqual(
      parseTableScope(['--tables=children, profiles']).tables,
      ['children', 'profiles'],
    )
    const unknown = parseTableScope(['--tables=bank_accounts,ledger'])
    assert.equal(unknown.error, 'Unknown table: ledger')
    assert.deepEqual(unknown.tables, [])
    assert.match(parseTableScope(['--tables=']).error ?? '', /Unknown table/)
  })
})

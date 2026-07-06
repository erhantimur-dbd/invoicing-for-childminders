'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Landmark, Plus, Pencil, Trash2, Loader2, Star } from 'lucide-react'

type AccountSummary = {
  id: string
  nickname: string
  bank_name: string
  account_name: string
  sort_code_masked: string
  account_number_masked: string
  created_at: string
  updated_at: string
}

type AccountForm = {
  nickname: string
  bank_name: string
  account_name: string
  sort_code: string
  account_number: string
}

const emptyForm: AccountForm = {
  nickname: '',
  bank_name: '',
  account_name: '',
  sort_code: '',
  account_number: '',
}

export default function BankAccountsSection({ userId, initialPrimaryId }: {
  userId: string
  initialPrimaryId: string | null
}) {
  const supabase = createClient()

  const [accounts, setAccounts] = useState<AccountSummary[]>([])
  const [primaryId, setPrimaryId] = useState<string | null>(initialPrimaryId)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AccountForm>(emptyForm)

  useEffect(() => {
    let cancelled = false
    fetch('/api/bank-accounts')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((j: { accounts: AccountSummary[] }) => {
        if (!cancelled) setAccounts(j.accounts || [])
      })
      .catch(() => { if (!cancelled) toast.error('Failed to load bank accounts') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(account: AccountSummary) {
    // Editing leaves sort_code / account_number blank — the user types new
    // digits if they want to change them. We never send the plaintext back to
    // the browser, so we cannot pre-fill those fields.
    setEditingId(account.id)
    setForm({
      nickname: account.nickname,
      bank_name: account.bank_name,
      account_name: account.account_name,
      sort_code: '',
      account_number: '',
    })
    setDialogOpen(true)
  }

  function setField(field: keyof AccountForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.account_name.trim()) {
      toast.error('Account name is required')
      return
    }
    if (!editingId && (!form.account_number.trim() || !form.sort_code.trim())) {
      toast.error('Sort code and account number are required')
      return
    }

    setSaving(true)

    if (editingId) {
      // PATCH: only send fields that were actually filled in.
      const patch: Partial<AccountForm> = {
        nickname: form.nickname,
        bank_name: form.bank_name,
        account_name: form.account_name,
      }
      if (form.sort_code.trim()) patch.sort_code = form.sort_code
      if (form.account_number.trim()) patch.account_number = form.account_number

      const r = await fetch(`/api/bank-accounts/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!r.ok) { toast.error('Failed to save'); setSaving(false); return }
      const { account }: { account: AccountSummary } = await r.json()
      setAccounts(prev => prev.map(a => a.id === editingId ? account : a))
      toast.success('Bank account updated')
    } else {
      const r = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!r.ok) { toast.error('Failed to save'); setSaving(false); return }
      const { account }: { account: AccountSummary } = await r.json()
      setAccounts(prev => [...prev, account])
      if (accounts.length === 0) {
        await setPrimary(account.id)
      }
      toast.success('Bank account added')
    }

    setSaving(false)
    setDialogOpen(false)
  }

  async function handleDelete() {
    if (!editingId) return
    if (!confirm('Delete this bank account?')) return
    setDeleting(true)
    const r = await fetch(`/api/bank-accounts/${editingId}`, { method: 'DELETE' })
    if (!r.ok) { toast.error('Failed to delete'); setDeleting(false); return }
    const remaining = accounts.filter(a => a.id !== editingId)
    setAccounts(remaining)
    if (primaryId === editingId) {
      const newPrimary = remaining[0]?.id ?? null
      await setPrimary(newPrimary)
    }
    toast.success('Bank account removed')
    setDeleting(false)
    setDialogOpen(false)
  }

  async function setPrimary(id: string | null) {
    setPrimaryId(id)
    // primary_bank_account_id is just an FK on profiles, not sensitive — direct update is fine.
    await supabase
      .from('profiles')
      .update({ primary_bank_account_id: id, updated_at: new Date().toISOString() })
      .eq('id', userId)
  }

  async function handlePrimaryChange(id: string | null) {
    if (!id) return
    await setPrimary(id)
    toast.success('Primary account updated')
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
                <Landmark className="h-4 w-4 text-violet-600" />
              </div>
              Bank accounts
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openAdd}
              className="h-8 gap-1.5 text-xs border-violet-200 text-violet-700 hover:bg-violet-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add account
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Primary selector */}
          {accounts.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-500" />
                Primary account
              </Label>
              <Select value={primaryId ?? ''} onValueChange={handlePrimaryChange}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select primary account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nickname || a.bank_name || 'Account'} — {a.account_number_masked}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">This account&apos;s details appear on your invoices by default</p>
            </div>
          )}

          {/* Account list */}
          {accounts.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Landmark className="h-5 w-5 text-gray-300" />
              </div>
              <p className="text-sm text-gray-500 font-medium">No bank accounts yet</p>
              <p className="text-xs text-gray-400 mt-0.5">Add one to include payment details on invoices</p>
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map(account => {
                const isPrimary = account.id === primaryId
                return (
                  <div
                    key={account.id}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors ${
                      isPrimary
                        ? 'border-violet-200 bg-violet-50'
                        : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {account.nickname || account.bank_name || 'Bank account'}
                        </p>
                        {isPrimary && (
                          <span className="text-xs font-medium bg-violet-200 text-violet-800 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {account.bank_name && account.bank_name !== account.nickname
                          ? `${account.bank_name} · `
                          : ''}
                        {account.account_name} · {account.account_number_masked}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(account)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700 flex-shrink-0"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit bank account' : 'Add bank account'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">

            {editingId && (
              <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                Sort code and account number are encrypted — leave blank to keep the existing values.
              </p>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Nickname <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                value={form.nickname}
                onChange={e => setField('nickname', e.target.value)}
                placeholder="e.g. Personal, Business"
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Bank name</Label>
                <Input
                  value={form.bank_name}
                  onChange={e => setField('bank_name', e.target.value)}
                  placeholder="Barclays"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Account name</Label>
                <Input
                  value={form.account_name}
                  onChange={e => setField('account_name', e.target.value)}
                  placeholder="Jane Smith"
                  className="h-11"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Sort code</Label>
                <Input
                  value={form.sort_code}
                  onChange={e => setField('sort_code', e.target.value)}
                  placeholder={editingId ? '••-••-••' : '00-00-00'}
                  className="h-11 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Account number</Label>
                <Input
                  value={form.account_number}
                  onChange={e => setField('account_number', e.target.value)}
                  placeholder={editingId ? '••••••••' : '12345678'}
                  className="h-11 font-mono"
                  required={!editingId}
                />
              </div>
            </div>

            <Button
              type="button"
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? 'Save changes' : 'Add account'}
            </Button>

            {editingId && (
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <><Trash2 className="h-4 w-4 mr-2" />Remove account</>
                )}
              </Button>
            )}

          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

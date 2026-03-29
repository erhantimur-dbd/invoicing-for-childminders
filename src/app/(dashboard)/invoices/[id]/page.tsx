'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import StatusBadge from '@/components/StatusBadge'
import InvoicePreview from '@/components/InvoicePreview'
import { toast } from 'sonner'
import {
  ChevronLeft, Printer, Mail, MessageCircle, CheckCircle,
  Bell, Loader2, Share2, ChevronDown, ChevronUp, Pencil, X, Link2, Trash2
} from 'lucide-react'
import InvoiceLineItemEditor from '@/components/InvoiceLineItemEditor'
import type { Invoice, Profile, BankAccount } from '@/lib/types'
import { format } from 'date-fns'

function formatGBP(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

export default function InvoicePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [primaryBankAccount, setPrimaryBankAccount] = useState<BankAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [showReminderForm, setShowReminderForm] = useState(false)
  const [showMarkPaid, setShowMarkPaid] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [paymentRef, setPaymentRef] = useState('')
  const [reminderDays, setReminderDays] = useState('7')
  const [reminderActive, setReminderActive] = useState(false)
  const [existingReminder, setExistingReminder] = useState<any>(null)
  const [savingReminder, setSavingReminder] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [editingLineItems, setEditingLineItems] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: inv }, { data: prof }, { data: reminder }] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, children(*), invoice_line_items(*)')
          .eq('id', id)
          .eq('childminder_id', user.id)
          .single(),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('reminders').select('*').eq('invoice_id', id).maybeSingle(),
      ])

      if (inv) setInvoice(inv)
      if (prof) {
        setProfile(prof)
        // Fetch primary bank account if set
        if (prof.primary_bank_account_id) {
          const { data: bank } = await supabase
            .from('bank_accounts')
            .select('*')
            .eq('id', prof.primary_bank_account_id)
            .single()
          if (bank) setPrimaryBankAccount(bank)
        }
      }
      if (reminder) {
        setExistingReminder(reminder)
        setReminderDays(String(reminder.frequency_days))
        setReminderActive(reminder.is_active)
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function handleMarkPaid() {
    if (!invoice) return
    setMarkingPaid(true)
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: now,
        payment_method: 'bank_transfer',
        payment_reference: paymentRef,
        updated_at: now,
      })
      .eq('id', invoice.id)

    if (error) {
      toast.error('Failed to mark as paid')
    } else {
      setInvoice(prev => prev ? { ...prev, status: 'paid', paid_at: now } : null)
      setShowMarkPaid(false)
      toast.success('Invoice marked as paid!')
    }
    setMarkingPaid(false)
  }

  async function handleSendEmail() {
    if (!invoice || !profile) return
    setSendingEmail(true)
    try {
      const res = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Invoice sent by email!')
      // Update status to sent if draft or approved
      if (invoice.status === 'draft' || invoice.status === 'approved') {
        await supabase
          .from('invoices')
          .update({ status: 'sent', updated_at: new Date().toISOString() })
          .eq('id', invoice.id)
        setInvoice(prev => prev ? { ...prev, status: 'sent' } : null)
      }
    } catch {
      toast.error('Failed to send email. Check your Resend settings.')
    }
    setSendingEmail(false)
    setShowShareOptions(false)
  }

  async function handleWhatsApp() {
    if (!invoice || !profile) return
    const child = (invoice as any).children
    const publicLink = `${window.location.origin}/invoice/${invoice.id}`
    const message = encodeURIComponent(
      `Hi ${child?.parent_name || ''},\n\nPlease find your invoice ${invoice.invoice_number} for ${child ? `${child.first_name}'s` : ''} childcare.\n\nAmount due: ${formatGBP(Number(invoice.total))}\n${invoice.due_date ? `Due by: ${format(new Date(invoice.due_date), 'd MMM yyyy')}\n` : ''}\nView invoice: ${publicLink}\n${invoice.stripe_payment_link ? `\nPay online: ${invoice.stripe_payment_link}\n` : ''}\nKind regards,\n${profile.full_name}`
    )
    window.open(`https://wa.me/?text=${message}`, '_blank')
    // Update status to sent if draft or approved
    if (invoice.status === 'draft' || invoice.status === 'approved') {
      await supabase
        .from('invoices')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', invoice.id)
      setInvoice(prev => prev ? { ...prev, status: 'sent' } : null)
    }
    setShowShareOptions(false)
  }

  function handlePrint() {
    const el = document.getElementById('invoice-print-area')
    if (el) el.style.display = 'block'
    window.print()
    if (el) el.style.display = 'none'
  }

  async function handleDelete() {
    if (!invoice) return
    if (!confirm(`Delete invoice ${invoice.invoice_number}? This cannot be undone.`)) return
    setDeleting(true)
    // Delete line items first (foreign key), then invoice
    await supabase.from('invoice_line_items').delete().eq('invoice_id', invoice.id)
    const { error } = await supabase.from('invoices').delete().eq('id', invoice.id)
    if (error) {
      toast.error('Failed to delete invoice')
      setDeleting(false)
      return
    }
    toast.success('Invoice deleted')
    router.push('/invoices')
  }

  async function handleSaveReminder() {
    if (!invoice) return
    setSavingReminder(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const dueDate = invoice.due_date ? new Date(invoice.due_date) : new Date()
    const nextSendAt = new Date(dueDate)
    nextSendAt.setDate(nextSendAt.getDate() + Number(reminderDays))

    if (existingReminder) {
      await supabase.from('reminders').update({
        frequency_days: Number(reminderDays),
        is_active: reminderActive,
        next_send_at: nextSendAt.toISOString(),
      }).eq('id', existingReminder.id)
    } else {
      const { data } = await supabase.from('reminders').insert({
        invoice_id: invoice.id,
        childminder_id: user.id,
        frequency_days: Number(reminderDays),
        is_active: reminderActive,
        next_send_at: nextSendAt.toISOString(),
      }).select().single()
      setExistingReminder(data)
    }
    toast.success('Reminder saved')
    setShowReminderForm(false)
    setSavingReminder(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!invoice || !profile) {
    return <p className="text-center py-20 text-gray-500">Invoice not found</p>
  }

  const child = (invoice as any).children

  return (
    <div>
      {/* Hidden print-only area — always in the DOM, shown only on print */}
      <div id="invoice-print-area" style={{ display: 'none' }}>
        <InvoicePreview invoice={invoice} profile={profile} primaryBankAccount={primaryBankAccount} />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/invoices" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{invoice.invoice_number}</h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-gray-500 text-sm">
            {child ? `${child.first_name} ${child.last_name}` : ''}
            {' · '}{format(new Date(invoice.issue_date), 'd MMM yyyy')}
          </p>
        </div>
        {/* Desktop action buttons in header */}
        <div className="hidden md:flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting} className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
            <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting...' : 'Delete'}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
          {invoice.status !== 'paid' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowMarkPaid(true)} className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <CheckCircle className="h-4 w-4" /> Mark paid
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => setShowShareOptions(true)}>
                <Mail className="h-4 w-4" /> Approve & Share
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Desktop two-column layout */}
      <div className="flex flex-col md:flex-row gap-6">

        {/* Left column: details + actions */}
        <div className="flex-1 space-y-4 md:max-w-sm">

      {/* Summary card */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
        <CardContent className="p-5">
          <p className="text-emerald-100 text-sm mb-1">Total amount</p>
          <p className="text-4xl font-bold">{formatGBP(Number(invoice.total))}</p>
          {invoice.due_date && invoice.status !== 'paid' && (
            <p className="text-emerald-100 text-sm mt-2">
              Due {format(new Date(invoice.due_date), 'd MMM yyyy')}
            </p>
          )}
          {invoice.status === 'paid' && invoice.paid_at && (
            <p className="text-emerald-100 text-sm mt-2">
              Paid on {format(new Date(invoice.paid_at), 'd MMM yyyy')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Mobile action buttons */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        <Button
          variant="outline"
          className="h-14 flex-col gap-1 text-xs border-gray-200"
          onClick={() => setShowPreview(true)}
        >
          <Share2 className="h-5 w-5 text-gray-600" />
          Preview
        </Button>
        <Button
          variant="outline"
          className="h-14 flex-col gap-1 text-xs border-gray-200"
          onClick={handlePrint}
        >
          <Printer className="h-5 w-5 text-gray-600" />
          Print
        </Button>
        {invoice.status !== 'paid' && (
          <>
            <Button
              className="h-14 flex-col gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 col-span-2"
              onClick={() => setShowShareOptions(true)}
            >
              <Mail className="h-5 w-5" />
              Approve & share invoice
            </Button>
            <Button
              variant="outline"
              className="h-14 flex-col gap-1 text-xs border-emerald-200 text-emerald-700 col-span-2"
              onClick={() => setShowMarkPaid(true)}
            >
              <CheckCircle className="h-5 w-5" />
              Mark as paid
            </Button>
          </>
        )}
        <Button
          variant="outline"
          className="h-14 flex-col gap-1 text-xs border-red-200 text-red-600 col-span-2"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="h-5 w-5" />
          {deleting ? 'Deleting...' : 'Delete invoice'}
        </Button>
      </div>

      {/* Reminders */}
      {invoice.status !== 'paid' && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <button
              className="flex items-center justify-between w-full"
              onClick={() => setShowReminderForm(!showReminderForm)}
            >
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-emerald-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">Payment reminder</p>
                  <p className="text-xs text-gray-500">
                    {existingReminder && existingReminder.is_active
                      ? `Every ${existingReminder.frequency_days} days · Active`
                      : 'Not set'}
                  </p>
                </div>
              </div>
              {showReminderForm ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>

            {showReminderForm && (
              <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Enable reminder</Label>
                  <Switch
                    checked={reminderActive}
                    onCheckedChange={setReminderActive}
                  />
                </div>
                {reminderActive && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Remind every</Label>
                    <Select value={reminderDays} onValueChange={(v) => setReminderDays(v ?? '7')}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 day</SelectItem>
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">
                      You&apos;ll be reminded to send a follow-up if the invoice isn&apos;t paid
                    </p>
                  </div>
                )}
                <Button
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleSaveReminder}
                  disabled={savingReminder}
                >
                  {savingReminder ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save reminder'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invoice details */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Invoice details</CardTitle>
            <button
              onClick={() => setEditingLineItems(e => !e)}
              className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-all ${
                editingLineItems
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {editingLineItems ? <><X className="h-3 w-3" /> Close</> : <><Pencil className="h-3 w-3" /> Edit items</>}
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {child && (
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Parent</span>
              <span className="font-medium text-right">{child.parent_name}</span>
            </div>
          )}
          {child && (
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Child</span>
              <span className="font-medium">{child.first_name} {child.last_name}</span>
            </div>
          )}
          <div className="flex justify-between py-1">
            <span className="text-gray-500">Invoice date</span>
            <span className="font-medium">{format(new Date(invoice.issue_date), 'd MMM yyyy')}</span>
          </div>
          {invoice.due_date && (
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Due date</span>
              <span className="font-medium">{format(new Date(invoice.due_date), 'd MMM yyyy')}</span>
            </div>
          )}
          <Separator />

          {editingLineItems ? (
            /* ── Edit mode ── */
            <InvoiceLineItemEditor
              invoiceId={invoice.id}
              initialItems={invoice.invoice_line_items || []}
              childDailyRate={Number(child?.daily_rate ?? 0)}
              childHalfDayRate={child?.half_day_rate ? Number(child.half_day_rate) : null}
              onSaved={(newItems, newTotal) => {
                setInvoice(prev => prev ? {
                  ...prev,
                  total: newTotal,
                  invoice_line_items: newItems as any,
                } : prev)
                setEditingLineItems(false)
              }}
            />
          ) : (
            /* ── Read mode ── */
            <>
              {(invoice.invoice_line_items || []).map(item => (
                <div key={item.id} className="flex justify-between py-1">
                  <span className="text-gray-600 flex-1 pr-2 text-xs">{item.description}</span>
                  <span className="font-medium flex-shrink-0">{formatGBP(Number(item.amount))}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between py-1 font-bold text-base">
                <span>Total</span>
                <span className="text-emerald-600">{formatGBP(Number(invoice.total))}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

        </div>{/* end left column */}

        {/* Right column: live invoice preview (desktop only) */}
        <div className="hidden md:block flex-1">
          <div className="sticky top-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Invoice preview</p>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 overflow-auto max-h-[calc(100vh-10rem)]">
                <InvoicePreview invoice={invoice} profile={profile} primaryBankAccount={primaryBankAccount} />
              </div>
            </div>
          </div>
        </div>

      </div>{/* end two-column */}

      {/* Preview dialog (mobile) */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Invoice preview</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => { setShowPreview(false); setShowShareOptions(true) }}
              >
                Share
              </Button>
            </div>
          </div>
          <div className="p-4">
            <InvoicePreview invoice={invoice} profile={profile} primaryBankAccount={primaryBankAccount} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Share options dialog */}
      <Dialog open={showShareOptions} onOpenChange={setShowShareOptions}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve & share invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Button
              className="w-full h-14 text-base justify-start gap-3 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSendEmail}
              disabled={sendingEmail}
            >
              {sendingEmail ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-6 w-6" />}
              <div className="text-left">
                <p className="font-semibold">Send by email</p>
                <p className="text-xs text-emerald-100">{child?.parent_email}</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 text-base justify-start gap-3 border-green-200 text-green-700 hover:bg-green-50"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="h-6 w-6" />
              <div className="text-left">
                <p className="font-semibold">Share via WhatsApp</p>
                <p className="text-xs text-gray-500">Includes a link to view the invoice</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 text-base justify-start gap-3 border-gray-200 text-gray-700 hover:bg-gray-50"
              onClick={() => {
                const link = `${window.location.origin}/invoice/${invoice.id}`
                navigator.clipboard.writeText(link)
                toast.success('Link copied to clipboard')
                setShowShareOptions(false)
              }}
            >
              <Link2 className="h-6 w-6" />
              <div className="text-left">
                <p className="font-semibold">Copy invoice link</p>
                <p className="text-xs text-gray-500">Parent can open and view in their browser</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 text-base justify-start gap-3"
              onClick={handlePrint}
            >
              <Printer className="h-6 w-6" />
              <div className="text-left">
                <p className="font-semibold">Print</p>
                <p className="text-xs text-gray-500">Print or save as PDF</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark paid dialog */}
      <Dialog open={showMarkPaid} onOpenChange={setShowMarkPaid}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-600">
              Confirm payment of <span className="font-bold">{formatGBP(Number(invoice.total))}</span> from {child?.parent_name}
            </p>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment reference (optional)</Label>
              <Input
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                placeholder="e.g. Bank transfer ref"
                className="h-12 text-base"
              />
            </div>
            <Button
              className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
              onClick={handleMarkPaid}
              disabled={markingPaid}
            >
              {markingPaid ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm payment received'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

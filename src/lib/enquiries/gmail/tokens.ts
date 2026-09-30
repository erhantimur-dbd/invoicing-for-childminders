import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptField, encryptField } from '@/lib/crypto'
import { expiryFromToken, refreshAccessToken, scopesFromToken, type GoogleTokenResponse } from './oauth'
import { getProfile } from './client'
import { log } from '@/lib/log'

export type GmailAccountRow = {
  user_id: string
  email: string
  access_token_enc: string
  refresh_token_enc: string | null
  token_expiry: string | null
  scopes: string
  label_id: string | null
  label_name: string | null
  history_id: string | null
  last_sync_at: string | null
  last_error: string | null
  connected_at: string
  updated_at: string
}

export function encryptToken(value: string): string {
  const enc = encryptField(value)
  if (!enc) throw new Error('Could not encrypt the Gmail token.')
  return enc
}

export function decryptToken(value: string | null | undefined): string | null {
  return decryptField(value)
}

export async function upsertGmailAccount(
  supabase: SupabaseClient,
  userId: string,
  token: GoogleTokenResponse,
  previousRefreshEnc?: string | null,
): Promise<GmailAccountRow> {
  const profile = await getProfile(token.access_token)
  const email = profile.emailAddress
  if (!email) throw new Error('Gmail did not return an address for this account.')

  const refreshEnc = token.refresh_token
    ? encryptToken(token.refresh_token)
    : previousRefreshEnc ?? null

  const row = {
    user_id: userId,
    email,
    access_token_enc: encryptToken(token.access_token),
    refresh_token_enc: refreshEnc,
    token_expiry: expiryFromToken(token),
    scopes: scopesFromToken(token),
    history_id: profile.historyId ? String(profile.historyId) : null,
    last_error: null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('enquiry_gmail_accounts')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single()

  if (error || !data) {
    log.error('enquiry_gmail_upsert_failed', error, { user_id: userId })
    throw new Error('Could not save the Gmail connection.')
  }
  return data as GmailAccountRow
}

export async function loadGmailAccount(
  supabase: SupabaseClient,
  userId: string,
): Promise<GmailAccountRow | null> {
  const { data, error } = await supabase
    .from('enquiry_gmail_accounts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    log.error('enquiry_gmail_load_failed', error, { user_id: userId })
    throw new Error('Could not load the Gmail connection.')
  }
  return (data as GmailAccountRow | null) ?? null
}

export async function getValidAccessToken(
  supabase: SupabaseClient,
  account: GmailAccountRow,
): Promise<string> {
  const access = decryptToken(account.access_token_enc)
  const expiry = account.token_expiry ? new Date(account.token_expiry).getTime() : 0
  const freshEnough = Date.now() < expiry - 60_000
  if (access && freshEnough) return access

  const refresh = decryptToken(account.refresh_token_enc)
  if (!refresh) {
    throw new Error('Gmail needs to be connected again — the refresh token is missing.')
  }

  const token = await refreshAccessToken(refresh)
  const next = {
    access_token_enc: encryptToken(token.access_token),
    token_expiry: expiryFromToken(token),
    scopes: token.scope || account.scopes,
    updated_at: new Date().toISOString(),
    last_error: null,
  }
  const { error } = await supabase
    .from('enquiry_gmail_accounts')
    .update(next)
    .eq('user_id', account.user_id)
  if (error) {
    log.error('enquiry_gmail_refresh_save_failed', error, { user_id: account.user_id })
  }
  return token.access_token
}

export function publicAccount(account: GmailAccountRow) {
  return {
    email: account.email,
    label_id: account.label_id,
    label_name: account.label_name,
    last_sync_at: account.last_sync_at,
    last_error: account.last_error,
    connected_at: account.connected_at,
  }
}

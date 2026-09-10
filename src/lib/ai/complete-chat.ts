/**
 * Shared text-chat helper: xAI/Grok is primary everywhere.
 *
 * Enquiries drafting (`purpose: enquiry_draft`): Anthropic failover is
 * Preview-only and requires ENQUIRIES_ANTHROPIC_FAILOVER=true. Production
 * never sends enquiry content to Anthropic until Privacy names that path
 * (John Legal Soft CTA). Invoice AI stays on Anthropic (already listed).
 *
 * Never surface Anthropic as an Enquiries drafting path in UI or marketing.
 * See `AI_CALL_SITES` in ./inventory.ts.
 */
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { log } from '@/lib/log'
import {
  enquiriesAnthropicFailoverEnabled,
  enquiriesFailoverBlockReason,
} from './enquiries-failover'
import { EmptyModelOutputError, isFailoverError, statusFromUnknown } from './failover'

export const XAI_CHAT_MODEL = 'grok-4.6'
export const ANTHROPIC_CHAT_MODEL = 'claude-sonnet-4-6'

const XAI_TIMEOUT_MS = 20_000

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type CompleteChatInput = {
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  /** Log label, e.g. enquiry_draft */
  purpose?: string
  /**
   * Override Anthropic failover. enquiry_draft defaults to the Privacy gate
   * (off in production; Preview needs ENQUIRIES_ANTHROPIC_FAILOVER=true).
   * Other purposes default to allowed (invoice AI is already Privacy-listed).
   */
  allowAnthropicFailover?: boolean
}

export type CompleteChatResult = {
  text: string
  provider: 'xai' | 'anthropic'
  model: string
  failedOver: boolean
}

function xaiClient(): OpenAI | null {
  const key = process.env.XAI_API_KEY
  if (!key) return null
  return new OpenAI({
    apiKey: key,
    baseURL: 'https://api.x.ai/v1',
    timeout: XAI_TIMEOUT_MS,
    maxRetries: 0,
  })
}

function anthropicClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  return new Anthropic({ apiKey: key })
}

function splitForAnthropic(messages: ChatMessage[]): {
  system: string
  rest: Anthropic.MessageParam[]
} {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n')
  const rest: Anthropic.MessageParam[] = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
  return { system, rest }
}

async function completeWithXai(client: OpenAI, input: CompleteChatInput): Promise<string> {
  const resp = await client.chat.completions.create({
    model: XAI_CHAT_MODEL,
    temperature: input.temperature ?? 0.4,
    max_tokens: input.maxTokens,
    messages: input.messages,
  })
  const text = resp.choices[0]?.message?.content?.trim()
  if (!text) throw new EmptyModelOutputError('xAI')
  return text
}

async function completeWithAnthropic(client: Anthropic, input: CompleteChatInput): Promise<string> {
  const { system, rest } = splitForAnthropic(input.messages)
  const resp = await client.messages.create({
    model: ANTHROPIC_CHAT_MODEL,
    max_tokens: input.maxTokens ?? 2048,
    temperature: input.temperature ?? 0.4,
    system: system || undefined,
    messages: rest,
  })
  const text = resp.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim()
  if (!text) throw new EmptyModelOutputError('Anthropic')
  return text
}

function resolveAnthropicFailover(input: CompleteChatInput): boolean {
  if (typeof input.allowAnthropicFailover === 'boolean') return input.allowAnthropicFailover
  if (input.purpose === 'enquiry_draft') return enquiriesAnthropicFailoverEnabled()
  return true
}

export async function completeChat(input: CompleteChatInput): Promise<CompleteChatResult> {
  const purpose = input.purpose ?? 'chat'
  const allowAnthropic = resolveAnthropicFailover(input)
  const xai = xaiClient()
  // Do not construct an Anthropic client (or send content) when Enquiries failover is gated off.
  const anthropic = allowAnthropic ? anthropicClient() : null

  if (!xai && !anthropic) {
    if (!allowAnthropic && input.purpose === 'enquiry_draft') {
      log.warn('ai_enquiries_anthropic_failover_blocked', {
        purpose,
        reason: enquiriesFailoverBlockReason(),
        vercel_env: process.env.VERCEL_ENV ?? 'unset',
        trigger: 'xai_missing',
      })
    }
    throw new Error('Dottie is not connected to Grok yet. Add XAI_API_KEY.')
  }

  if (xai) {
    try {
      const text = await completeWithXai(xai, input)
      return { text, provider: 'xai', model: XAI_CHAT_MODEL, failedOver: false }
    } catch (err) {
      const failoverShaped = isFailoverError(err)
      if (failoverShaped) {
        log.warn('ai_xai_failover', {
          purpose,
          status: statusFromUnknown(err),
          message: err instanceof Error ? err.message : String(err),
          allow_anthropic: allowAnthropic,
          blocked_reason: allowAnthropic ? null : enquiriesFailoverBlockReason(),
        })
      }
      if (!allowAnthropic || !anthropic || !failoverShaped) {
        if (!allowAnthropic && input.purpose === 'enquiry_draft' && failoverShaped) {
          log.warn('ai_enquiries_anthropic_failover_blocked', {
            purpose,
            reason: enquiriesFailoverBlockReason(),
            vercel_env: process.env.VERCEL_ENV ?? 'unset',
            trigger: 'xai_error',
            status: statusFromUnknown(err),
          })
        }
        throw err instanceof Error ? err : new Error('Dottie could not reach Grok. Try again in a moment.')
      }
    }
  } else {
    log.warn('ai_xai_skipped', {
      purpose,
      reason: 'XAI_API_KEY missing',
      allow_anthropic: allowAnthropic,
    })
  }

  if (!anthropic) {
    throw new Error('Dottie could not reach Grok. Try again in a moment.')
  }

  const text = await completeWithAnthropic(anthropic, input)
  log.warn('ai_anthropic_failover_used', {
    purpose,
    model: ANTHROPIC_CHAT_MODEL,
  })
  return { text, provider: 'anthropic', model: ANTHROPIC_CHAT_MODEL, failedOver: true }
}

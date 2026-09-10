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
 *
 * Each successful provider turn emits `ai_usage` (rate card 2026-09-10.1).
 * Metering never throws and does not change Auto-send or Soft Launch seats.
 */
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { log } from '@/lib/log'
import {
  enquiriesAnthropicFailoverEnabled,
  enquiriesFailoverBlockReason,
} from './enquiries-failover'
import { EmptyModelOutputError, isFailoverError, statusFromUnknown } from './failover'
import {
  type AiProductTag,
  type AiUsageEvent,
  METERED_MODELS,
  emitAiUsage,
  productTagForPurpose,
  usageFromAnthropic,
  usageFromOpenAI,
} from './usage'

export const XAI_CHAT_MODEL = METERED_MODELS.enquiriesLive
export const ANTHROPIC_CHAT_MODEL = METERED_MODELS.enquiriesFailover

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
  /** Override product tag. enquiry_draft → godottie-enquiries; else invoice. */
  productTag?: AiProductTag
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
  usage: AiUsageEvent | null
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

type ProviderTurn = {
  text: string
  model: string
  usage: ReturnType<typeof usageFromOpenAI>
}

async function completeWithXai(client: OpenAI, input: CompleteChatInput): Promise<ProviderTurn> {
  const resp = await client.chat.completions.create({
    model: XAI_CHAT_MODEL,
    temperature: input.temperature ?? 0.4,
    max_tokens: input.maxTokens,
    messages: input.messages,
  })
  const text = resp.choices[0]?.message?.content?.trim()
  if (!text) throw new EmptyModelOutputError('xAI')
  return {
    text,
    model: resp.model || XAI_CHAT_MODEL,
    usage: usageFromOpenAI(resp),
  }
}

async function completeWithAnthropic(client: Anthropic, input: CompleteChatInput): Promise<ProviderTurn> {
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
  return {
    text,
    model: resp.model || ANTHROPIC_CHAT_MODEL,
    usage: usageFromAnthropic(resp),
  }
}

function resolveAnthropicFailover(input: CompleteChatInput): boolean {
  if (typeof input.allowAnthropicFailover === 'boolean') return input.allowAnthropicFailover
  if (input.purpose === 'enquiry_draft') return enquiriesAnthropicFailoverEnabled()
  return true
}

function meterTurn(
  purpose: string,
  productTag: AiProductTag,
  vendor: 'xai' | 'anthropic',
  turn: ProviderTurn,
): AiUsageEvent | null {
  return emitAiUsage({
    product_tag: productTag,
    vendor,
    model: turn.model,
    purpose,
    ...turn.usage,
  })
}

export async function completeChat(input: CompleteChatInput): Promise<CompleteChatResult> {
  const purpose = input.purpose ?? 'chat'
  const productTag = input.productTag ?? productTagForPurpose(input.purpose)
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
      const turn = await completeWithXai(xai, input)
      return {
        text: turn.text,
        provider: 'xai',
        model: turn.model,
        failedOver: false,
        usage: meterTurn(purpose, productTag, 'xai', turn),
      }
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

  const turn = await completeWithAnthropic(anthropic, input)
  log.warn('ai_anthropic_failover_used', {
    purpose,
    model: turn.model,
  })
  return {
    text: turn.text,
    provider: 'anthropic',
    model: turn.model,
    failedOver: true,
    usage: meterTurn(purpose, productTag, 'anthropic', turn),
  }
}

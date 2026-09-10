/**
 * Shared text-chat helper: try xAI/Grok first, fall back to Anthropic.
 *
 * Wired today: Soft Launch Enquiries drafts (`draftEnquiryReply`).
 * Not wired (higher risk): invoice-agent tool loop, receipt vision.
 * See `AI_CALL_SITES` in ./inventory.ts.
 */
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { log } from '@/lib/log'
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

export async function completeChat(input: CompleteChatInput): Promise<CompleteChatResult> {
  const xai = xaiClient()
  const anthropic = anthropicClient()

  if (!xai && !anthropic) {
    throw new Error(
      'Dottie cannot draft a reply right now. Add XAI_API_KEY (primary) or ANTHROPIC_API_KEY (failover).',
    )
  }

  if (xai) {
    try {
      const text = await completeWithXai(xai, input)
      return { text, provider: 'xai', model: XAI_CHAT_MODEL, failedOver: false }
    } catch (err) {
      if (!anthropic || !isFailoverError(err)) throw err
      log.warn('ai_xai_failover', {
        purpose: input.purpose ?? 'chat',
        status: statusFromUnknown(err),
        message: err instanceof Error ? err.message : String(err),
      })
    }
  } else {
    log.warn('ai_xai_skipped', {
      purpose: input.purpose ?? 'chat',
      reason: 'XAI_API_KEY missing',
    })
  }

  if (!anthropic) {
    throw new Error('Dottie cannot draft a reply right now. Add ANTHROPIC_API_KEY as failover.')
  }

  const text = await completeWithAnthropic(anthropic, input)
  return { text, provider: 'anthropic', model: ANTHROPIC_CHAT_MODEL, failedOver: true }
}

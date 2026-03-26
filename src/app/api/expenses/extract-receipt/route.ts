import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ai_not_configured' }, { status: 503 })
    }

    const { imageBase64, mimeType } = await request.json()
    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: 'Missing imageBase64 or mimeType' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `Analyse this receipt and extract the following information. Return ONLY valid JSON, no explanation or markdown.

{
  "amount": <total amount as number, GBP>,
  "date": <purchase date as YYYY-MM-DD string>,
  "merchant_name": <shop or vendor name as string>,
  "description": <brief description of purchase, max 60 chars>,
  "category": <one of exactly: "Food & Drink", "Outings & Trips", "Children's Groups & Classes", "Arts, Crafts & Activities", "Books & Educational Materials", "Toys & Play Equipment", "Nappies & Consumables", "Travel & Transport", "Home & Premises", "Clothing & Uniforms", "Insurance & Professional Fees", "First Aid & Medical", "Office & Admin", "Other">
}

Omit any field you cannot determine with reasonable confidence. Return only the JSON object.`
          }
        ]
      }]
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Strip markdown fences if present
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

    let data: Record<string, unknown> = {}
    try {
      data = JSON.parse(cleaned)
    } catch {
      // Can't parse — return empty data gracefully
      return NextResponse.json({ data: {} })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('extract-receipt error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

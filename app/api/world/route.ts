import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const VALID_TYPES = [
  'conveyor', 'metal-detector', 'checkweigher', 'labeller',
  'robotic-arm', 'reject-station', 'filling-machine',
  'packaging-machine', 'agv', 'storage', 'quality-inspection',
]

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: `Extract machine types and quantities from a factory or production line description.
Return ONLY a JSON array with this exact structure:
[{"type": "conveyor", "count": 3}, {"type": "metal-detector", "count": 1}]

Valid machine types (use EXACTLY these strings):
${VALID_TYPES.join(', ')}

Rules:
- Only use the exact type strings listed above
- count must be a positive integer between 1 and 10
- Include only machines explicitly mentioned or clearly implied
- Return [] if no valid machines found
- Return ONLY the JSON array, no other text, no code fences`,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]'
    const clean = text.replace(/```json|```/g, '').trim()

    let machines: { type: string; count: number }[]
    try {
      machines = JSON.parse(clean)
    } catch {
      machines = []
    }

    const valid = machines
      .filter(m => VALID_TYPES.includes(m.type) && typeof m.count === 'number' && m.count > 0)
      .map(m => ({ type: m.type, count: Math.min(Math.max(Math.round(m.count), 1), 10) }))

    return NextResponse.json({ machines: valid })
  } catch (error: any) {
    console.error('World route error:', error?.message)
    return NextResponse.json(
      { error: 'World service unavailable', detail: error?.message },
      { status: 500 }
    )
  }
}

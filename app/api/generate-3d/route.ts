import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 300

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MESHY_BASE = 'https://api.meshy.ai/openapi/v2/text-to-3d'
const POLL_MS = 5_000
const TIMEOUT_MS = 300_000

async function startTask(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(MESHY_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'preview',
      prompt,
      art_style: 'realistic',
      should_remesh: true,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meshy start failed ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.result as string
}

async function getTask(id: string, apiKey: string) {
  const res = await fetch(`${MESHY_BASE}/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`Meshy poll failed: ${res.status}`)
  return res.json()
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function enhancePrompt(userPrompt: string): Promise<string> {
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      system: `You are a 3D model prompt engineer specialising in industrial equipment. Your job is to rewrite a user's component description into a highly specific visual prompt for a text-to-3D AI generator.

Rules:
- Be very specific about the physical shape, proportions, and key features
- Include the material finish (metallic, plastic, painted steel etc)
- Include colour where relevant (yellow body, grey housing etc)
- Include key identifying visual features that make it recognisable
- Keep under 200 characters
- Return only the enhanced prompt, nothing else

Examples:
'inductive sensor' → 'Cylindrical inductive proximity sensor, M18 chrome metal barrel, flat sensing face, M12 connector plug on rear, LED indicator ring, industrial metallic finish'
'conveyor belt' → 'Industrial flat belt conveyor, grey steel frame, black rubber belt, cylindrical drive rollers at each end, adjustable legs, side guide rails'
'safety relay' → 'Safety relay module, yellow rectangular plastic housing, green and red LED indicators, screw terminals on bottom, DIN rail clip on back, Pilz style'
'motor' → 'Three phase electric motor, grey cast iron body, cooling fins along sides, black junction box on top, output shaft, four bolt mounting feet'
'VFD' → 'Variable frequency drive, grey metal enclosure, digital display panel, keypad buttons, ventilation slots on sides, cable entry glands bottom'

Apply the same principle to any industrial component the user types.`,
      messages: [{ role: 'user', content: userPrompt }],
    })
    const text = res.content[0].type === 'text' ? res.content[0].text.trim() : ''
    return text || userPrompt
  } catch {
    return userPrompt
  }
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const apiKey = process.env.MESHY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Meshy API key not configured' }, { status: 503 })
    }

    const enhanced = await enhancePrompt(prompt.trim())
    const taskId = await startTask(enhanced, apiKey)
    const deadline = Date.now() + TIMEOUT_MS

    while (Date.now() < deadline) {
      await sleep(POLL_MS)
      const task = await getTask(taskId, apiKey)

      if (task.status === 'SUCCEEDED') {
        const glbUrl = task.model_urls?.glb
        if (!glbUrl) {
          return NextResponse.json({ error: 'Generation succeeded but GLB URL is missing' }, { status: 500 })
        }
        // Fetch GLB server-side so the browser never has to reach Meshy's CDN directly
        const glbRes = await fetch(glbUrl)
        if (!glbRes.ok) {
          return NextResponse.json({ error: `Failed to fetch GLB binary: ${glbRes.status}` }, { status: 502 })
        }
        const buffer = await glbRes.arrayBuffer()
        const model_data = Buffer.from(buffer).toString('base64')
        return NextResponse.json({ model_data, content_type: 'model/gltf-binary' })
      }

      if (task.status === 'FAILED' || task.status === 'EXPIRED') {
        const reason = task.task_error?.message || task.status
        return NextResponse.json({ error: `Generation failed: ${reason}` }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Generation timed out after 300 seconds' }, { status: 504 })
  } catch (error: any) {
    console.error('generate-3d error:', error?.message)
    return NextResponse.json(
      { error: error?.message || 'Generation service unavailable' },
      { status: 500 }
    )
  }
}

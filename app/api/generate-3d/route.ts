import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MESHY_BASE = 'https://api.meshy.ai/openapi/v2/text-to-3d'
const POLL_MS = 5_000
const PREVIEW_TIMEOUT_MS = 90_000

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

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
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

    // Step 1: Enhance prompt
    console.log('Step 1: Enhancing prompt with Claude...')
    const enhanced = await enhancePrompt(prompt.trim())
    console.log('Enhanced prompt:', enhanced)

    // Step 2: Start preview task
    console.log('Step 2: Starting Meshy text-to-3D preview...')
    const previewRes = await fetch(MESHY_BASE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'preview', prompt: enhanced, art_style: 'realistic', should_remesh: true }),
    })
    if (!previewRes.ok) {
      const body = await previewRes.text()
      throw new Error(`Meshy preview start failed ${previewRes.status}: ${body.slice(0, 200)}`)
    }
    const previewId: string = (await previewRes.json()).result
    console.log('Preview task ID:', previewId)

    // Step 3: Poll preview until SUCCEEDED
    const previewDeadline = Date.now() + PREVIEW_TIMEOUT_MS
    let previewGlbUrl: string | null = null

    while (Date.now() < previewDeadline) {
      await sleep(POLL_MS)
      const pollRes = await fetch(`${MESHY_BASE}/${previewId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!pollRes.ok) throw new Error(`Meshy preview poll failed: ${pollRes.status}`)
      const task = await pollRes.json()
      console.log('Step 4: Polling Meshy preview... status:', task.status)

      if (task.status === 'SUCCEEDED') {
        previewGlbUrl = task.model_urls?.glb ?? null
        console.log('Preview succeeded, GLB URL:', previewGlbUrl)
        break
      }
      if (task.status === 'FAILED' || task.status === 'EXPIRED') {
        const reason = task.task_error?.message || task.status
        return NextResponse.json({ error: `Preview failed: ${reason}` }, { status: 500 })
      }
    }

    if (!previewGlbUrl) {
      return NextResponse.json({ error: 'Generation timed out during preview' }, { status: 504 })
    }

    // Fetch preview GLB server-side as base64 to avoid client CORS issues
    const previewGlbRes = await fetch(previewGlbUrl)
    if (!previewGlbRes.ok) throw new Error(`Failed to fetch preview GLB: ${previewGlbRes.status}`)
    const previewGlbBase64 = Buffer.from(await previewGlbRes.arrayBuffer()).toString('base64')

    // 2s delay before starting refine — Meshy requires preview to fully settle
    await sleep(2000)

    // Step 4: Start refine task — return immediately, browser polls
    console.log('Step 5: Starting refine step, preview ID:', previewId)
    const refineBody = { mode: 'refine', preview_task_id: previewId, texture_richness: 'high' }
    console.log('Refine request body:', JSON.stringify(refineBody))

    const refineRes = await fetch(MESHY_BASE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(refineBody),
    })
    if (!refineRes.ok) {
      const body = await refineRes.text()
      throw new Error(`Meshy refine start failed ${refineRes.status}: ${body.slice(0, 200)}`)
    }
    const refineId: string = (await refineRes.json()).result
    console.log('Refine task ID:', refineId)

    return NextResponse.json({
      preview_glb: previewGlbBase64,
      refine_task_id: refineId,
    })

  } catch (error: any) {
    console.error('generate-3d error:', error?.message)
    return NextResponse.json(
      { error: error?.message || 'Generation service unavailable' },
      { status: 500 }
    )
  }
}

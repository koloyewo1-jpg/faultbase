import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import FormData from 'form-data'

export const maxDuration = 300

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MESHY_TEXT_TO_3D = 'https://api.meshy.ai/openapi/v2/text-to-3d'
const MESHY_IMAGE_TO_3D = 'https://api.meshy.ai/openapi/v1/image-to-3d'
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent'
const POLL_MS = 5_000
const TIMEOUT_MS = 300_000

// ── Step 1: Claude prompt enhancement ───────────────────────────────────────

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

// ── Step 2a: Gemini image generation ────────────────────────────────────────

async function generateConceptImage(enhancedPrompt: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) throw new Error('Gemini API key not configured')

  const res = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Generate a photorealistic product image of: ${enhancedPrompt}. White background, studio lighting, single object centered, high detail, engineering quality render.`,
        }],
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Gemini image generation failed ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = await res.json()
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find((p: any) => p.inlineData)
  if (!imagePart) throw new Error('Gemini returned no image in response')

  const { data: base64data, mimeType } = imagePart.inlineData
  return { buffer: Buffer.from(base64data, 'base64'), mimeType: mimeType ?? 'image/jpeg' }
}

// ── Step 2b: Meshy image-to-3D ───────────────────────────────────────────────

async function startImageTo3DTask(imageBuffer: Buffer, imageMimeType: string, apiKey: string): Promise<string> {
  const form = new FormData()
  form.append('image_file', imageBuffer, {
    filename: 'component.jpg',
    contentType: imageMimeType,
  })
  form.append('enable_pbr', 'true')

  const res = await fetch(MESHY_IMAGE_TO_3D, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...form.getHeaders(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: form.getBuffer() as any,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meshy image-to-3D start failed ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.result as string
}

async function pollImageTask(id: string, apiKey: string) {
  const res = await fetch(`${MESHY_IMAGE_TO_3D}/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`Meshy image-to-3D poll failed: ${res.status}`)
  return res.json()
}

// ── Fallback: Meshy text-to-3D ───────────────────────────────────────────────

async function startTextTo3DTask(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(MESHY_TEXT_TO_3D, {
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
    throw new Error(`Meshy text-to-3D start failed ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.result as string
}

async function pollTextTask(id: string, apiKey: string) {
  const res = await fetch(`${MESHY_TEXT_TO_3D}/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`Meshy text-to-3D poll failed: ${res.status}`)
  return res.json()
}

// ── Shared helpers ───────────────────────────────────────────────────────────

async function fetchGlbAsBase64(glbUrl: string): Promise<string> {
  const glbRes = await fetch(glbUrl)
  if (!glbRes.ok) throw new Error(`Failed to fetch GLB binary: ${glbRes.status}`)
  const buffer = await glbRes.arrayBuffer()
  return Buffer.from(buffer).toString('base64')
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// ── Route handler ────────────────────────────────────────────────────────────

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

    const deadline = Date.now() + TIMEOUT_MS

    // Step 1: Enhance prompt with Claude
    console.log('Step 1: Enhancing prompt with Claude...')
    const enhanced = await enhancePrompt(prompt.trim())
    console.log('Enhanced prompt:', enhanced)

    // ── Primary path: Gemini image → Meshy image-to-3D ──────────────────────
    try {
      console.log('Step 2: Calling Gemini for image...')
      const { buffer: imageBuffer, mimeType: imageMimeType } = await generateConceptImage(enhanced)
      console.log('Gemini result: success, mimeType:', imageMimeType, 'bytes:', imageBuffer.length)

      console.log('Step 3: Sending to Meshy image-to-3D...')
      const taskId = await startImageTo3DTask(imageBuffer, imageMimeType, apiKey)
      console.log('Meshy image-to-3D task ID:', taskId)

      while (Date.now() < deadline) {
        await sleep(POLL_MS)
        const task = await pollImageTask(taskId, apiKey)
        console.log('Step 4: Polling Meshy image-to-3D... status:', task.status)

        if (task.status === 'SUCCEEDED') {
          const glbUrl = task.model_urls?.glb
          console.log('Final GLB URL:', glbUrl)
          if (!glbUrl) throw new Error('image-to-3D succeeded but GLB URL is missing')
          const model_data = await fetchGlbAsBase64(glbUrl)
          return NextResponse.json({ model_data, content_type: 'model/gltf-binary' })
        }

        if (task.status === 'FAILED' || task.status === 'EXPIRED') {
          throw new Error(`image-to-3D task ${task.status}: ${task.task_error?.message ?? ''}`)
        }
      }

      throw new Error('image-to-3D timed out')
    } catch (geminiError: any) {
      console.error('Gemini result: failed —', geminiError?.message)
      console.log('Step 3: Falling back to Meshy text-to-3D...')
    }

    // ── Fallback: Meshy text-to-3D with enhanced prompt ─────────────────────
    const taskId = await startTextTo3DTask(enhanced, apiKey)
    console.log('Meshy text-to-3D task ID:', taskId)

    while (Date.now() < deadline) {
      await sleep(POLL_MS)
      const task = await pollTextTask(taskId, apiKey)
      console.log('Step 4: Polling Meshy text-to-3D... status:', task.status)

      if (task.status === 'SUCCEEDED') {
        const glbUrl = task.model_urls?.glb
        console.log('Final GLB URL:', glbUrl)
        if (!glbUrl) {
          return NextResponse.json({ error: 'Generation succeeded but GLB URL is missing' }, { status: 500 })
        }
        const model_data = await fetchGlbAsBase64(glbUrl)
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

import { NextRequest, NextResponse } from 'next/server'

const MESHY_BASE = 'https://api.meshy.ai/openapi/v2/text-to-3d'
const POLL_MS = 3_000
const TIMEOUT_MS = 120_000

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

    const taskId = await startTask(prompt.trim(), apiKey)
    const deadline = Date.now() + TIMEOUT_MS

    while (Date.now() < deadline) {
      await sleep(POLL_MS)
      const task = await getTask(taskId, apiKey)

      if (task.status === 'SUCCEEDED') {
        const glbUrl = task.model_urls?.glb
        if (!glbUrl) {
          return NextResponse.json({ error: 'Generation succeeded but GLB URL is missing' }, { status: 500 })
        }
        return NextResponse.json({ model_url: glbUrl })
      }

      if (task.status === 'FAILED' || task.status === 'EXPIRED') {
        const reason = task.task_error?.message || task.status
        return NextResponse.json({ error: `Generation failed: ${reason}` }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Generation timed out after 120 seconds' }, { status: 504 })
  } catch (error: any) {
    console.error('generate-3d error:', error?.message)
    return NextResponse.json(
      { error: error?.message || 'Generation service unavailable' },
      { status: 500 }
    )
  }
}

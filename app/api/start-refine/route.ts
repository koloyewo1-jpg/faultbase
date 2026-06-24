import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

const MESHY_BASE = 'https://api.meshy.ai/openapi/v2/text-to-3d'

export async function POST(req: NextRequest) {
  try {
    const { preview_task_id } = await req.json()
    if (!preview_task_id) {
      return NextResponse.json({ error: 'preview_task_id is required' }, { status: 400 })
    }

    const apiKey = process.env.MESHY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Meshy API key not configured' }, { status: 503 })
    }

    const refineBody = { mode: 'refine', preview_task_id, texture_richness: 'high' }
    console.log('Starting refine, preview_task_id:', preview_task_id)
    console.log('Refine request body:', JSON.stringify(refineBody))

    const res = await fetch(MESHY_BASE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(refineBody),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Meshy refine start failed ${res.status}: ${body.slice(0, 200)}`)
    }
    const refine_task_id: string = (await res.json()).result
    console.log('Refine task ID:', refine_task_id)

    return NextResponse.json({ refine_task_id })

  } catch (error: any) {
    console.error('start-refine error:', error?.message)
    return NextResponse.json({ error: error?.message || 'Failed to start refine' }, { status: 500 })
  }
}

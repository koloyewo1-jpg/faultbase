import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

const MESHY_BASE = 'https://api.meshy.ai/openapi/v2/text-to-3d'

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get('task_id')
  if (!taskId) {
    return NextResponse.json({ error: 'task_id param required' }, { status: 400 })
  }

  const apiKey = process.env.MESHY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Meshy API key not configured' }, { status: 503 })
  }

  try {
    const res = await fetch(`${MESHY_BASE}/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) {
      return NextResponse.json({ error: `Meshy poll failed: ${res.status}` }, { status: res.status })
    }
    const task = await res.json()
    console.log('Refine status:', task.status)
    return NextResponse.json({ status: task.status, model_urls: task.model_urls ?? null })
  } catch (error: any) {
    console.error('poll-3d error:', error?.message)
    return NextResponse.json({ error: error?.message || 'Poll failed' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop()

  if (ext === 'pdf') {
    // Import from lib path to prevent pdf-parse loading its test files at import time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse.js')
    const data = await pdfParse(buffer)
    return data.text as string
  }

  if (ext === 'docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  throw new Error('Unsupported file type. Please upload a PDF or DOCX file.')
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const machineType = formData.get('machine_type') as string | null

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    if (!machineType) return NextResponse.json({ error: 'machine_type is required' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let text: string
    try {
      text = await extractText(buffer, file.name)
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 422 })
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'Could not extract any text from the file' }, { status: 422 })
    }

    // Truncate to ~30k chars to stay within token limits
    const truncated = text.slice(0, 30000)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: `You are an expert maintenance engineer. Extract all fault records from this machine manual text. For each fault, return a JSON array where each item has: fault_title, category, machine_id, symptoms (array), likely_causes (array of objects with description and rank), checks_to_perform (array of objects with instruction), safety_precautions (array), escalation_guidance, status set to 'draft'. Return only valid JSON, no other text.`,
      messages: [{
        role: 'user',
        content: `Machine type: ${machineType}\n\nManual text:\n${truncated}`,
      }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : '[]'
    const clean = raw.replace(/```json\s*|```/g, '').trim()

    let faults: any[]
    try {
      faults = JSON.parse(clean)
    } catch {
      return NextResponse.json(
        { error: 'AI returned malformed JSON', raw: raw.slice(0, 500) },
        { status: 500 }
      )
    }

    if (!Array.isArray(faults)) {
      return NextResponse.json(
        { error: 'AI response was not a JSON array', raw: raw.slice(0, 500) },
        { status: 500 }
      )
    }

    return NextResponse.json({ faults, count: faults.length })
  } catch (err: any) {
    console.error('Upload manual error:', err?.message || err)
    return NextResponse.json({ error: err.message ?? 'Extraction failed' }, { status: 500 })
  }
}

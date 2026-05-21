import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function readKnowledgeBase() {
  const filePath = path.join(process.cwd(), 'data', 'knowledge-base.json')
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function searchFaults(machineId: string, input: string) {
  const kb = readKnowledgeBase()

  return kb.faults.filter((fault: any) => {
    // Only approved faults — hard rule
    if (fault.status !== 'approved') return false
    if (fault.machine_id !== machineId) return false

    const searchable = [
      fault.fault_code,
      fault.title,
      fault.description,
      fault.meaning,
      ...fault.causes.map((c: any) => c.cause)
    ].join(' ').toLowerCase()

    const words = input.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3)

    return fault.fault_code.toLowerCase().includes(input.toLowerCase()) ||
      words.some(word => searchable.includes(word))
  })
}

export async function POST(req: NextRequest) {
  try {
    const { machine_id, input } = await req.json()

    if (!machine_id || !input) {
      return NextResponse.json(
        { error: 'machine_id and input are required' },
        { status: 400 }
      )
    }

    // Search approved faults only
    const matched = searchFaults(machine_id, input)

    // No match — do NOT call AI
    if (matched.length === 0) {
      return NextResponse.json({
        matched: false,
        message: 'No approved fault records found for this description. Contact your engineer to add this fault to the knowledge base.'
      })
    }

    // Build context from matched faults only
    const faultContext = matched.map((f: any) => `
FAULT RECORD
Code: ${f.fault_code}
Title: ${f.title}
Meaning: ${f.meaning}
Causes: ${JSON.stringify(f.causes)}
Actions: ${JSON.stringify(f.actions)}
Safety: ${JSON.stringify(f.safety_precautions)}
Tools: ${JSON.stringify(f.tools_required)}
Fix time: ${f.estimated_fix_mins} minutes
Escalation: ${f.escalation_guidance}
`).join('\n---\n')

    // Call AI with strict instructions
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      system: `You are a maintenance support assistant in a GMP manufacturing environment.
STRICT RULES:
1. Only use information from the fault records provided. Do not add, invent or infer anything.
2. Always list safety precautions first and prominently.
3. Return ONLY a JSON object — no other text.

Return this exact JSON structure:
{
  "fault_code": "string",
  "title": "string", 
  "meaning": "string",
  "safety_precautions": ["string"],
  "top_causes": [{"rank": number, "cause": "string", "likelihood": "string"}],
  "actions": [{"step": number, "instruction": "string", "caution": boolean}],
  "tools_required": ["string"],
  "estimated_fix_mins": number,
  "escalation_guidance": "string"
}`,
      messages: [{
        role: 'user',
        content: `Technician input: "${input}"

Fault records from approved knowledge base:
${faultContext}

Using ONLY the above records, provide a structured diagnosis.`
      }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const clean = text.replace(/```json|```/g, '').trim()
const diagnosis = JSON.parse(clean)

    return NextResponse.json({ matched: true, diagnosis })

  } catch (error) {
    console.error('Diagnosis error:', error)
    return NextResponse.json(
      { error: 'Diagnosis service unavailable' },
      { status: 500 }
    )
  }
}
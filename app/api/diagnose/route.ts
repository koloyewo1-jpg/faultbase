import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import knowledgeBase from '../../../data/knowledge-base.json'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getApprovedFaults(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('fault_records')
      .select('*')
      .eq('status', 'approved')

    if (!error && data && data.length > 0) return data
  } catch {
    // fall through to local JSON
  }
  // Fallback: local knowledge-base.json
  return (knowledgeBase as any).faults.filter((f: any) => f.status === 'approved')
}

function searchFaults(faults: any[], machineId: string, input: string) {
  const inputLower = input.toLowerCase()
  // Split on spaces AND hyphens so "e-stop" → ["e","stop"], keep words ≥ 3 chars
  const words = inputLower.split(/[\s\-\/]+/).filter(w => w.length >= 3)

  type ScoredFault = { fault: any; score: number; wordMatches: number; idMatch: boolean }

  const scored: ScoredFault[] = faults
    .map((fault: any) => {
      const searchable = [
        fault.id,
        fault.title,
        fault.category,
        fault.meaning,
        ...(fault.symptoms ?? []),
        ...(fault.causes ?? []).map((c: any) => c.cause),
      ].join(' ').toLowerCase()

      const idMatch = fault.id.toLowerCase().includes(inputLower)
      const wordMatches = words.filter(w => searchable.includes(w)).length
      if (!idMatch && wordMatches === 0) return null

      const machineBonus = fault.machine_id === machineId ? 10 : 0
      const score = (idMatch ? 20 : 0) + wordMatches + machineBonus

      return { fault, score, wordMatches, idMatch }
    })
    .filter(Boolean) as ScoredFault[]

  scored.sort((a, b) => b.score - a.score)

  return {
    faults: scored.slice(0, 3).map(s => s.fault),
    topWordMatches: scored.length > 0 ? scored[0].wordMatches : 0,
    hasIdMatch: scored.length > 0 ? scored[0].idMatch : false,
  }
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

    const allFaults = await getApprovedFaults()
    const { faults: matched, topWordMatches, hasIdMatch } = searchFaults(allFaults, machine_id, input)

    if (matched.length === 0) {
      return NextResponse.json({
        matched: false,
        message: 'No approved fault records found for this description. Contact your engineer to add this fault to the knowledge base.'
      })
    }

    // Only reject if truly zero keyword matches and no fault code match — pure gibberish
    if (!hasIdMatch && topWordMatches < 1) {
      return NextResponse.json({
        lowConfidence: true,
        message: 'Your description is too vague to match a specific fault. Please describe what you see, what you hear, or what the machine is doing in more detail.'
      })
    }

    const faultContext = matched.map((f: any) => `
FAULT RECORD
ID: ${f.id}
Title: ${f.title}
Category: ${f.category}
Meaning: ${f.meaning}
Symptoms: ${JSON.stringify(f.symptoms)}
Causes: ${JSON.stringify(f.causes)}
Checks: ${JSON.stringify(f.checks)}
Safety: ${JSON.stringify(f.safety_precautions)}
Escalation: ${f.escalation}
`).join('\n---\n')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: `You are a maintenance support assistant in a GMP manufacturing environment.
STRICT RULES:
1. Only use information from the fault records provided. Do not add, invent or infer anything.
2. Always list safety precautions first and prominently.
3. Return ONLY a JSON object — no other text.
4. Never use markdown formatting. No bullet points, no dashes, no asterisks, no bold, no headers. Write all text fields in plain professional sentences only.

Return this exact JSON structure:
{
  "fault_id": "string",
  "title": "string",
  "meaning": "string",
  "safety_precautions": ["string"],
  "top_causes": [{"rank": number, "cause": "string", "likelihood": "string"}],
  "actions": [{"step": number, "instruction": "string", "caution": boolean}],
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

    // Fire-and-forget: log diagnosis to Supabase (never blocks the response)
    supabase.from('diagnosis_logs').insert({
      machine_type: machine_id,
      user_query: input,
      matched_fault_id: matched[0]?.id ?? null,
      matched_fault_title: matched[0]?.title ?? null,
      match_confidence: 'high',
      ai_response_summary: text.substring(0, 500),
      low_confidence: false,
    }).then(() => {}, () => {})

    return NextResponse.json({ matched: true, diagnosis })

  } catch (error: any) {
    console.error('Diagnosis error:', error?.message || error)
    return NextResponse.json(
      { error: 'Diagnosis service unavailable', detail: error?.message },
      { status: 500 }
    )
  }
}

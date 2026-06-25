import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const KB_PATH = join(process.cwd(), 'data', 'knowledge-base.json')

function readKB() {
  return JSON.parse(readFileSync(KB_PATH, 'utf-8'))
}

export async function GET() {
  try {
    const kb = readKB()
    return NextResponse.json({ faults: kb.faults })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, title, category, machine_id, status, symptoms, causes, checks } = body

    if (!title?.trim() || !category?.trim() || !machine_id?.trim()) {
      return NextResponse.json({ error: 'title, category and machine_id are required' }, { status: 400 })
    }

    const kb = readKB()

    if (id) {
      const idx = kb.faults.findIndex((f: any) => f.id === id)
      if (idx === -1) return NextResponse.json({ error: 'Fault not found' }, { status: 404 })
      kb.faults[idx] = {
        ...kb.faults[idx],
        title,
        category,
        machine_id,
        status,
        symptoms: symptoms ?? [],
        causes: causes ?? [],
        checks: checks ?? [],
      }
    } else {
      const maxNum = kb.faults.reduce((max: number, f: any) => {
        const n = parseInt(f.id.replace(/^KB-/, ''), 10)
        return isNaN(n) ? max : Math.max(max, n)
      }, 0)
      const newId = `KB-${String(maxNum + 1).padStart(3, '0')}`
      kb.faults.push({
        id: newId,
        title,
        category,
        machine_id,
        status: status ?? 'draft',
        symptoms: symptoms ?? [],
        causes: causes ?? [],
        checks: checks ?? [],
        meaning: '',
        components: [],
        safety_precautions: [],
        escalation: '',
        documentation_notes: '',
        gmp_notes: '',
        preventive_actions: [],
        reliability_improvements: [],
      })
    }

    writeFileSync(KB_PATH, JSON.stringify(kb, null, 2))
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

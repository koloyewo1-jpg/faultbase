import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import knowledgeBase from '../../../../data/knowledge-base.json'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function kbRecord(f: any) {
  return {
    id: f.id,
    title: f.title,
    category: f.category,
    machine_id: f.machine_id,
    status: f.status ?? 'draft',
    symptoms: f.symptoms ?? [],
    meaning: f.meaning ?? '',
    causes: f.causes ?? [],
    checks: f.checks ?? [],
    components: f.components ?? [],
    safety_precautions: f.safety_precautions ?? [],
    escalation: f.escalation ?? '',
    documentation_notes: f.documentation_notes ?? '',
    gmp_notes: f.gmp_notes ?? '',
    preventive_actions: f.preventive_actions ?? [],
    reliability_improvements: f.reliability_improvements ?? [],
  }
}

async function seedIfEmpty(data: any[]) {
  if (data.length > 0) return
  const kb = knowledgeBase as any
  const records = kb.faults.map(kbRecord)
  await supabase.from('fault_records').upsert(records, { onConflict: 'id' })
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('fault_records')
      .select('*')
      .order('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await seedIfEmpty(data ?? [])

    if (data && data.length > 0) {
      return NextResponse.json({ faults: data })
    }

    // Return freshly seeded data
    const { data: seeded, error: seedErr } = await supabase
      .from('fault_records')
      .select('*')
      .order('id')

    if (seedErr) return NextResponse.json({ error: seedErr.message }, { status: 500 })
    return NextResponse.json({ faults: seeded ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, title, category, machine_id, status, symptoms, causes, checks } = body

    if (!title?.trim() || !category?.trim() || !machine_id?.trim()) {
      return NextResponse.json(
        { error: 'title, category and machine_id are required' },
        { status: 400 }
      )
    }

    if (id) {
      const { error } = await supabase
        .from('fault_records')
        .update({
          title: title.trim(),
          category: category.trim(),
          machine_id: machine_id.trim(),
          status,
          symptoms: symptoms ?? [],
          causes: causes ?? [],
          checks: checks ?? [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { data: existing } = await supabase
        .from('fault_records')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)

      const maxNum = (existing ?? []).reduce((max: number, r: any) => {
        const n = parseInt(r.id.replace(/^KB-/, ''), 10)
        return isNaN(n) ? max : Math.max(max, n)
      }, 0)
      const newId = `KB-${String(maxNum + 1).padStart(3, '0')}`

      const { error } = await supabase.from('fault_records').insert({
        id: newId,
        title: title.trim(),
        category: category.trim(),
        machine_id: machine_id.trim(),
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

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

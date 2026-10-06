import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CREATE_TABLE_SQL = `
create table if not exists circuit_trace_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  machine text not null,
  fault text not null,
  circuit_id text not null,
  readings jsonb not null default '[]'::jsonb,
  conclusion jsonb,
  safety_confirmed jsonb not null
);
`.trim()

// Best-effort table creation through an exec_sql RPC function, if one exists
// on the Supabase project. The service role REST client cannot run arbitrary
// DDL on its own, so this only succeeds if that helper function is present.
async function tryCreateTable() {
  try {
    await supabase.rpc('exec_sql', { sql: CREATE_TABLE_SQL })
  } catch {
    // ignored: fall through to the manual migration instructions below
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { machine, fault, circuitId, readings, conclusion, safetyConfirmed } = body ?? {}

    if (!machine || !fault || !circuitId) {
      return NextResponse.json({ error: 'machine, fault and circuitId are required' }, { status: 400 })
    }
    if (!safetyConfirmed) {
      return NextResponse.json({ error: 'Safety confirmations are required before saving.' }, { status: 400 })
    }

    const record = {
      machine,
      fault,
      circuit_id: circuitId,
      readings: readings ?? [],
      conclusion: conclusion ?? null,
      safety_confirmed: safetyConfirmed,
    }

    let { error } = await supabase.from('circuit_trace_reports').insert(record)

    if (error && error.code === '42P01') {
      await tryCreateTable()
      ;({ error } = await supabase.from('circuit_trace_reports').insert(record))
    }

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          {
            error:
              'The circuit_trace_reports table does not exist yet. Run supabase/migrations/20261006_circuit_trace_reports.sql in the Supabase SQL editor, then save again.',
          },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ saved: true })
  } catch (err: any) {
    console.error('Circuit trace save error:', err?.message || err)
    return NextResponse.json({ error: err.message ?? 'Could not save the diagnostic report.' }, { status: 500 })
  }
}

'use client'
import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import v1MotorControl from '../../lib/circuit-trace/circuits/v1-motor-control'
import { applyReading, createInitialState, getNextTestPoint } from '../../lib/circuit-trace/engine'
import { NodeStatus, SafetyConfirmation, TraceState } from '../../lib/circuit-trace/types'

const CIRCUIT = v1MotorControl

const STATUS_LABEL: Record<TraceState['status'], string> = {
  in_progress: 'Fault tracing in progress',
  isolated: 'Fault isolated',
  supply_fault: 'Supply fault',
  complete: 'Trace complete',
}

function TopBar() {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <a href="/" style={{ textDecoration: 'none' }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>
          Kolatron<span style={{ color: '#185FA5' }}>.ai</span>
        </span>
      </a>
      <span style={{ fontSize: 11, color: '#6b7280' }}>Circuit Trace</span>
    </div>
  )
}

function StatusMarker({ status }: { status: NodeStatus }) {
  const size = 26
  if (status === 'healthy') {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    )
  }
  if (status === 'fault') {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2l8 8M10 2l-8 8" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    )
  }
  if (status === 'degraded') {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6h8" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
    )
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#fff', border: '2px solid #d1d5db', flexShrink: 0 }} />
  )
}

function CircuitDiagram({ traceState }: { traceState: TraceState }) {
  const statusByNode = useMemo(() => {
    const map: Record<string, NodeStatus> = {}
    traceState.nodes.forEach(n => { map[n.id] = n.status })
    return map
  }, [traceState.nodes])

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 16px', marginBottom: 16, boxSizing: 'border-box' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Circuit diagram</div>
      <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingBottom: 4 }}>
        {CIRCUIT.nodes.map((node, i) => (
          <div key={node.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 72 }}>
              <StatusMarker status={statusByNode[node.id] ?? 'untested'} />
              <div style={{ fontSize: 11, color: '#374151', textAlign: 'center', marginTop: 6, lineHeight: 1.3 }}>{node.label}</div>
            </div>
            {i < CIRCUIT.nodes.length - 1 && (
              <div style={{ width: 28, height: 2, background: '#d1d5db', flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>{CIRCUIT.label}</div>
    </div>
  )
}

function SafetyGate({ onStart }: { onStart: (confirmation: SafetyConfirmation) => void }) {
  const [c1, setC1] = useState(false)
  const [c2, setC2] = useState(false)
  const [c3, setC3] = useState(false)
  const allChecked = c1 && c2 && c3

  const items: Array<[string, boolean, (v: boolean) => void]> = [
    ['Power circuit to the motor is isolated and locked off', c1, setC1],
    ['Live working on the 24VDC control circuit is covered by a risk assessment', c2, setC2],
    ['I am a competent person authorised to carry out this work', c3, setC3],
  ]

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '28px 24px', maxWidth: 480, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Safety confirmation required</div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 20 }}>
          Circuit Trace involves taking live voltage measurements. Confirm all of the following before the first test.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          {items.map(([label, checked, setChecked], i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
                style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: '#185FA5' }}
              />
              <span style={{ fontSize: 14, color: '#111827', lineHeight: 1.5 }}>{label}</span>
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={!allChecked}
          onClick={() => onStart({ powerIsolated: c1, riskAssessmentCovered: c2, competentPerson: c3 })}
          style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, background: allChecked ? '#185FA5' : '#93c5fd', color: '#fff', border: 'none', borderRadius: 8, cursor: allChecked ? 'pointer' : 'not-allowed', fontFamily: 'system-ui, sans-serif' }}
        >
          Start Circuit Trace
        </button>
      </div>
    </div>
  )
}

function CircuitTraceInner() {
  const searchParams = useSearchParams()
  const machine = searchParams.get('machine') ?? 'Unspecified machine'
  const fault = searchParams.get('fault') ?? 'Unspecified fault'

  const [traceState, setTraceState] = useState<TraceState | null>(null)
  const [voltageInput, setVoltageInput] = useState('')
  const [inputError, setInputError] = useState('')
  const [rangeWarning, setRangeWarning] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')

  function handleStart(confirmation: SafetyConfirmation) {
    const initial = createInitialState(CIRCUIT, machine, fault)
    setTraceState({ ...initial, safetyConfirmed: confirmation })
  }

  function handleReset() {
    setTraceState(null)
    setVoltageInput('')
    setInputError('')
    setRangeWarning(false)
    setSaveStatus('idle')
    setSaveError('')
  }

  function handleSubmitReading() {
    if (!traceState) return
    const nextTestPoint = getNextTestPoint(CIRCUIT, traceState)
    if (!nextTestPoint) return

    const voltage = parseFloat(voltageInput)
    if (voltageInput.trim() === '' || Number.isNaN(voltage)) {
      setInputError('Enter a numeric voltage reading.')
      return
    }

    setInputError('')
    setRangeWarning(voltage > 26)

    const updated = applyReading(CIRCUIT, traceState, {
      testPointId: nextTestPoint.id,
      voltage,
      timestamp: Date.now(),
    })
    setTraceState(updated)
    setVoltageInput('')
  }

  async function handleSave() {
    if (!traceState) return
    setSaveStatus('saving')
    setSaveError('')
    try {
      const res = await fetch('/api/circuit-trace/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(traceState),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setSaveStatus('error')
        setSaveError(data.error ?? 'Could not save the diagnostic report.')
        return
      }
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
      setSaveError('Network error. The diagnostic report was not saved.')
    }
  }

  if (!traceState) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
        <TopBar />
        <SafetyGate onStart={handleStart} />
      </div>
    )
  }

  const nextTestPoint = getNextTestPoint(CIRCUIT, traceState)
  const readingsWithLabels = traceState.readings.map(r => {
    const tp = CIRCUIT.testPoints.find(t => t.id === r.testPointId)
    return { ...r, label: tp?.label ?? r.testPointId }
  })

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
      <TopBar />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px', boxSizing: 'border-box', width: '100%' }}>

        {/* Header card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px', marginBottom: 16, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Machine</div>
              <div style={{ fontSize: 14, color: '#111827', fontWeight: 600 }}>{traceState.machine}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Fault</div>
              <div style={{ fontSize: 14, color: '#111827', fontWeight: 600 }}>{traceState.fault}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Status</div>
              <div style={{ fontSize: 14, color: '#185FA5', fontWeight: 600 }}>{STATUS_LABEL[traceState.status]}</div>
            </div>
          </div>
        </div>

        <CircuitDiagram traceState={traceState} />

        {/* Test card */}
        {traceState.status === 'in_progress' && nextTestPoint && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px', marginBottom: 16, boxSizing: 'border-box' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{nextTestPoint.label}</div>
            <div style={{ fontSize: 14, color: '#111827', lineHeight: 1.5, marginBottom: 14 }}>{nextTestPoint.instruction}</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={voltageInput}
                onChange={e => setVoltageInput(e.target.value)}
                placeholder="Voltage"
                style={{ flex: 1, padding: '10px 12px', fontSize: 15, border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', color: '#111827', boxSizing: 'border-box' }}
              />
              <span style={{ fontSize: 13, color: '#6b7280' }}>V DC to 0V</span>
            </div>
            {inputError && (
              <div style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>{inputError}</div>
            )}
            {rangeWarning && (
              <div style={{ fontSize: 12, color: '#92400e', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 10px', marginTop: 10, lineHeight: 1.5 }}>
                This reading is above the expected range for a healthy 24VDC circuit. Recheck the meter range and that the reference lead is on 0V, then take the reading again.
              </div>
            )}
            <button
              type="button"
              onClick={handleSubmitReading}
              style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'system-ui, sans-serif', marginTop: 14 }}
            >
              Submit Reading
            </button>
          </div>
        )}

        {/* Result card */}
        {traceState.status !== 'in_progress' && traceState.conclusion && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '16px', marginBottom: 16, boxSizing: 'border-box' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', letterSpacing: '0.04em', marginBottom: 10 }}>{traceState.conclusion.headline}</div>
            {traceState.conclusion.componentLabel && (
              <div style={{ fontSize: 15, color: '#111827', fontWeight: 600, marginBottom: 4 }}>{traceState.conclusion.componentLabel}</div>
            )}
            {traceState.conclusion.wiring && (
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, marginBottom: 14 }}>{traceState.conclusion.wiring}</div>
            )}

            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Evidence</div>
            <div style={{ marginBottom: 14 }}>
              {traceState.conclusion.evidence.map((e, i) => (
                <div key={i} style={{ fontSize: 13, color: '#374151', padding: '3px 0', display: 'flex', gap: 8, lineHeight: 1.5 }}>
                  <span style={{ flexShrink: 0 }}>•</span><span>{e}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Recommended checks</div>
            <div>
              {traceState.conclusion.recommendedChecks.map((c, i) => (
                <div key={i} style={{ fontSize: 13, color: '#111827', padding: '3px 0', display: 'flex', gap: 8, lineHeight: 1.5 }}>
                  <span style={{ flexShrink: 0, color: '#9ca3af' }}>{i + 1}.</span><span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Readings log */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px', marginBottom: 16, boxSizing: 'border-box' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Readings log</div>
          {readingsWithLabels.length === 0 ? (
            <div style={{ fontSize: 13, color: '#9ca3af' }}>No readings taken yet.</div>
          ) : (
            readingsWithLabels.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                <span style={{ color: '#374151' }}>{r.label}</span>
                <span style={{ color: '#111827', fontWeight: 600 }}>{r.voltage}V</span>
              </div>
            ))
          )}
        </div>

        {/* Save and reset */}
        {traceState.status !== 'in_progress' && (
          <div style={{ marginBottom: 12 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveStatus === 'saving' || saveStatus === 'saved'}
              style={{ width: '100%', padding: '14px', fontSize: 14, fontWeight: 700, background: saveStatus === 'saved' ? '#16a34a' : '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer', fontFamily: 'system-ui, sans-serif', marginBottom: 8 }}
            >
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Diagnostic report saved' : 'Save Diagnostic Report'}
            </button>
            {saveStatus === 'error' && (
              <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 8 }}>{saveError}</div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleReset}
          style={{ width: '100%', padding: '14px', fontSize: 14, fontWeight: 500, background: '#fff', color: '#185FA5', border: '1px solid #185FA5', borderRadius: 8, cursor: 'pointer', fontFamily: 'system-ui, sans-serif', marginBottom: 20 }}
        >
          Run another trace
        </button>
      </div>
    </div>
  )
}

export default function CircuitTracePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f9fafb' }} />}>
      <CircuitTraceInner />
    </Suspense>
  )
}

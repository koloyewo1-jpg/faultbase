import {
  CircuitDefinition,
  Conclusion,
  Node,
  NodeStatus,
  Reading,
  ReadingBand,
  TestPoint,
  TraceState,
} from './types'

export function classifyReading(voltage: number): ReadingBand {
  if (voltage > 26) return 'out_of_range'
  if (voltage >= 20) return 'healthy'
  if (voltage >= 2) return 'degraded'
  return 'lost'
}

export function createInitialState(
  circuit: CircuitDefinition,
  machine: string,
  fault: string
): TraceState {
  return {
    circuitId: circuit.id,
    machine,
    fault,
    nodes: circuit.nodes.map((n): Node => ({
      id: n.id,
      label: n.label,
      type: n.type,
      status: 'untested',
    })),
    readings: [],
    status: 'in_progress',
    conclusion: null,
    safetyConfirmed: null,
  }
}

// Derives the next test point from circuit shape and accumulated readings only.
// Walks test points in the order the circuit defines them (its series order)
// and returns the first one whose node has not yet been tested. Stops as soon
// as a terminal node (fault or degraded) is reached, since nothing downstream
// of a terminal result still needs testing.
export function getNextTestPoint(
  circuit: CircuitDefinition,
  state: TraceState
): TestPoint | null {
  if (state.status !== 'in_progress') return null

  for (const tp of circuit.testPoints) {
    const node = state.nodes.find(n => n.id === tp.nodeId)
    if (!node) continue
    if (node.status === 'untested') return tp
    if (node.status === 'fault' || node.status === 'degraded') return null
  }

  return null
}

function nodeStatusForBand(band: ReadingBand): NodeStatus | null {
  if (band === 'healthy') return 'healthy'
  if (band === 'degraded') return 'degraded'
  if (band === 'lost') return 'fault'
  return null // out_of_range: not a verdict on the node, ask the engineer to recheck
}

export function applyReading(
  circuit: CircuitDefinition,
  state: TraceState,
  reading: { testPointId: string; voltage: number; timestamp: number }
): TraceState {
  const testPoint = circuit.testPoints.find(tp => tp.id === reading.testPointId)
  if (!testPoint) return state

  const band = classifyReading(reading.voltage)
  const newReading: Reading = {
    testPointId: reading.testPointId,
    voltage: reading.voltage,
    timestamp: reading.timestamp,
  }
  const readings = [...state.readings, newReading]

  const nextStatus = nodeStatusForBand(band)
  const nodes = nextStatus
    ? state.nodes.map(n => (n.id === testPoint.nodeId ? { ...n, status: nextStatus } : n))
    : state.nodes

  let status = state.status
  const isSupplyTest = circuit.testPoints[0]?.id === testPoint.id

  if (band === 'lost') {
    status = isSupplyTest ? 'supply_fault' : 'isolated'
  } else if (band === 'degraded') {
    status = 'isolated'
  } else if (band === 'healthy') {
    const isLastTestPoint = circuit.testPoints[circuit.testPoints.length - 1]?.id === testPoint.id
    status = isLastTestPoint ? 'complete' : 'in_progress'
  }
  // out_of_range leaves status and node untouched; the engineer must retake the reading.

  const nextState: TraceState = { ...state, nodes, readings, status }
  return { ...nextState, conclusion: evaluateConclusion(circuit, nextState) }
}

export function evaluateConclusion(
  circuit: CircuitDefinition,
  state: TraceState
): Conclusion | null {
  if (state.status === 'in_progress') return null

  const orderedNodeIds = circuit.testPoints.map(tp => tp.nodeId)
  const findNodeDef = (id: string) => circuit.nodes.find(n => n.id === id) ?? null
  const latestReadingForNode = (nodeId: string): Reading | null => {
    for (let i = state.readings.length - 1; i >= 0; i--) {
      const tp = circuit.testPoints.find(t => t.id === state.readings[i].testPointId)
      if (tp?.nodeId === nodeId) return state.readings[i]
    }
    return null
  }

  if (state.status === 'supply_fault') {
    const supplyId = orderedNodeIds[0]
    const supplyDef = findNodeDef(supplyId)
    if (!supplyDef) return null
    const reading = latestReadingForNode(supplyId)
    return {
      headline: 'SUPPLY FAULT',
      componentId: supplyDef.id,
      componentLabel: supplyDef.label,
      wiring: null,
      evidence: [
        `Voltage at ${supplyDef.label} to 0V was ${reading ? `${reading.voltage}V` : 'lost'}, below the 2V threshold for a present supply.`,
        'The fault is upstream of the control circuit itself.',
      ],
      recommendedChecks: supplyDef.recommendedChecks,
    }
  }

  if (state.status === 'isolated') {
    const failingNode = state.nodes.find(n => n.status === 'fault' || n.status === 'degraded')
    if (!failingNode) return null

    const idx = orderedNodeIds.indexOf(failingNode.id)
    const lastHealthyId = idx > 0 ? orderedNodeIds[idx - 1] : null
    const lastHealthyDef = lastHealthyId ? findNodeDef(lastHealthyId) : null
    const failingDef = findNodeDef(failingNode.id)
    if (!failingDef) return null

    const reading = latestReadingForNode(failingNode.id)
    const degraded = failingNode.status === 'degraded'

    const evidence: string[] = []
    if (lastHealthyDef) {
      const lastReading = latestReadingForNode(lastHealthyDef.id)
      evidence.push(
        `Voltage at ${lastHealthyDef.label} to 0V was healthy${lastReading ? ` (${lastReading.voltage}V)` : ''}.`
      )
    }
    evidence.push(
      `Voltage at ${failingDef.label} to 0V was ${reading ? `${reading.voltage}V` : 'abnormal'}, classified as ${degraded ? 'degraded' : 'lost'}.`
    )
    if (degraded) {
      evidence.push(`Voltage drop across ${failingDef.label} indicates high resistance contact or poor termination.`)
    }

    const wiring = lastHealthyDef
      ? `${failingDef.label} and its associated wiring and terminals between ${lastHealthyDef.label} and ${failingDef.label}`
      : `${failingDef.label} and its associated wiring and terminals`

    return {
      headline: 'LIKELY FAULT ISOLATED',
      componentId: failingDef.id,
      componentLabel: failingDef.label,
      wiring,
      evidence,
      recommendedChecks: failingDef.recommendedChecks,
    }
  }

  if (state.status === 'complete') {
    const coilDef = circuit.nodes.find(n => n.type === 'coil')
    if (!coilDef) return null
    return {
      headline: 'LIKELY FAULT ISOLATED',
      componentId: coilDef.id,
      componentLabel: coilDef.label,
      wiring: 'KM1 coil winding (A1 to A2) or the 0V return path from A2 to 0V',
      evidence: [
        'All test points up to and including KM1 coil terminal A1 read healthy.',
        'The control circuit supply reaches the coil correctly, so the contactor not pulling in points to the coil itself or its return path.',
      ],
      recommendedChecks: coilDef.recommendedChecks,
    }
  }

  return null
}

export type NodeType = 'supply' | 'contact' | 'coil' | 'return'

export type NodeStatus = 'untested' | 'healthy' | 'degraded' | 'fault'

export interface Node {
  id: string
  label: string
  type: NodeType
  status: NodeStatus
}

export interface Edge {
  from: string
  to: string
}

export interface TestPoint {
  id: string
  nodeId: string
  label: string
  instruction: string
}

export interface Reading {
  testPointId: string
  voltage: number
  timestamp: number
}

export type ReadingBand = 'healthy' | 'degraded' | 'lost' | 'out_of_range'

export type TraceStatus = 'in_progress' | 'isolated' | 'supply_fault' | 'complete'

export interface SafetyConfirmation {
  powerIsolated: boolean
  riskAssessmentCovered: boolean
  competentPerson: boolean
}

export interface Conclusion {
  headline: string
  componentId: string | null
  componentLabel: string | null
  wiring: string | null
  evidence: string[]
  recommendedChecks: string[]
}

export interface TraceState {
  circuitId: string
  machine: string
  fault: string
  nodes: Node[]
  readings: Reading[]
  status: TraceStatus
  conclusion: Conclusion | null
  safetyConfirmed: SafetyConfirmation | null
}

// Static circuit definitions. The engine operates only on this shape, so any
// additional series circuit defined in the same shape works without changes.
export interface CircuitNodeDef {
  id: string
  label: string
  type: NodeType
  recommendedChecks: string[]
}

export interface CircuitDefinition {
  id: string
  label: string
  nodes: CircuitNodeDef[]
  edges: Edge[]
  testPoints: TestPoint[]
}

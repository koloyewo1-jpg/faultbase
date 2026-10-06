import { CircuitDefinition } from '../types'

// Simplified 24VDC series control circuit:
// 24V supply -> E-STOP (NC) -> STOP (NC) -> OL1 overload aux (NC) -> KM1 coil A1 -> A2 -> 0V
// All measurements are taken against 0V / common as the fixed reference.
const v1MotorControl: CircuitDefinition = {
  id: 'v1-motor-control',
  label: 'Simplified 24VDC control circuit (V1)',
  nodes: [
    {
      id: 'supply',
      label: '24V Supply',
      type: 'supply',
      recommendedChecks: [
        'Check the 24VDC power supply output LED.',
        'Check the power supply input.',
        'Check the control circuit fuse or MCB.',
        'Check the 0V reference connection.',
      ],
    },
    {
      id: 'estop',
      label: 'E-STOP (NC)',
      type: 'contact',
      recommendedChecks: [
        'Check that the E-stop is released and reset.',
        'Check the NC contact block is clipped to the operator correctly.',
        'Check the terminals.',
        'Check for a second E-stop in the chain.',
      ],
    },
    {
      id: 'stop',
      label: 'STOP (NC)',
      type: 'contact',
      recommendedChecks: [
        'Check the stop button NC contact.',
        'Check for a stuck or damaged actuator.',
        'Check the terminals and wiring.',
      ],
    },
    {
      id: 'ol1',
      label: 'OL1 Overload Aux (NC)',
      type: 'contact',
      recommendedChecks: [
        'Check whether OL1 has tripped.',
        'Inspect the aux NC contact.',
        'Check the terminals and wiring.',
        'Reset only after identifying the cause of the trip.',
      ],
    },
    {
      id: 'km1',
      label: 'KM1 Coil (A1)',
      type: 'coil',
      recommendedChecks: [
        'Measure across the coil from A1 to A2.',
        'Check the coil resistance.',
        'Check A2 to 0V return.',
        'Check the coil voltage rating matches 24VDC.',
      ],
    },
    {
      id: 'return',
      label: '0V Return',
      type: 'return',
      recommendedChecks: [],
    },
  ],
  edges: [
    { from: 'supply', to: 'estop' },
    { from: 'estop', to: 'stop' },
    { from: 'stop', to: 'ol1' },
    { from: 'ol1', to: 'km1' },
    { from: 'km1', to: 'return' },
  ],
  testPoints: [
    {
      id: 'tp-supply',
      nodeId: 'supply',
      label: 'TEST 1: 24V supply',
      instruction: 'Measure DC voltage between the 24V supply terminal and 0V.',
    },
    {
      id: 'tp-estop',
      nodeId: 'estop',
      label: 'TEST 2: E-STOP output',
      instruction: 'Measure DC voltage between the output terminal of E-STOP and 0V.',
    },
    {
      id: 'tp-stop',
      nodeId: 'stop',
      label: 'TEST 3: STOP output',
      instruction: 'Measure DC voltage between the output terminal of STOP and 0V.',
    },
    {
      id: 'tp-ol1',
      nodeId: 'ol1',
      label: 'TEST 4: OL1 output',
      instruction: 'Measure DC voltage between the output terminal of the OL1 overload aux contact and 0V.',
    },
    {
      id: 'tp-km1',
      nodeId: 'km1',
      label: 'TEST 5: KM1 coil terminal A1',
      instruction: 'Measure DC voltage between KM1 coil terminal A1 and 0V.',
    },
  ],
}

export default v1MotorControl

'use client'

import { useEffect, useRef, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type TM = any

interface MachineEntry { type: string; count: number }
interface PlacedMachine { type: string; x: number; z: number }

// ─── Constants ────────────────────────────────────────────────────────────────

const C = {
  grey:        0x8a9caf,
  blue:        0x2563eb,
  blueLight:   0x60a5fa,
  green:       0x16a34a,
  greenLight:  0x4ade80,
  orange:      0xea580c,
  orangeLight: 0xfb923c,
  red:         0xdc2626,
  redLight:    0xf87171,
  purple:      0x9333ea,
  purpleLight: 0xc084fc,
  dark:        0x1e293b,
  steel:       0x475569,
  belt:        0x0f172a,
  yellow:      0xfbbf24,
}

const FOOTPRINT: Record<string, { w: number; d: number }> = {
  'conveyor':           { w: 3.0, d: 0.8 },
  'metal-detector':     { w: 1.6, d: 0.8 },
  'checkweigher':       { w: 1.6, d: 0.8 },
  'labeller':           { w: 1.8, d: 1.1 },
  'robotic-arm':        { w: 1.5, d: 1.5 },
  'reject-station':     { w: 2.5, d: 1.3 },
  'filling-machine':    { w: 1.8, d: 1.5 },
  'packaging-machine':  { w: 2.6, d: 1.5 },
  'agv':                { w: 3.6, d: 0.8 },
  'storage':            { w: 3.0, d: 2.1 },
  'quality-inspection': { w: 1.8, d: 1.4 },
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function mat(TH: TM, color: number, met = 0.35, rough = 0.55) {
  return new TH.MeshStandardMaterial({ color, metalness: met, roughness: rough })
}
function box(TH: TM, w: number, h: number, d: number, color: number, met?: number, rough?: number) {
  return new TH.Mesh(new TH.BoxGeometry(w, h, d), mat(TH, color, met, rough))
}
function cyl(TH: TM, rt: number, rb: number, h: number, color: number, seg = 12) {
  return new TH.Mesh(new TH.CylinderGeometry(rt, rb, h, seg), mat(TH, color))
}
function pl(mesh: any, x: number, y: number, z: number): any {
  mesh.position.set(x, y, z); return mesh
}
function add(g: any, ...items: any[]): any {
  items.forEach(m => g.add(m)); return g
}

// ─── Machine builders ─────────────────────────────────────────────────────────

function buildConveyor(TH: TM) {
  const g = new TH.Group()
  add(g,
    pl(box(TH, 3.0, 0.10, 0.58, C.belt), 0, 0.82, 0),
    pl(box(TH, 3.0, 0.05, 0.68, C.grey), 0, 0.77, 0),
  )
  const roller = (x: number) => {
    const r = cyl(TH, 0.075, 0.075, 0.60, C.steel, 10)
    r.rotation.z = Math.PI / 2
    return pl(r, x, 0.82, 0)
  }
  add(g, roller(-1.44), roller(1.44))
  for (const [x, z] of [[-1.3, 0.28], [1.3, 0.28], [-1.3, -0.28], [1.3, -0.28]] as [number,number][]) {
    add(g, pl(box(TH, 0.06, 0.78, 0.06, C.dark), x, 0.39, z))
  }
  return g
}

function buildMetalDetector(TH: TM) {
  const g = new TH.Group()
  add(g,
    pl(box(TH, 1.6, 0.07, 0.46, C.belt), 0, 0.78, 0),
    pl(box(TH, 1.26, 0.05, 0.54, C.steel), 0, 0.75, 0),
  )
  for (const x of [-0.62, 0.62]) {
    add(g, pl(box(TH, 0.19, 1.52, 0.56, C.blue), x, 0.76, 0))
  }
  add(g, pl(box(TH, 1.6, 0.19, 0.56, C.blue), 0, 1.61, 0))
  add(g, pl(box(TH, 0.36, 0.52, 0.13, C.dark), 0.72, 0.5, 0.29))
  const lamp = cyl(TH, 0.04, 0.04, 0.06, 0x22c55e, 8)
  lamp.rotation.x = Math.PI / 2
  add(g, pl(lamp, 0.72, 0.88, 0.34))
  for (const [x, z] of [[-0.52, 0.24], [0.52, 0.24], [-0.52, -0.24], [0.52, -0.24]] as [number,number][]) {
    add(g, pl(box(TH, 0.05, 0.36, 0.05, C.dark), x, 0.18, z))
  }
  return g
}

function buildCheckweigher(TH: TM) {
  const g = new TH.Group()
  add(g,
    pl(box(TH, 1.6, 0.06, 0.56, C.grey), 0, 0.80, 0),
    pl(box(TH, 0.72, 0.07, 0.50, C.blue), 0, 0.87, 0),
  )
  for (const [x, z] of [[-0.70, 0.24], [0.70, 0.24], [-0.70, -0.24], [0.70, -0.24]] as [number,number][]) {
    add(g, pl(box(TH, 0.05, 0.80, 0.05, C.dark), x, 0.40, z))
  }
  add(g, pl(box(TH, 0.06, 0.82, 0.06, C.blueLight), 0.62, 1.31, 0))
  const screen = box(TH, 0.42, 0.28, 0.04, 0x0f2a4a)
  screen.rotation.x = -0.25
  add(g, pl(screen, 0.62, 1.86, 0.07))
  add(g, pl(box(TH, 0.38, 0.24, 0.01, C.blueLight, 0, 1.0), 0.62, 1.87, 0.09))
  return g
}

function buildLabeller(TH: TM) {
  const g = new TH.Group()
  add(g,
    pl(box(TH, 1.8, 0.06, 0.50, C.grey), 0, 0.80, 0),
    pl(box(TH, 1.8, 0.07, 0.57, C.dark), 0, 0.75, 0),
  )
  for (const [x, z] of [[-0.80, 0.22], [0.80, 0.22], [-0.80, -0.22], [0.80, -0.22]] as [number,number][]) {
    add(g, pl(box(TH, 0.05, 0.76, 0.05, C.dark), x, 0.38, z))
  }
  add(g,
    pl(box(TH, 0.06, 0.54, 0.06, C.green), 0, 1.10, -0.17),
    pl(box(TH, 0.44, 0.42, 0.38, C.green), 0, 1.40, -0.15),
  )
  const reel = new TH.Mesh(new TH.TorusGeometry(0.22, 0.042, 8, 20), mat(TH, C.greenLight))
  reel.rotation.x = Math.PI / 2
  add(g, pl(reel, 0, 1.78, -0.15))
  return g
}

function buildRoboticArm(TH: TM) {
  const g = new TH.Group()
  add(g,
    pl(box(TH, 0.80, 0.10, 0.80, C.dark), 0, 0.05, 0),
    pl(cyl(TH, 0.18, 0.22, 0.38, C.orange), 0, 0.29, 0),
    pl(cyl(TH, 0.14, 0.16, 0.30, C.orange), 0, 0.64, 0),
  )
  const arm1 = box(TH, 0.12, 0.52, 0.12, C.orangeLight)
  arm1.rotation.z = 0.4
  add(g, pl(arm1, 0.15, 1.04, 0))
  const arm2 = box(TH, 0.09, 0.44, 0.09, C.orange)
  arm2.rotation.z = -0.55
  add(g, pl(arm2, 0.32, 1.45, 0))
  for (const x of [-0.07, 0.07]) {
    add(g, pl(box(TH, 0.04, 0.14, 0.04, C.dark), 0.46 + x, 1.70, 0))
  }
  return g
}

function buildRejectStation(TH: TM) {
  const g = new TH.Group()
  add(g,
    pl(box(TH, 2.0, 0.07, 0.56, C.belt), 0, 0.80, 0),
    pl(box(TH, 2.0, 0.05, 0.63, C.grey), 0, 0.75, 0),
  )
  for (const [x, z] of [[-0.88, 0.26], [0.88, 0.26], [-0.88, -0.26], [0.88, -0.26]] as [number,number][]) {
    add(g, pl(box(TH, 0.05, 0.76, 0.05, C.dark), x, 0.38, z))
  }
  // Reject bin to side
  add(g,
    pl(box(TH, 0.04, 0.50, 0.74, C.red), -1.37, 1.05, 0),
    pl(box(TH, 0.04, 0.50, 0.74, C.red), -0.64, 1.05, 0),
    pl(box(TH, 0.77, 0.50, 0.04, C.red), -1.00, 1.05, 0.36),
    pl(box(TH, 0.77, 0.04, 0.74, C.red), -1.00, 0.80, 0),
  )
  const nozzle = cyl(TH, 0.03, 0.035, 0.34, C.redLight)
  nozzle.rotation.z = Math.PI / 2
  add(g, pl(nozzle, -0.29, 1.10, 0))
  return g
}

function buildFillingMachine(TH: TM) {
  const g = new TH.Group()
  add(g,
    pl(box(TH, 0.76, 2.0, 1.34, C.green), 0, 1.00, 0),
    pl(box(TH, 0.80, 0.05, 0.46, C.belt), 0.78, 0.80, 0),
  )
  for (const [x, z] of [[0.42, 0.20], [1.12, 0.20], [0.42, -0.20], [1.12, -0.20]] as [number,number][]) {
    add(g, pl(box(TH, 0.04, 0.60, 0.04, C.dark), x, 0.50, z))
  }
  add(g, pl(box(TH, 0.62, 0.06, 0.08, C.greenLight), 0.40, 0.42, 0))
  for (const x of [-0.12, 0.12, 0.40]) {
    add(g, pl(cyl(TH, 0.024, 0.028, 0.17, C.dark), x, 0.33, 0))
  }
  add(g, pl(box(TH, 0.38, 0.28, 0.05, 0x0d2e1a), 0, 1.70, 0.70))
  return g
}

function buildPackagingMachine(TH: TM) {
  const g = new TH.Group()
  add(g,
    pl(box(TH, 1.80, 1.48, 1.34, C.green), 0, 0.74, 0),
    pl(box(TH, 1.50, 0.46, 1.18, C.greenLight), 0, 1.73, 0),
  )
  const reel = new TH.Mesh(new TH.TorusGeometry(0.48, 0.055, 8, 20), mat(TH, C.dark))
  reel.rotation.y = Math.PI / 2
  add(g, pl(reel, -1.10, 1.60, 0))
  add(g, pl(box(TH, 0.85, 0.05, 0.46, C.belt), 1.32, 0.60, 0))
  for (const [x, z] of [[0.95, 0.20], [1.68, 0.20], [0.95, -0.20], [1.68, -0.20]] as [number,number][]) {
    add(g, pl(box(TH, 0.04, 0.60, 0.04, C.dark), x, 0.30, z))
  }
  return g
}

function buildAGV(TH: TM) {
  const g = new TH.Group()
  // Floor markings
  for (const x of [-1.4, -0.7, 0, 0.7, 1.4]) {
    add(g, pl(box(TH, 0.44, 0.014, 0.26, C.yellow, 0, 0.9), x, 0.007, 0))
  }
  add(g,
    pl(box(TH, 3.4, 0.01, 0.02, C.yellow, 0, 0.9), 0, 0.01, 0.15),
    pl(box(TH, 3.4, 0.01, 0.02, C.yellow, 0, 0.9), 0, 0.01, -0.15),
  )
  // Vehicle
  add(g,
    pl(box(TH, 0.72, 0.22, 0.54, C.orange), -1.20, 0.11, 0),
    pl(box(TH, 0.72, 0.04, 0.54, 0xfbbf24), -1.20, 0.24, 0),
    pl(box(TH, 0.04, 0.14, 0.50, C.orangeLight), -0.54, 0.07, 0),
  )
  for (const [x, z] of [[-0.90, 0.23], [-1.50, 0.23], [-0.90, -0.23], [-1.50, -0.23]] as [number,number][]) {
    const w = cyl(TH, 0.065, 0.065, 0.055, C.dark)
    w.rotation.z = Math.PI / 2
    add(g, pl(w, x, 0.065, z))
  }
  return g
}

function buildStorage(TH: TM) {
  const g = new TH.Group()
  for (const x of [-1.36, 0, 1.36]) {
    add(g,
      pl(box(TH, 0.07, 2.44, 0.07, C.purple), x, 1.22, -0.88),
      pl(box(TH, 0.07, 2.44, 0.07, C.purple), x, 1.22, 0.88),
    )
  }
  for (const y of [0.44, 1.00, 1.60]) {
    add(g, pl(box(TH, 2.78, 0.04, 1.80, C.dark), 0, y, 0))
  }
  add(g,
    pl(box(TH, 2.80, 0.06, 0.06, C.purpleLight), 0, 2.44, -0.88),
    pl(box(TH, 2.80, 0.06, 0.06, C.purpleLight), 0, 2.44, 0.88),
  )
  const boxColors = [C.purpleLight, 0x94a3b8, C.yellow, C.blueLight, C.redLight, 0x86efac]
  let ci = 0
  for (const y of [0.54, 1.10, 1.70]) {
    for (const x of [-0.88, 0, 0.88]) {
      for (const z of [-0.58, 0, 0.52]) {
        if ((ci % 5) !== 2) {
          const bh = 0.16 + ((ci * 7) % 5) * 0.025
          add(g, pl(box(TH, 0.27, bh, 0.27, boxColors[ci % boxColors.length]), x, y + bh / 2, z))
        }
        ci++
      }
    }
  }
  return g
}

function buildQualityInspection(TH: TM) {
  const g = new TH.Group()
  add(g, pl(box(TH, 1.50, 0.06, 1.14, C.grey), 0, 0.90, 0))
  for (const [x, z] of [[-0.66, 0.50], [0.66, 0.50], [-0.66, -0.50], [0.66, -0.50]] as [number,number][]) {
    add(g, pl(box(TH, 0.05, 0.90, 0.05, C.dark), x, 0.45, z))
  }
  add(g,
    pl(box(TH, 0.07, 1.00, 0.07, C.blue), 0.62, 1.43, 0),
    pl(box(TH, 0.62, 0.07, 0.07, C.blue), 0.30, 1.90, 0),
    pl(new TH.Mesh(new TH.SphereGeometry(0.10, 8, 8), mat(TH, C.blueLight)), 0, 0, 0),
  )
  const cam = g.children[g.children.length - 1]
  cam.position.set(-0.04, 1.90, 0)
  const screen = box(TH, 0.46, 0.30, 0.04, 0x0a1a3a)
  screen.rotation.x = -0.28
  const screenGlow = box(TH, 0.40, 0.24, 0.01, C.blueLight, 0, 1.0)
  screenGlow.rotation.x = -0.28
  add(g, pl(screen, -0.38, 1.25, -0.44), pl(screenGlow, -0.38, 1.25, -0.46))
  return g
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

function buildMachine(TH: TM, type: string): any {
  switch (type) {
    case 'conveyor':           return buildConveyor(TH)
    case 'metal-detector':     return buildMetalDetector(TH)
    case 'checkweigher':       return buildCheckweigher(TH)
    case 'labeller':           return buildLabeller(TH)
    case 'robotic-arm':        return buildRoboticArm(TH)
    case 'reject-station':     return buildRejectStation(TH)
    case 'filling-machine':    return buildFillingMachine(TH)
    case 'packaging-machine':  return buildPackagingMachine(TH)
    case 'agv':                return buildAGV(TH)
    case 'storage':            return buildStorage(TH)
    case 'quality-inspection': return buildQualityInspection(TH)
    default:                   return null
  }
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function layoutMachines(machines: MachineEntry[]): PlacedMachine[] {
  const placed: PlacedMachine[] = []
  const GAP = 0.9
  const MAX_X = 22
  let curX = 0, curZ = 0, rowMaxD = 0

  for (const { type, count } of machines) {
    const fp = FOOTPRINT[type] ?? { w: 2.0, d: 1.0 }
    for (let i = 0; i < count; i++) {
      if (curX > 0 && curX + fp.w > MAX_X) {
        curZ += rowMaxD + GAP + 0.4
        curX = 0
        rowMaxD = 0
      }
      placed.push({ type, x: curX + fp.w / 2, z: curZ + fp.d / 2 })
      curX += fp.w + GAP
      rowMaxD = Math.max(rowMaxD, fp.d)
    }
  }

  if (placed.length === 0) return placed
  const xs = placed.map(p => p.x)
  const zs = placed.map(p => p.z)
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2
  return placed.map(p => ({ ...p, x: p.x - cx, z: p.z - cz }))
}

// ─── Component ────────────────────────────────────────────────────────────────

const EXAMPLES = [
  'Food packaging line: 4 conveyors, metal detector, checkweigher, labeller, reject station',
  'Robotic palletising cell with 2 robotic arms, AGV, and storage racking',
  'Pharma filling line: filling machine, checkweigher, reject station, packaging machine',
  'Vision inspection: conveyor, quality inspection station, metal detector',
]

const LEGEND = [
  { color: '#8a9caf', label: 'Conveyor / Transport',      types: 'conveyor' },
  { color: '#2563eb', label: 'Inspection / Detection',    types: 'metal detector, checkweigher, quality inspection' },
  { color: '#16a34a', label: 'Processing / Packaging',    types: 'labeller, filling, packaging' },
  { color: '#ea580c', label: 'Robotic / AGV',             types: 'robotic arm, AGV' },
  { color: '#9333ea', label: 'Storage / Dispatch',        types: 'storage racking' },
  { color: '#dc2626', label: 'Reject / Safety',           types: 'reject station' },
]

export default function WorldPage() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [machines, setMachines] = useState<MachineEntry[]>([])
  const [error, setError] = useState('')
  const [sceneReady, setSceneReady] = useState(false)
  const [autoRotating, setAutoRotating] = useState(false)
  const [totalPlaced, setTotalPlaced] = useState(0)

  const [meshyPrompt, setMeshyPrompt] = useState('')
  const [meshyLoading, setMeshyLoading] = useState(false)
  const [meshyProgress, setMeshyProgress] = useState(0)
  const [meshyModelUrl, setMeshyModelUrl] = useState<string | null>(null)
  const [meshyError, setMeshyError] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const threeRef = useRef<{
    THREE: any; scene: any; camera: any
    renderer: any; controls: any; machineGroup: any
  } | null>(null)
  const animIdRef = useRef(0)
  const resizeCleanupRef = useRef<(() => void) | undefined>(undefined)
  const meshyCanvasRef = useRef<HTMLCanvasElement>(null)
  const meshyAnimIdRef = useRef(0)
  const meshyRendererRef = useRef<any>(null)

  // Initialise Three.js scene once on mount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false

    async function init(cvs: HTMLCanvasElement) {
      const THREE = await import('three')
      // @ts-ignore – OrbitControls is not in three's exports map but resolves at runtime
      const controlsMod: any = await import('three/examples/jsm/controls/OrbitControls')
      if (cancelled) return

      const CANVAS_H = 480
      const w = cvs.clientWidth || 900

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x141824)
      scene.fog = new (THREE as any).FogExp2(0x141824, 0.022)

      const camera = new THREE.PerspectiveCamera(52, w / CANVAS_H, 0.1, 200)
      camera.position.set(0, 18, 22)
      camera.lookAt(0, 0, 0)

      const grid = new THREE.GridHelper(80, 40, 0x2d3748, 0x1e2535)
      scene.add(grid)

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(80, 80),
        new THREE.MeshLambertMaterial({ color: 0x0d1117 }),
      )
      floor.rotation.x = -Math.PI / 2
      floor.position.y = -0.01
      scene.add(floor)

      scene.add(new THREE.AmbientLight(0xffffff, 1.8))
      scene.add(new THREE.HemisphereLight(0xffffff, 0x8090a0, 0.9))
      const sun = new THREE.DirectionalLight(0xffffff, 2.0)
      sun.position.set(12, 22, 12)
      scene.add(sun)
      const fill = new THREE.DirectionalLight(0xaabbcc, 1.1)
      fill.position.set(-8, 8, -8)
      scene.add(fill)

      const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true })
      renderer.setSize(w, CANVAS_H)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      const OrbitControls = controlsMod.OrbitControls
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.07
      controls.minDistance = 4
      controls.maxDistance = 90
      controls.maxPolarAngle = Math.PI / 2.05
      controls.autoRotateSpeed = 0.6

      const machineGroup = new THREE.Group()
      scene.add(machineGroup)

      threeRef.current = { THREE, scene, camera, renderer, controls, machineGroup }

      const handleResize = () => {
        const newW = cvs.clientWidth || 900
        camera.aspect = newW / CANVAS_H
        camera.updateProjectionMatrix()
        renderer.setSize(newW, CANVAS_H)
      }
      window.addEventListener('resize', handleResize)
      resizeCleanupRef.current = () => window.removeEventListener('resize', handleResize)

      function animate() {
        animIdRef.current = requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene, camera)
      }
      animate()

      if (!cancelled) setSceneReady(true)
    }

    init(canvas)

    return () => {
      cancelled = true
      cancelAnimationFrame(animIdRef.current)
      resizeCleanupRef.current?.()
      if (threeRef.current) {
        threeRef.current.renderer.dispose()
        threeRef.current = null
      }
    }
  }, [])

  // Rebuild machines whenever the list changes
  useEffect(() => {
    if (!threeRef.current || machines.length === 0) return
    const { THREE, machineGroup, camera, controls } = threeRef.current

    // Dispose old geometry
    machineGroup.traverse((obj: any) => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose())
        else obj.material.dispose()
      }
    })
    while (machineGroup.children.length > 0) machineGroup.remove(machineGroup.children[0])

    const layout = layoutMachines(machines)
    for (const { type, x, z } of layout) {
      const model = buildMachine(THREE, type)
      if (model) { model.position.set(x, 0, z); machineGroup.add(model) }
    }
    setTotalPlaced(layout.length)

    // Reset to default view
    camera.position.set(0, 18, 22)
    camera.up.set(0, 1, 0)
    controls.target.set(0, 0, 0)
    controls.update()
  }, [machines])

  // Animate progress bar while Meshy is generating
  useEffect(() => {
    if (!meshyLoading) return
    setMeshyProgress(2)
    const start = Date.now()
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000
      setMeshyProgress(Math.min(2 + (elapsed / 90) * 92, 94))
    }, 600)
    return () => clearInterval(id)
  }, [meshyLoading])

  // Load GLB into the Meshy viewer canvas when model URL is ready
  useEffect(() => {
    if (!meshyModelUrl) return
    const canvas = meshyCanvasRef.current
    if (!canvas) return
    let cancelled = false

    if (meshyRendererRef.current) { meshyRendererRef.current.dispose(); meshyRendererRef.current = null }
    cancelAnimationFrame(meshyAnimIdRef.current)

    async function loadGLB(cvs: HTMLCanvasElement) {
      const THREE = threeRef.current?.THREE || await import('three')
      // @ts-ignore – not in exports map, resolves at runtime
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader')
      // @ts-ignore
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls')
      if (cancelled) return

      const w = cvs.clientWidth || 600
      const h = 380

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x141824)

      const camera = new THREE.PerspectiveCamera(50, w / h, 0.01, 200)
      camera.position.set(0, 0.5, 4)

      scene.add(new THREE.AmbientLight(0xffffff, 2.2))
      scene.add(new THREE.HemisphereLight(0xffffff, 0x8090a0, 1.0))
      const sun = new THREE.DirectionalLight(0xffffff, 2.0)
      sun.position.set(5, 8, 5)
      scene.add(sun)
      const fill = new THREE.DirectionalLight(0xaabbcc, 1.2)
      fill.position.set(-5, -3, -5)
      scene.add(fill)

      const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true })
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      meshyRendererRef.current = renderer

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.07
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.7

      const loader = new GLTFLoader()
      const gltf = await new Promise<any>((resolve, reject) =>
        loader.load(meshyModelUrl!, resolve, undefined, reject)
      )
      if (cancelled) return

      const model = gltf.scene
      const box3 = new THREE.Box3().setFromObject(model)
      const center = box3.getCenter(new THREE.Vector3())
      const size3 = box3.getSize(new THREE.Vector3())
      const maxDim = Math.max(size3.x, size3.y, size3.z)
      model.position.sub(center)
      model.scale.setScalar(2.8 / maxDim)
      scene.add(model)

      camera.position.set(0, 0, 3.6)
      camera.lookAt(0, 0, 0)
      controls.target.set(0, 0, 0)
      controls.update()

      function animate() {
        meshyAnimIdRef.current = requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene, camera)
      }
      animate()
    }

    loadGLB(canvas).catch(err => {
      if (!cancelled) setMeshyError('Failed to display model: ' + (err?.message || 'unknown error'))
    })

    return () => { cancelled = true; cancelAnimationFrame(meshyAnimIdRef.current) }
  }, [meshyModelUrl])

  // Cleanup Meshy renderer on unmount
  useEffect(() => () => {
    cancelAnimationFrame(meshyAnimIdRef.current)
    meshyRendererRef.current?.dispose()
  }, [])

  async function generate() {
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/world', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      if (!data.machines?.length) {
        setError('No machines identified — try describing your production line in more detail.')
      } else {
        setMachines(data.machines)
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function setView(view: 'top' | 'iso' | 'reset') {
    const s = threeRef.current
    if (!s) return
    if (view === 'top') {
      s.camera.position.set(0, 32, 0.001)
      s.camera.up.set(0, 0, -1)
    } else if (view === 'iso') {
      s.camera.position.set(18, 18, 18)
      s.camera.up.set(0, 1, 0)
    } else {
      s.camera.position.set(0, 18, 22)
      s.camera.up.set(0, 1, 0)
    }
    s.controls.target.set(0, 0, 0)
    s.controls.update()
  }

  function toggleAutoRotate() {
    const s = threeRef.current
    if (!s) return
    s.controls.autoRotate = !s.controls.autoRotate
    setAutoRotating(s.controls.autoRotate)
  }

  async function generateMeshy() {
    if (!meshyPrompt.trim()) return
    setMeshyLoading(true)
    setMeshyError('')
    setMeshyModelUrl(null)
    setMeshyProgress(0)
    try {
      const res = await fetch('/api/generate-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: meshyPrompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setMeshyProgress(100)
      setMeshyModelUrl(data.model_url)
    } catch (e: any) {
      setMeshyError(e.message || 'Generation failed')
    } finally {
      setMeshyLoading(false)
    }
  }

  const btnStyle = (active = false): React.CSSProperties => ({
    padding: '7px 15px', fontSize: 12, fontWeight: active ? 600 : 400,
    background: active ? '#185FA5' : '#fff', color: active ? '#fff' : '#374151',
    border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer',
  })

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', color: '#111827', background: '#f9fafb', minHeight: '100vh' }}>

      {/* Top bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>
            Kolatron<span style={{ color: '#185FA5' }}>.ai</span>
          </span>
        </a>
        <div style={{ height: 16, width: 1, background: '#e5e7eb' }} />
        <a href="/diagnose" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>Diagnose</a>
        <a href="/world"    style={{ fontSize: 13, color: '#185FA5', textDecoration: 'none', fontWeight: 600 }}>World</a>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 20px 48px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 22 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600, color: '#0C447C',
            background: '#E6F1FB', borderRadius: 20, padding: '4px 14px', marginBottom: 10,
          }}>
            Factory World Generator · Beta
          </div>
          <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, margin: '0 0 8px', color: '#111827' }}>
            Describe a factory. See it in 3D.
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0, maxWidth: 560, lineHeight: 1.6 }}>
            Enter a plain-English description of your production line. Claude identifies the machine types
            and lays them out on a factory floor in real time.
          </p>
        </div>

        {/* Input */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 18px 14px', marginBottom: 10 }}>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate() } }}
            placeholder="e.g. A food packaging line with 3 conveyors, a metal detector, checkweigher, labeller and reject station..."
            style={{
              width: '100%', minHeight: 78, padding: '9px 12px', fontSize: 14,
              border: '1px solid #d1d5db', borderRadius: 8, resize: 'vertical',
              fontFamily: 'inherit', color: '#111827', lineHeight: 1.6,
              boxSizing: 'border-box', outline: 'none', background: '#fafafa',
            }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={generate}
              disabled={loading || !prompt.trim()}
              style={{
                padding: '10px 22px', fontSize: 14, fontWeight: 600,
                background: loading || !prompt.trim() ? '#94a3b8' : '#185FA5',
                color: '#fff', border: 'none', borderRadius: 8,
                cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Generating…' : 'Generate Layout'}
            </button>
            {error && <span style={{ fontSize: 13, color: '#dc2626' }}>{error}</span>}
            {totalPlaced > 0 && !loading && (
              <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 'auto' }}>
                {totalPlaced} machine{totalPlaced !== 1 ? 's' : ''} placed
              </span>
            )}
          </div>
        </div>

        {/* Examples */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 22, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>Try:</span>
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              style={{
                padding: '5px 12px', fontSize: 12, background: '#fff',
                border: '1px solid #d1d5db', borderRadius: 20, cursor: 'pointer', color: '#374151',
              }}
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div style={{ background: '#141824', borderRadius: 12, overflow: 'hidden', position: 'relative', marginBottom: 8 }}>
          <canvas
            ref={canvasRef}
            style={{ display: 'block', width: '100%', height: 480, cursor: 'grab' }}
          />
          {!sceneReady && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: '#141824', color: '#4a5568', fontSize: 14,
            }}>
              Loading 3D engine…
            </div>
          )}
          {sceneReady && machines.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', pointerEvents: 'none',
            }}>
              <div style={{
                background: 'rgba(0,0,0,0.55)', color: '#94a3b8', fontSize: 13,
                padding: '8px 18px', borderRadius: 20,
              }}>
                Enter a description above and click Generate
              </div>
            </div>
          )}
          {loading && (
            <div style={{
              position: 'absolute', top: 12, right: 14, background: 'rgba(0,0,0,0.7)',
              color: '#60a5fa', fontSize: 12, padding: '5px 12px', borderRadius: 20,
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', background: '#60a5fa',
                animation: 'kpulse 1s ease-in-out infinite',
              }} />
              Claude is reading your factory…
            </div>
          )}
        </div>

        {/* View controls */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
          <button style={btnStyle(autoRotating)} onClick={toggleAutoRotate}>
            {autoRotating ? '⏹ Stop' : '↺ Auto-rotate'}
          </button>
          <button style={btnStyle()} onClick={() => setView('top')}>Top view</button>
          <button style={btnStyle()} onClick={() => setView('iso')}>Isometric</button>
          <button style={btnStyle()} onClick={() => setView('reset')}>Reset view</button>
          <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>
            Drag to orbit · Scroll to zoom
          </span>
        </div>

        {/* Legend */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Legend
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {LEGEND.map(({ color, label, types }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 175 }}>
                <div style={{ width: 11, height: 11, borderRadius: 3, background: color, flexShrink: 0, marginTop: 3 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#111827' }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{types}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
          Schematic 3D layout only — not to scale.
        </p>

        {/* ── Divider ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '40px 0 34px' }}>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          <span style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
            — or generate a single component —
          </span>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        </div>

        {/* ── Single component generator ──────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600, color: '#78350f',
            background: '#fef3c7', borderRadius: 20, padding: '4px 14px', marginBottom: 10,
          }}>
            Powered by Meshy AI · Photorealistic 3D
          </div>
          <h2 style={{ fontSize: 'clamp(17px, 3vw, 22px)', fontWeight: 700, margin: '0 0 6px', color: '#111827' }}>
            Single component generator
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0, maxWidth: 520, lineHeight: 1.6 }}>
            Describe any industrial machine or component. Meshy AI generates a photorealistic
            3D model in about 60 seconds.
          </p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 18px 14px', marginBottom: 10 }}>
          <input
            value={meshyPrompt}
            onChange={e => setMeshyPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') generateMeshy() }}
            placeholder="e.g. Siemens S7-1200 PLC with 4 IO modules..."
            style={{
              width: '100%', padding: '10px 12px', fontSize: 14,
              border: '1px solid #d1d5db', borderRadius: 8,
              fontFamily: 'inherit', color: '#111827', lineHeight: 1.6,
              boxSizing: 'border-box', outline: 'none', background: '#fafafa',
            }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={generateMeshy}
              disabled={meshyLoading || !meshyPrompt.trim()}
              style={{
                padding: '10px 22px', fontSize: 14, fontWeight: 600,
                background: meshyLoading || !meshyPrompt.trim() ? '#94a3b8' : '#d97706',
                color: '#fff', border: 'none', borderRadius: 8,
                cursor: meshyLoading || !meshyPrompt.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {meshyLoading ? 'Generating…' : 'Generate 3D'}
            </button>
            {meshyError && <span style={{ fontSize: 13, color: '#dc2626' }}>{meshyError}</span>}
          </div>
        </div>

        {/* Meshy example prompts */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>Try:</span>
          {[
            'Siemens S7-1200 PLC with 4 IO modules',
            'Industrial pneumatic cylinder double acting 50mm bore',
            'Three phase electric motor with cooling fins and junction box',
            'Conveyor belt with drive motor and tracking rollers',
            'Safety relay module on DIN rail',
          ].map(ex => (
            <button
              key={ex}
              onClick={() => setMeshyPrompt(ex)}
              style={{
                padding: '5px 12px', fontSize: 12, background: '#fff',
                border: '1px solid #d1d5db', borderRadius: 20, cursor: 'pointer', color: '#374151',
              }}
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Generation progress */}
        {meshyLoading && (
          <div style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
            padding: '20px 22px', marginBottom: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                Generating 3D model…
              </span>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>
                {Math.round(meshyProgress)}%
              </span>
            </div>
            <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{
                width: `${meshyProgress}%`, height: '100%',
                background: 'linear-gradient(90deg, #d97706, #fbbf24)',
                borderRadius: 3, transition: 'width 0.6s ease',
              }} />
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
              {meshyProgress < 20 ? 'Starting generation…'
                : meshyProgress < 50 ? 'Processing mesh geometry…'
                : meshyProgress < 80 ? 'Generating photorealistic textures…'
                : 'Finalising model…'}{' '}
              This typically takes 60–90 seconds.
            </p>
          </div>
        )}

        {/* GLB viewer */}
        {meshyModelUrl && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ background: '#141824', borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
              <canvas
                ref={meshyCanvasRef}
                style={{ display: 'block', width: '100%', height: 380, cursor: 'grab' }}
              />
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', margin: 0 }}>
              Drag to rotate · Scroll to zoom · Generated by Meshy AI
            </p>
          </div>
        )}

      </div>

      <style>{`
        @keyframes kpulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.25 } }
      `}</style>

    </main>
  )
}

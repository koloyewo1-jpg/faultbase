'use client'
import { useEffect, useRef, useState } from 'react'
import type * as THREE_T from 'three'

interface Props {
  machineId: string
  modelPath?: string
  faultZone: string
  title: string
}

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  CHROME:   0xccd8e4,
  DARK:     0x3a4558,
  BLACK:    0x181e2a,
  FAULT:    0xe24b4a,
  BRASS:    0xb08828,
  GRAY_L:   0xced4db,
  GRAY_M:   0x8e9aaa,
  METAL:    0x8a9caf,
  WHITE:    0xe4e8e4,
  AMBER:    0xd08000,
  BELT:     0x1a1e28,
  CARD:     0xbe8e38,
  SAFETY_Y: 0xf0c030,
  NAVY:     0x2a3850,
}

// ─── Helpers (any for THREE param avoids complex dynamic-import typing) ────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TM = any

function mat(THREE: TM, color: number, m = 0.5, r = 0.45, emissive = 0): THREE_T.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness: m, roughness: r, emissive })
}

function mk(THREE: TM, geo: THREE_T.BufferGeometry, color: number, m = 0.5, r = 0.45): THREE_T.Mesh {
  return new THREE.Mesh(geo, mat(THREE, color, m, r))
}

function fitToView(g: THREE_T.Group, THREE: TM) {
  const box = new THREE.Box3().setFromObject(g)
  const center = box.getCenter(new THREE.Vector3())
  const size   = box.getSize(new THREE.Vector3())
  const scale  = 2 / Math.max(size.x, size.y, size.z)
  g.scale.setScalar(scale)
  g.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
}

// ─── Pneumatic cylinder with rod, seal, ports, bracket ───────────────────────
function buildPneumatics(THREE: TM): THREE_T.Group {
  const g = new THREE.Group()
  const R = 0.22, BL = 2.0

  const barrel = mk(THREE, new THREE.CylinderGeometry(R, R, BL, 28), C.CHROME, 0.85, 0.15)
  barrel.rotation.z = Math.PI / 2
  g.add(barrel)

  for (const x of [BL / 2 + 0.06, -(BL / 2 + 0.06)]) {
    const cap = mk(THREE, new THREE.CylinderGeometry(R + 0.04, R + 0.04, 0.12, 28), C.DARK, 0.6, 0.4)
    cap.rotation.z = Math.PI / 2; cap.position.x = x; g.add(cap)
  }

  // Tie rods (4 corners)
  for (const [y, z] of [[R*0.85, R*0.85],[R*0.85,-R*0.85],[-R*0.85,R*0.85],[-R*0.85,-R*0.85]] as [number,number][]) {
    const tr = mk(THREE, new THREE.CylinderGeometry(0.022, 0.022, BL + 0.24, 8), C.DARK, 0.65, 0.3)
    tr.rotation.z = Math.PI / 2; tr.position.set(0, y, z); g.add(tr)
  }

  const rod = mk(THREE, new THREE.CylinderGeometry(0.065, 0.065, 1.3, 20), C.CHROME, 0.9, 0.1)
  rod.rotation.z = Math.PI / 2; rod.position.x = BL / 2 + 0.12 + 0.65; g.add(rod)

  const eye = mk(THREE, new THREE.TorusGeometry(0.06, 0.022, 8, 20), C.DARK, 0.6, 0.3)
  eye.rotation.z = Math.PI / 2; eye.position.x = BL / 2 + 0.12 + 1.3 + 0.06; g.add(eye)

  // Air ports (brass)
  for (const x of [BL / 2 - 0.3, -(BL / 2 - 0.3)]) {
    const port = mk(THREE, new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8), C.BRASS, 0.7, 0.3)
    port.position.set(x, R + 0.1, 0); g.add(port)
    const hex = mk(THREE, new THREE.CylinderGeometry(0.055, 0.055, 0.06, 6), C.BRASS, 0.7, 0.3)
    hex.position.set(x, R + 0.03, 0); g.add(hex)
  }

  // Rod seal ring — FAULT ZONE
  const seal = new THREE.Mesh(
    new THREE.TorusGeometry(0.085, 0.022, 8, 24),
    mat(THREE, C.FAULT, 0.2, 0.8, 0x1a0000),
  )
  seal.rotation.y = Math.PI / 2; seal.position.x = BL / 2 + 0.06; g.add(seal)

  const foot = mk(THREE, new THREE.BoxGeometry(1.6, 0.055, 0.5), C.DARK, 0.6, 0.4)
  foot.position.y = -(R + 0.19); g.add(foot)
  const brace = mk(THREE, new THREE.BoxGeometry(0.08, 0.26, 0.44), C.DARK, 0.6, 0.4)
  brace.position.y = -(R + 0.07); g.add(brace)
  for (const x of [0.6, -0.6]) {
    const bolt = mk(THREE, new THREE.CylinderGeometry(0.025, 0.025, 0.09, 8), C.GRAY_M, 0.7, 0.3)
    bolt.position.set(x, -(R + 0.19), 0); g.add(bolt)
  }
  return g
}

// ─── Proximity sensor on bracket with target and cable ────────────────────────
function buildSensor(THREE: TM): THREE_T.Group {
  const g = new THREE.Group()

  const body = mk(THREE, new THREE.CylinderGeometry(0.14, 0.14, 0.75, 32), C.BLACK, 0.3, 0.7)
  g.add(body)

  // Sensing face — FAULT ZONE
  const face = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.025, 32),
    mat(THREE, C.FAULT, 0.1, 0.6, 0x1a0000),
  )
  face.position.y = -0.387; g.add(face)

  for (const y of [0.2, -0.1]) {
    const nut = mk(THREE, new THREE.CylinderGeometry(0.18, 0.18, 0.04, 6), C.GRAY_M, 0.7, 0.3)
    nut.position.y = y; g.add(nut)
  }

  const conn = mk(THREE, new THREE.CylinderGeometry(0.1, 0.1, 0.12, 16), C.DARK, 0.5, 0.5)
  conn.position.y = 0.435; g.add(conn)

  // Cable (curved tube)
  const curvePts = [
    new THREE.Vector3(0, 0.5, 0),
    new THREE.Vector3(0, 0.72, 0),
    new THREE.Vector3(0.25, 0.88, 0.1),
    new THREE.Vector3(0.52, 0.78, 0.35),
    new THREE.Vector3(0.68, 0.6, 0.55),
  ]
  const cable = mk(THREE, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curvePts), 20, 0.025, 8, false), C.BLACK, 0.1, 0.85)
  g.add(cable)

  // L-bracket
  const brV = mk(THREE, new THREE.BoxGeometry(0.07, 1.1, 0.06), C.GRAY_M, 0.6, 0.4)
  brV.position.set(0.24, 0, 0); g.add(brV)
  const brH = mk(THREE, new THREE.BoxGeometry(0.55, 0.07, 0.06), C.GRAY_M, 0.6, 0.4)
  brH.position.set(0.51, -0.515, 0); g.add(brH)
  const slot = mk(THREE, new THREE.BoxGeometry(0.03, 0.22, 0.07), C.DARK, 0, 1)
  slot.position.set(0.24, 0.15, 0); g.add(slot)

  // Target plate
  const target = mk(THREE, new THREE.BoxGeometry(0.8, 0.055, 0.6), C.METAL, 0.7, 0.3)
  target.position.y = -0.8; g.add(target)
  const tLine = mk(THREE, new THREE.BoxGeometry(0.6, 0.008, 0.02), C.DARK, 0.4, 0.6)
  tLine.position.y = -0.77; g.add(tLine)

  return g
}

// ─── Heat seal jaw pair with heaters and film ─────────────────────────────────
function buildPackaging(THREE: TM): THREE_T.Group {
  const g = new THREE.Group()
  const JW = 2.0, JH = 0.24, JD = 0.44

  const upper = mk(THREE, new THREE.BoxGeometry(JW, JH, JD), C.DARK, 0.7, 0.3)
  upper.position.y = 0.2; g.add(upper)
  const uFace = mk(THREE, new THREE.BoxGeometry(JW * 0.96, 0.016, JD * 0.9), C.WHITE, 0.1, 0.5)
  uFace.position.y = 0.2 - JH / 2 - 0.008; g.add(uFace)

  const lower = mk(THREE, new THREE.BoxGeometry(JW, JH, JD), C.DARK, 0.7, 0.3)
  lower.position.y = -0.2; g.add(lower)
  const lFace = mk(THREE, new THREE.BoxGeometry(JW * 0.96, 0.016, JD * 0.9), C.WHITE, 0.1, 0.5)
  lFace.position.y = -0.2 + JH / 2 + 0.008; g.add(lFace)

  // Heater elements — FAULT ZONE
  for (const y of [0.2, -0.2]) {
    const heater = new THREE.Mesh(
      new THREE.BoxGeometry(JW * 0.84, 0.032, 0.055),
      mat(THREE, C.FAULT, 0.15, 0.65, 0x280000),
    )
    heater.position.set(0, y, JD * 0.25); g.add(heater)
  }

  const film = mk(THREE, new THREE.BoxGeometry(JW * 0.94, 0.006, JD * 0.9), 0xd4e4d0, 0.1, 0.3)
  film.position.y = 0; g.add(film)

  // Guide rods (4 corners)
  for (const [x, z] of [[JW/2-0.12, JD/2-0.07],[-(JW/2-0.12), JD/2-0.07],[JW/2-0.12,-(JD/2-0.07)],[-(JW/2-0.12),-(JD/2-0.07)]] as [number,number][]) {
    const gr = mk(THREE, new THREE.CylinderGeometry(0.035, 0.035, 0.85, 12), C.CHROME, 0.85, 0.1)
    gr.position.set(x, 0, z); g.add(gr)
    const brg = mk(THREE, new THREE.CylinderGeometry(0.052, 0.052, 0.1, 12), C.METAL, 0.6, 0.4)
    brg.position.set(x, -0.2, z); g.add(brg)
  }

  const topBar = mk(THREE, new THREE.BoxGeometry(JW + 0.18, 0.055, JD + 0.06), C.METAL, 0.65, 0.35)
  topBar.position.y = 0.37; g.add(topBar)
  const cyl = mk(THREE, new THREE.CylinderGeometry(0.065, 0.065, 0.32, 16), C.GRAY_L, 0.7, 0.25)
  cyl.position.y = 0.53; g.add(cyl)

  // Thermocouple probes
  for (const x of [0.5, -0.5]) {
    const tc = mk(THREE, new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), C.CHROME, 0.8, 0.2)
    tc.rotation.z = Math.PI / 2; tc.position.set(x, 0.185, JD / 2 - 0.02); g.add(tc)
  }
  return g
}

// ─── Metal detector tunnel with conveyor belt and product ─────────────────────
function buildReject(THREE: TM): THREE_T.Group {
  const g = new THREE.Group()
  const TW = 1.8, TH = 1.2, TD = 0.5, pillW = 0.28, topH = 0.25
  const aperW = TW - 2 * pillW
  const aperH = TH - topH

  // Tunnel pillars
  const lPillar = mk(THREE, new THREE.BoxGeometry(pillW, TH, TD), C.NAVY, 0.5, 0.4)
  lPillar.position.set(-TW / 2 + pillW / 2, TH / 2, 0); g.add(lPillar)
  const rPillar = mk(THREE, new THREE.BoxGeometry(pillW, TH, TD), C.NAVY, 0.5, 0.4)
  rPillar.position.set(TW / 2 - pillW / 2, TH / 2, 0); g.add(rPillar)
  const topBeam = mk(THREE, new THREE.BoxGeometry(TW, topH, TD), C.NAVY, 0.5, 0.4)
  topBeam.position.y = TH - topH / 2; g.add(topBeam)

  // Aperture inner edges — FAULT ZONE (sensing coil)
  const faultM = mat(THREE, C.FAULT, 0.15, 0.65, 0x1a0000)
  const edgeT = 0.022
  for (const [pos, size] of [
    [[-aperW / 2 + edgeT / 2, aperH / 2, 0], [edgeT, aperH, TD + 0.01]],
    [[ aperW / 2 - edgeT / 2, aperH / 2, 0], [edgeT, aperH, TD + 0.01]],
    [[0, aperH,           0], [aperW, edgeT, TD + 0.01]],
    [[0, edgeT / 2,       0], [aperW, edgeT, TD + 0.01]],
  ] as [[number,number,number],[number,number,number]][]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(...size), faultM)
    e.position.set(...pos); g.add(e)
  }

  // Conveyor belt
  const beltLen = TW + 1.6
  const belt = mk(THREE, new THREE.BoxGeometry(beltLen, 0.038, 0.4), C.BELT, 0.2, 0.9)
  belt.position.y = -0.019; g.add(belt)
  for (const z of [0.21, -0.21]) {
    const bf = mk(THREE, new THREE.BoxGeometry(beltLen, 0.09, 0.032), C.METAL, 0.7, 0.3)
    bf.position.set(0, 0.045, z); g.add(bf)
  }
  for (const x of [TW / 2 + 0.5, -(TW / 2 + 0.5)]) {
    const leg = mk(THREE, new THREE.BoxGeometry(0.04, 0.45, 0.38), C.GRAY_M, 0.6, 0.4)
    leg.position.set(x, -0.26, 0); g.add(leg)
  }

  // Product (cardboard box on belt)
  const prod = mk(THREE, new THREE.BoxGeometry(0.34, 0.3, 0.28), C.CARD, 0.1, 0.85)
  prod.position.set(TW / 2 + 0.24, 0.169, 0); g.add(prod)

  // Control panel
  const panel = mk(THREE, new THREE.BoxGeometry(0.46, 0.72, 0.16), C.GRAY_L, 0.4, 0.5)
  panel.position.set(-(TW / 2 + 0.37), TH / 2 - 0.05, 0); g.add(panel)
  const disp = mk(THREE, new THREE.BoxGeometry(0.28, 0.14, 0.018), C.BLACK, 0.1, 0.8)
  disp.position.set(-(TW / 2 + 0.37), TH / 2 + 0.14, 0.09); g.add(disp)
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.018, 12),
      mat(THREE, [0x22c55e, 0xf0c030, C.FAULT][i], 0.3, 0.5),
    )
    btn.rotation.x = Math.PI / 2
    btn.position.set(-(TW / 2 + 0.37) + (i - 1) * 0.09, TH / 2 - 0.12, 0.09); g.add(btn)
  }
  return g
}

// ─── VFD panel with display, keypad, LEDs, DIN rail ──────────────────────────
function buildVFD(THREE: TM): THREE_T.Group {
  const g = new THREE.Group()

  const enc = mk(THREE, new THREE.BoxGeometry(0.88, 1.35, 0.24), C.GRAY_L, 0.35, 0.55)
  g.add(enc)
  const door = mk(THREE, new THREE.BoxGeometry(0.86, 1.33, 0.02), 0xe0e4e8, 0.3, 0.5)
  door.position.z = 0.13; g.add(door)

  // Display
  const bezel = mk(THREE, new THREE.BoxGeometry(0.58, 0.24, 0.02), C.DARK, 0.4, 0.6)
  bezel.position.set(0, 0.38, 0.14); g.add(bezel)
  const screen = mk(THREE, new THREE.BoxGeometry(0.52, 0.19, 0.008), 0x0a1a0a, 0.05, 0.8)
  screen.position.set(0, 0.38, 0.148); g.add(screen)
  // Screen lines — top line is fault red
  for (let i = 0; i < 3; i++) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.016, 0.002),
      mat(THREE, i === 0 ? C.FAULT : 0x00cc44, 0, 0.8, i === 0 ? 0x180000 : 0x001800),
    )
    line.position.set(0, 0.42 - i * 0.055, 0.154); g.add(line)
  }

  // Keypad
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const btn = mk(THREE, new THREE.BoxGeometry(0.072, 0.042, 0.014), C.GRAY_M, 0.3, 0.6)
      btn.position.set(-0.135 + col * 0.09, 0.14 - row * 0.065, 0.147); g.add(btn)
    }
  }

  // Rotary dial
  const dial = mk(THREE, new THREE.CylinderGeometry(0.056, 0.056, 0.016, 24), C.DARK, 0.4, 0.5)
  dial.rotation.x = Math.PI / 2; dial.position.set(0.28, 0.18, 0.147); g.add(dial)
  const dMark = mk(THREE, new THREE.BoxGeometry(0.004, 0.044, 0.004), C.GRAY_L, 0, 0.6)
  dMark.position.set(0.28, 0.206, 0.15); g.add(dMark)

  // Status LEDs (green, fault-red, amber)
  for (let i = 0; i < 3; i++) {
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.017, 8, 8),
      mat(THREE, [0x22cc44, C.FAULT, C.AMBER][i], 0, 0.5, i === 1 ? 0x1a0000 : 0),
    )
    led.position.set(-0.24 + i * 0.05, 0.58, 0.15); g.add(led)
  }

  // Vent ribs
  for (let i = 0; i < 5; i++) {
    const vent = mk(THREE, new THREE.BoxGeometry(0.68, 0.014, 0.044), C.GRAY_M, 0.4, 0.6)
    vent.position.set(0, 0.625 + i * 0.024, 0.1); g.add(vent)
  }

  const termCover = mk(THREE, new THREE.BoxGeometry(0.86, 0.17, 0.048), C.DARK, 0.4, 0.5)
  termCover.position.set(0, -0.585, 0.14); g.add(termCover)
  const dinRail = mk(THREE, new THREE.BoxGeometry(1.0, 0.036, 0.052), C.CHROME, 0.8, 0.2)
  dinRail.position.y = -0.73; g.add(dinRail)
  for (let i = -4; i <= 4; i++) {
    const slot = mk(THREE, new THREE.BoxGeometry(0.024, 0.018, 0.053), C.DARK, 0.3, 0.7)
    slot.position.set(i * 0.1, -0.73, 0); g.add(slot)
  }
  return g
}

// ─── Safety relay module with LEDs, terminals, reset button, DIN rail ─────────
function buildSafety(THREE: TM): THREE_T.Group {
  const g = new THREE.Group()

  const body = mk(THREE, new THREE.BoxGeometry(0.44, 0.88, 0.5), C.SAFETY_Y, 0.2, 0.7)
  g.add(body)
  const face = mk(THREE, new THREE.BoxGeometry(0.42, 0.86, 0.018), 0xe8d860, 0.15, 0.65)
  face.position.z = 0.26; g.add(face)

  // Status LEDs — ERR is fault zone
  const ledCols: [number, number][] = [[0x22cc44, 0], [0x22cc44, 0], [C.FAULT, 0x200000]]
  const ledLabelY = [0.28, 0.18, 0.08]
  for (let i = 0; i < 3; i++) {
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 10, 10),
      mat(THREE, ledCols[i][0], 0, 0.5, ledCols[i][1]),
    )
    led.position.set(-0.1, ledLabelY[i], 0.278); g.add(led)
    const bz = mk(THREE, new THREE.CylinderGeometry(0.028, 0.028, 0.01, 12), C.DARK, 0.4, 0.6)
    bz.rotation.x = Math.PI / 2; bz.position.set(-0.1, ledLabelY[i], 0.27); g.add(bz)
  }

  // Label panel
  const lpanel = mk(THREE, new THREE.BoxGeometry(0.35, 0.3, 0.008), 0x2e2a18, 0.2, 0.7)
  lpanel.position.set(0, -0.12, 0.274); g.add(lpanel)

  // Input terminals (top row)
  for (let i = 0; i < 6; i++) {
    const t = mk(THREE, new THREE.BoxGeometry(0.044, 0.052, 0.038), C.GRAY_L, 0.5, 0.4)
    t.position.set(-0.1875 + i * 0.075, 0.5, 0.258); g.add(t)
    const s = mk(THREE, new THREE.CylinderGeometry(0.011, 0.011, 0.014, 6), C.CHROME, 0.8, 0.2)
    s.rotation.x = Math.PI / 2; s.position.set(-0.1875 + i * 0.075, 0.5, 0.28); g.add(s)
  }

  // Output terminals (bottom row)
  for (let i = 0; i < 4; i++) {
    const t = mk(THREE, new THREE.BoxGeometry(0.048, 0.052, 0.038), C.GRAY_L, 0.5, 0.4)
    t.position.set(-0.15 + i * 0.1, -0.5, 0.258); g.add(t)
    const s = mk(THREE, new THREE.CylinderGeometry(0.011, 0.011, 0.014, 6), C.CHROME, 0.8, 0.2)
    s.rotation.x = Math.PI / 2; s.position.set(-0.15 + i * 0.1, -0.5, 0.28); g.add(s)
  }

  // Reset push button (blue)
  const btnBody = mk(THREE, new THREE.CylinderGeometry(0.036, 0.036, 0.022, 16), 0x1a4ab8, 0.3, 0.5)
  btnBody.rotation.x = Math.PI / 2; btnBody.position.set(0.12, 0.18, 0.274); g.add(btnBody)
  const btnTop = mk(THREE, new THREE.CylinderGeometry(0.026, 0.026, 0.008, 16), 0x2060e0, 0.2, 0.4)
  btnTop.rotation.x = Math.PI / 2; btnTop.position.set(0.12, 0.18, 0.283); g.add(btnTop)

  // DIN rail
  const dinRail = mk(THREE, new THREE.BoxGeometry(0.52, 0.038, 0.055), C.CHROME, 0.8, 0.2)
  dinRail.position.y = -0.5; g.add(dinRail)
  const clip = mk(THREE, new THREE.BoxGeometry(0.44, 0.048, 0.035), C.DARK, 0.5, 0.5)
  clip.position.set(0, -0.52, 0.266); g.add(clip)

  return g
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
function buildProcedural(machineId: string, THREE: TM): THREE_T.Group | null {
  switch (machineId) {
    case 'general-pneumatics': return buildPneumatics(THREE)
    case 'general-sensors':    return buildSensor(THREE)
    case 'general-packaging':  return buildPackaging(THREE)
    case 'general-reject':     return buildReject(THREE)
    case 'general-vfd':        return buildVFD(THREE)
    case 'general-safety':     return buildSafety(THREE)
    default:                   return null
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ModelViewer({ machineId, modelPath, faultZone, title }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    let renderer: THREE_T.WebGLRenderer | null = null
    let animId = 0

    type Listener = [EventTarget, string, (e: any) => void]
    const listeners: Listener[] = []
    function on(target: EventTarget, event: string, fn: (e: any) => void) {
      target.addEventListener(event, fn)
      listeners.push([target, event, fn])
    }

    async function init(cvs: HTMLCanvasElement) {
      const THREE = await import('three')
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      if (cancelled) return

      const w = cvs.clientWidth || cvs.offsetWidth || 580
      const h = 350

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0xf9fafb)

      const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000)
      camera.position.set(0, 0.5, 3.5)
      camera.lookAt(0, 0, 0)

      scene.add(new THREE.AmbientLight(0xffffff, 1.2))
      const dir = new THREE.DirectionalLight(0xffffff, 1.8)
      dir.position.set(5, 8, 5); scene.add(dir)
      const fill = new THREE.DirectionalLight(0xffffff, 0.4)
      fill.position.set(-5, 2, -3); scene.add(fill)

      renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true })
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      // Try GLB first; fall through to procedural on any failure
      let model: THREE_T.Group | null = null
      if (modelPath) {
        try {
          const loader = new GLTFLoader()
          const gltf = await new Promise<{ scene: THREE_T.Group }>((resolve, reject) => {
            loader.load(modelPath, resolve as any, undefined, reject)
          })
          if (!cancelled) model = gltf.scene
        } catch { /* fall through */ }
      }

      if (cancelled) return

      if (!model) model = buildProcedural(machineId, THREE) ?? new THREE.Group()

      fitToView(model, THREE)
      scene.add(model)
      setLoading(false)

      // Rotation + drag
      let rotation = 0, isDragging = false, lastX = 0
      on(cvs, 'mousedown',  (e: MouseEvent)  => { isDragging = true;  lastX = e.clientX })
      on(window, 'mousemove', (e: MouseEvent) => { if (!isDragging) return; rotation += (e.clientX - lastX) * 0.01; lastX = e.clientX })
      on(window, 'mouseup',   ()              => { isDragging = false })
      on(cvs, 'touchstart', (e: TouchEvent)  => { isDragging = true;  lastX = e.touches[0].clientX })
      on(window, 'touchmove', (e: TouchEvent) => { if (!isDragging) return; rotation += (e.touches[0].clientX - lastX) * 0.01; lastX = e.touches[0].clientX })
      on(window, 'touchend',  ()              => { isDragging = false })

      const liveModel = model
      function animate() {
        animId = requestAnimationFrame(animate)
        if (!isDragging) rotation += 0.004
        liveModel.rotation.y = rotation
        renderer!.render(scene, camera)
      }
      animate()
    }

    init(canvas)

    return () => {
      cancelled = true
      cancelAnimationFrame(animId)
      listeners.forEach(([t, e, fn]) => t.removeEventListener(e, fn))
      renderer?.dispose()
    }
  }, [modelPath, machineId])

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{faultZone}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginTop: 2 }}>{title}</div>
      </div>
      <div style={{ position: 'relative', height: 350 }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTop: '3px solid #185FA5', borderRadius: '50%', animation: 'mv-spin 0.8s linear infinite' }} />
            <style>{`@keyframes mv-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab' }} />
      </div>
      <div style={{ padding: '8px 16px 10px', textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>Drag to rotate</div>
    </div>
  )
}

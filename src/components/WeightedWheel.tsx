import { useEffect, useMemo, useRef, useState } from 'react'
import type { WheelOption } from '../types'

const SPIN_DURATION_MS = 2600

// Geometry bounds (in the 200x200 SVG viewBox) that keep every label clear of the hub and
// the outer rim, however many characters it has or however many wedges share the wheel.
const LABEL_R = 55
const HUB_KEEPOUT_R = 24
const OUTER_KEEPOUT_R = 90
const MAX_LABEL_LEN = 2 * Math.min(LABEL_R - HUB_KEEPOUT_R, OUTER_KEEPOUT_R - LABEL_R)
const FONT_REF_R = 24
const MIN_FONT = 3
const MAX_FONT = 8
const AVG_CHAR_WIDTH = 0.56

type Wedge = WheelOption & { start: number; end: number; mid: number }

function weightedPick(options: WheelOption[]): WheelOption {
  const total = options.reduce((sum, o) => sum + o.weight, 0)
  let r = Math.random() * total
  for (const option of options) {
    r -= option.weight
    if (r <= 0) return option
  }
  return options[options.length - 1]
}

function wedgeGeometry(options: WheelOption[]): Wedge[] {
  const total = options.reduce((sum, o) => sum + o.weight, 0)
  let cursor = 0
  return options.map((o) => {
    const start = (cursor / total) * 360
    cursor += o.weight
    const end = (cursor / total) * 360
    return { ...o, start, end, mid: (start + end) / 2 }
  })
}

function polar(angleDeg: number, r: number, cx = 100, cy = 100) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) }
}

/** Font size that keeps a label's rendered height from bleeding into neighboring wedges,
 * based on the arc width available near the label's inner (narrowest) reach. */
function spanFontSize(spanDeg: number): number {
  const spanRad = (spanDeg * Math.PI) / 180
  return Math.max(MIN_FONT, Math.min(MAX_FONT, spanRad * FONT_REF_R * 0.9))
}

/** Largest font size at which `label` renders within the wheel's radial safe zone, so long
 * labels shrink to fit naturally instead of being squished sideways at a fixed size. */
function lengthFontSize(labelLen: number): number {
  return MAX_LABEL_LEN / (labelLen * AVG_CHAR_WIDTH)
}

const TICKS = Array.from({ length: 24 }, (_, i) => i * 15)

type Props = {
  options: WheelOption[]
  autoSpin?: boolean
  onSpinStart?: () => void
  onLand: (option: WheelOption) => void
}

export default function WeightedWheel({ options, autoSpin = false, onSpinStart, onLand }: Props) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [landed, setLanded] = useState(false)
  const landedOptionRef = useRef<WheelOption | null>(null)
  const wedges = useMemo(() => wedgeGeometry(options), [options])

  function spin() {
    if (spinning || landed) return
    onSpinStart?.()
    const option = weightedPick(options)
    landedOptionRef.current = option
    const wedge = wedges.find((w) => w.label === option.label)!
    // Land anywhere within the wedge (with a small inset so it never sits exactly on a
    // boundary line), not always dead-center — keeps the spin visually suspenseful.
    const span = wedge.end - wedge.start
    const inset = Math.min(1.5, span * 0.1)
    const landingAngle = wedge.start + inset + Math.random() * Math.max(0.001, span - inset * 2)
    const targetMod = ((-landingAngle % 360) + 360) % 360
    const extraSpins = 5 + Math.floor(Math.random() * 2)
    const base = Math.ceil((rotation + 1) / 360) * 360
    let target = base + extraSpins * 360 + targetMod
    while (target <= rotation) target += 360
    setSpinning(true)
    setRotation(target)
  }

  useEffect(() => {
    if (!autoSpin) return
    const timer = setTimeout(spin, 450)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleTransitionEnd() {
    if (!spinning) return
    setSpinning(false)
    setLanded(true)
    if (landedOptionRef.current) onLand(landedOptionRef.current)
  }

  const canSpin = !spinning && !landed

  return (
    <button
      type="button"
      onClick={spin}
      disabled={!canSpin}
      aria-label="Spin the wheel"
      className="relative mx-auto aspect-square w-full max-w-[340px] select-none disabled:cursor-default"
    >
      <svg
        viewBox="0 0 200 200"
        className={`h-full w-full drop-shadow-[0_0_28px_rgba(0,0,0,0.65)] ${canSpin ? 'animate-pulse' : ''}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning
            ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.1, 0.7, 0.15, 1)`
            : undefined,
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        <defs>
          <linearGradient id="wheelBezel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e8c168" />
            <stop offset="45%" stopColor="#8a6a2f" />
            <stop offset="55%" stopColor="#c9a24b" />
            <stop offset="100%" stopColor="#5c4720" />
          </linearGradient>
        </defs>

        <circle cx="100" cy="100" r="98" fill="none" stroke="url(#wheelBezel)" strokeWidth={3.5} />
        <circle cx="100" cy="100" r="95.5" fill="#0a0806" stroke="#1c140a" strokeWidth={1} />

        {wedges.map((w) => {
          const p1 = polar(w.start, 94)
          const p2 = polar(w.end, 94)
          const large = w.end - w.start > 180 ? 1 : 0
          const path = `M100,100 L${p1.x.toFixed(3)},${p1.y.toFixed(3)} A94,94 0 ${large} 1 ${p2.x.toFixed(3)},${p2.y.toFixed(3)} Z`
          const labelPos = polar(w.mid, LABEL_R)
          const rotateLabel = w.mid - 90
          const span = w.end - w.start
          // Shrink the font to whichever is smaller: the size that avoids bleeding into
          // neighboring wedges, or the size that keeps the whole label within the wheel's
          // radial safe zone. Only if it's still too long at the size floor do we fall back
          // to tightening letter-spacing (never stretching/squishing the glyphs themselves).
          const fontSize = Math.max(MIN_FONT, Math.min(spanFontSize(span), lengthFontSize(w.label.length)))
          const naturalLen = w.label.length * fontSize * AVG_CHAR_WIDTH
          const clampLen = naturalLen > MAX_LABEL_LEN
          return (
            <g key={`${w.label}-${w.start}`}>
              <path d={path} fill={w.color} stroke="#180f06" strokeWidth={0.6} />
              {w.image && (
                <image
                  href={w.image}
                  x={labelPos.x - 12}
                  y={labelPos.y - 12}
                  width={24}
                  height={24}
                  clipPath="circle(12px)"
                />
              )}
              <text
                x={labelPos.x}
                y={labelPos.y}
                fill="#fff"
                stroke="#000"
                strokeWidth={0.5}
                paintOrder="stroke"
                fontSize={fontSize}
                fontWeight={800}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${rotateLabel}, ${labelPos.x}, ${labelPos.y})`}
                {...(clampLen ? { textLength: MAX_LABEL_LEN, lengthAdjust: 'spacing' as const } : {})}
              >
                {w.label}
              </text>
            </g>
          )
        })}

        {TICKS.map((deg) => {
          const a = polar(deg, 95.5)
          const b = polar(deg, 98.5)
          return (
            <line
              key={deg}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#e8c168"
              strokeOpacity={0.55}
              strokeWidth={0.6}
            />
          )
        })}
      </svg>

      {/* pointer */}
      <div className="absolute left-1/2 top-[-3px] z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-amber-900 bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_1px_4px_rgba(0,0,0,0.5)]" />

      {/* hub */}
      <div className="absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-amber-600/70 bg-gradient-to-br from-neutral-800 to-neutral-950 shadow-[inset_0_2px_6px_rgba(0,0,0,0.7)]">
        <span className="text-base leading-none opacity-50">🧭</span>
      </div>
    </button>
  )
}

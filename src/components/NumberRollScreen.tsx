import { useState } from 'react'
import type { NumberRollNode } from '../types'
import { roundBountyCandidates } from '../data/gameData'

type Props = {
  node: NumberRollNode
  range: [number, number]
  onResolved: (value: number) => void
}

const ROLL_DURATION_MS = 1400
const ROLL_TICK_MS = 70

function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

export default function NumberRollScreen({ node, range, onResolved }: Props) {
  const [display, setDisplay] = useState<number | null>(null)
  const [rolling, setRolling] = useState(false)
  const [landed, setLanded] = useState(false)

  function roll() {
    if (rolling || landed) return
    const pool = roundBountyCandidates(range[0], range[1])
    const candidates = pool.length > 0 ? pool : [range[0]]
    setRolling(true)
    const start = Date.now()
    const timer = window.setInterval(() => {
      if (Date.now() - start >= ROLL_DURATION_MS) {
        window.clearInterval(timer)
        const final = candidates[Math.floor(Math.random() * candidates.length)]
        setDisplay(final)
        setRolling(false)
        setLanded(true)
        window.setTimeout(() => onResolved(final), 1300)
        return
      }
      setDisplay(candidates[Math.floor(Math.random() * candidates.length)])
    }, ROLL_TICK_MS)
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="inline-flex max-w-[300px] items-center gap-2 rounded-full border border-amber-700/40 bg-neutral-900/90 px-4 py-2.5 shadow-[0_0_0_1px_rgba(232,193,104,0.06)]">
          {node.icon && <span className="text-lg leading-none">{node.icon}</span>}
          <span className="text-sm font-semibold text-amber-200/90">
            {node.category ? `${node.category} • ${node.question}` : node.question}
          </span>
        </div>
        <div className="font-display min-h-[2.5rem] px-4 text-3xl font-bold tracking-tight text-white">
          {display !== null ? formatNumber(display) : '???'}
        </div>
      </div>

      <button
        type="button"
        onClick={roll}
        disabled={rolling || landed}
        aria-label="Roll for the number"
        className={`relative mx-auto flex aspect-square w-full max-w-[220px] items-center justify-center rounded-full border-[3px] border-amber-600/70 bg-gradient-to-br from-neutral-800 to-neutral-950 shadow-[0_0_28px_rgba(0,0,0,0.65)] disabled:cursor-default ${!rolling && !landed ? 'animate-pulse' : ''}`}
      >
        <span className="text-sm font-bold uppercase tracking-[0.2em] text-amber-300/90">
          {landed ? 'Locked In' : rolling ? 'Rolling…' : 'Reveal'}
        </span>
      </button>

      {!rolling && !landed && (
        <span className="animate-pulse text-xs uppercase tracking-[0.2em] text-neutral-500">
          Tap to reveal
        </span>
      )}
    </div>
  )
}

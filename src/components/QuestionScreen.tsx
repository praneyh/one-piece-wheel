import { useState } from 'react'
import type { WheelNode, WheelOption } from '../types'
import WeightedWheel from './WeightedWheel'

type Props = {
  node: WheelNode
  options: WheelOption[]
  onResolved: (label: string, option: WheelOption) => void
}

export default function QuestionScreen({ node, options, onResolved }: Props) {
  const [started, setStarted] = useState(false)
  const [result, setResult] = useState<WheelOption | null>(null)

  function handleLand(option: WheelOption) {
    setResult(option)
    window.setTimeout(() => onResolved(option.label, option), 1300)
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
        <div className="font-display min-h-[2.5rem] px-4 text-2xl font-bold tracking-tight text-white">
          {result ? result.label : '???'}
        </div>
        {result?.flavorText && (
          <div className="max-w-xs text-sm text-neutral-400">{result.flavorText}</div>
        )}
      </div>

      <WeightedWheel options={options} onSpinStart={() => setStarted(true)} onLand={handleLand} />

      {!started && (
        <span className="animate-pulse text-xs uppercase tracking-[0.2em] text-neutral-500">
          Tap the wheel to spin
        </span>
      )}
    </div>
  )
}

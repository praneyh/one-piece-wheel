import { useEffect } from 'react'
import type { CharacterState, RecapNode } from '../types'

type Props = {
  node: RecapNode
  character: CharacterState
  onAdvance: () => void
}

export default function RecapScreen({ node, character, onAdvance }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onAdvance, 3200)
    return () => window.clearTimeout(timer)
  }, [onAdvance])

  const accentClass =
    node.accent === 'green'
      ? 'text-emerald-400 [text-shadow:0_0_14px_rgba(16,185,129,0.65)]'
      : 'text-amber-300 [text-shadow:0_0_14px_rgba(232,193,104,0.65)]'

  const backgroundImage =
    node.accent === 'green'
      ? 'radial-gradient(circle at 50% 15%, #064e3b, #020617 65%)'
      : 'radial-gradient(circle at 50% 15%, #4a3210, #020617 65%)'

  return (
    <button
      type="button"
      onClick={onAdvance}
      className="relative flex min-h-full w-full flex-1 flex-col items-center justify-center gap-5 overflow-hidden px-8 py-16 text-center"
      style={{ backgroundImage }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:radial-gradient(rgba(255,255,255,0.9)_0.6px,transparent_0.6px)] [background-size:22px_22px]" />
      <div
        className={`relative text-3xl ${node.accent === 'green' ? 'text-emerald-400/80' : 'text-amber-300/80'}`}
      >
        {node.accent === 'green' ? '🧑‍🤝‍🧑' : '⚡'}
      </div>
      <h2
        className={`font-display relative text-2xl font-bold uppercase leading-tight tracking-wide ${accentClass}`}
      >
        {node.title(character)}
      </h2>
      <p className={`relative whitespace-pre-line text-base font-semibold ${accentClass}`}>
        {node.body(character)}
      </p>
      <span className="relative mt-6 text-xs uppercase tracking-[0.2em] text-neutral-500">
        tap to continue
      </span>
    </button>
  )
}

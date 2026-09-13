import { useState } from 'react'
import type { NameInputNode } from '../types'

type Props = {
  node: NameInputNode
  onSubmit: (name: string) => void
}

export default function NameInputScreen({ node, onSubmit }: Props) {
  const [name, setName] = useState('')
  const maxLength = node.maxLength ?? 24
  const trimmed = name.trim()
  const canSubmit = trimmed.length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (canSubmit) onSubmit(trimmed)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 px-6 py-10"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="inline-flex max-w-[300px] items-center gap-2 rounded-full border border-amber-700/40 bg-neutral-900/90 px-4 py-2.5 shadow-[0_0_0_1px_rgba(232,193,104,0.06)]">
          <span className="text-lg leading-none">🗿</span>
          <span className="text-sm font-semibold text-amber-200/90">{node.question}</span>
        </div>
        <div className="font-display min-h-[2.5rem] px-4 text-2xl font-bold tracking-tight text-white">
          Immortalized
        </div>
      </div>

      <div className="flex w-full max-w-xs flex-col items-center gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={maxLength}
          autoFocus
          placeholder="Their name..."
          className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-center text-lg font-semibold text-white placeholder:text-neutral-600 focus:border-amber-500/60 focus:outline-none"
        />
        <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
          {trimmed.length}/{maxLength}
        </span>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-3 font-bold uppercase tracking-wide text-black shadow-[0_2px_10px_rgba(232,193,104,0.35)] transition hover:from-amber-200 hover:to-amber-400 active:scale-95 disabled:cursor-not-allowed disabled:from-neutral-700 disabled:to-neutral-800 disabled:text-neutral-500 disabled:shadow-none disabled:active:scale-100"
      >
        Confirm
      </button>
    </form>
  )
}

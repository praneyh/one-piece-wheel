import { useEffect, useState } from 'react'
import { resolveOptions } from './types'
import { STORY_GRAPH } from './data/storyGraph'
import { useStoryStore } from './store'
import QuestionScreen from './components/QuestionScreen'
import RecapScreen from './components/RecapScreen'
import EndingScreen from './components/EndingScreen'
import StatsPanel from './components/StatsPanel'

export default function App() {
  const currentNodeId = useStoryStore((s) => s.currentNodeId)
  const visitId = useStoryStore((s) => s.visitId)
  const character = useStoryStore((s) => s.character)
  const goTo = useStoryStore((s) => s.goTo)
  const applySelection = useStoryStore((s) => s.applySelection)
  const restart = useStoryStore((s) => s.restart)
  const [statsOpen, setStatsOpen] = useState(false)

  const node = STORY_GRAPH[currentNodeId]

  // Recap nodes whose condition currently fails are skipped without rendering.
  useEffect(() => {
    if (node?.type === 'recap' && node.condition && !node.condition(character)) {
      const nextId = typeof node.next === 'function' ? node.next(character) : node.next
      goTo(nextId)
    }
  }, [node, character, goTo])

  if (!node) return null

  const shouldShowRecap = node.type === 'recap' && (!node.condition || node.condition(character))

  return (
    <div className="min-h-dvh w-full text-white">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
        {node.type !== 'ending' && (
          <div className="absolute inset-x-4 top-4 z-20 flex items-center justify-between">
            <span className="font-display flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-amber-300/80">
              <span className="text-sm">⚓</span> One Piece Wheel
            </span>
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              className="rounded-full border border-amber-700/40 bg-neutral-900/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-amber-500/60 hover:text-amber-200"
            >
              📊 Stats
            </button>
          </div>
        )}

        {node.type === 'wheel' && (
          <QuestionScreen
            key={`${node.id}:${visitId}`}
            node={node}
            options={resolveOptions(node, character)}
            onResolved={(label, option) => applySelection(node.id, label, option)}
          />
        )}

        {node.type === 'recap' && shouldShowRecap && (
          <RecapScreen
            key={`${node.id}:${visitId}`}
            node={node}
            character={character}
            onAdvance={() => {
              const nextId = typeof node.next === 'function' ? node.next(character) : node.next
              goTo(nextId)
            }}
          />
        )}

        {node.type === 'ending' && <EndingScreen character={character} onRestart={restart} />}
      </div>

      <StatsPanel character={character} open={statsOpen} onClose={() => setStatsOpen(false)} />
    </div>
  )
}

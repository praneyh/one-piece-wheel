import { create } from 'zustand'
import { createInitialState, type CharacterState, type WheelOption } from './types'
import { STORY_GRAPH, START_NODE_ID } from './data/storyGraph'

type StoryStore = {
  currentNodeId: string
  /** Bumped on every navigation, including a node routing back to itself (e.g. a hub option
   * that's flavor-only and just returns to the same hub). The screen components key off
   * `${currentNodeId}:${visitId}` instead of `currentNodeId` alone so React always remounts a
   * fresh instance — otherwise revisiting the same node id back-to-back reuses the old
   * component instance with its "already resolved" local state still set, freezing the UI. */
  visitId: number
  character: CharacterState
  goTo: (nodeId: string) => void
  applySelection: (nodeId: string, chosenLabel: string, chosenOption: WheelOption) => void
  restart: () => void
}

export const useStoryStore = create<StoryStore>((set, get) => ({
  currentNodeId: START_NODE_ID,
  visitId: 0,
  character: createInitialState(),

  goTo: (nodeId) => set((s) => ({ currentNodeId: nodeId, visitId: s.visitId + 1 })),

  applySelection: (nodeId, chosenLabel, chosenOption) => {
    const node = STORY_GRAPH[nodeId]
    if (!node || node.type !== 'wheel') return

    let nextState: CharacterState = {
      ...get().character,
      eventLog: [...get().character.eventLog, { question: node.question, answer: chosenLabel }],
    }
    if (node.onSelect) nextState = node.onSelect(nextState, chosenLabel, chosenOption)

    // Death always ends the run; otherwise the story only ends when the player deliberately
    // picks a "retire"-style option, which routes straight to 'ending' like any other node.
    const died = Boolean(nextState.causeOfDeath)
    const nextId = died
      ? 'ending'
      : typeof node.next === 'function'
        ? node.next(nextState, chosenLabel)
        : node.next

    set((s) => ({ character: nextState, currentNodeId: nextId, visitId: s.visitId + 1 }))
  },

  restart: () => set((s) => ({ currentNodeId: START_NODE_ID, character: createInitialState(), visitId: s.visitId + 1 })),
}))

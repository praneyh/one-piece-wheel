import { create } from 'zustand'
import { createInitialState, type CharacterState, type WheelOption } from './types'
import { STORY_GRAPH, START_NODE_ID } from './data/storyGraph'

type StoryStore = {
  currentNodeId: string
  character: CharacterState
  goTo: (nodeId: string) => void
  applySelection: (nodeId: string, chosenLabel: string, chosenOption: WheelOption) => void
  restart: () => void
}

export const useStoryStore = create<StoryStore>((set, get) => ({
  currentNodeId: START_NODE_ID,
  character: createInitialState(),

  goTo: (nodeId) => set({ currentNodeId: nodeId }),

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

    set({ character: nextState, currentNodeId: nextId })
  },

  restart: () => set({ currentNodeId: START_NODE_ID, character: createInitialState() }),
}))

import { create } from 'zustand'
import { createInitialState, type CharacterState, type WheelOption } from './types'
import { STORY_GRAPH, START_NODE_ID } from './data/storyGraph'
import { MASTERY_LEVEL_ORDER, allNpcNames, marineTierForRank, overallStrengthFromProfile, tierIndex } from './data/gameData'
import {
  addImmortal,
  immortalColorForIndex,
  loadImmortals,
  replaceImmortal,
  type ImmortalizedRecord,
} from './data/immortals'

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
  /** Advances a `nameInput` node — bypasses applySelection entirely since no wheel option is
   * being picked. Builds and persists an ImmortalizedRecord from the current character, then
   * resolves the node's own `next` like applySelection does for a wheel node. */
  submitImmortalName: (name: string) => void
  restart: () => void
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

/** Disambiguates a player-typed name against both canon NPC names and other stored immortals
 * (excluding `excludeName`, the gauntlet opponent this record is about to replace, if any) by
 * silently appending a Roman-numeral suffix — never blocks submission over a collision. */
function uniqueImmortalName(base: string, excludeName?: string): string {
  const taken = new Set([
    ...allNpcNames(),
    ...loadImmortals()
      .map((r) => r.name)
      .filter((n) => n !== excludeName),
  ])
  if (!taken.has(base)) return base
  for (let i = 2; i < ROMAN.length; i++) {
    const candidate = `${base} ${ROMAN[i]}`
    if (!taken.has(candidate)) return candidate
  }
  let i = ROMAN.length
  while (taken.has(`${base} (${i})`)) i++
  return `${base} (${i})`
}

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value))
}

function buildImmortalizedRecord(state: CharacterState, name: string): ImmortalizedRecord {
  const profile = {
    stats: state.stats,
    haki: state.haki,
    fightingMastery: state.fightingMastery ?? MASTERY_LEVEL_ORDER[0],
    devilFruitMastery: state.devilFruit ? state.devilFruitMastery : undefined,
    secondDevilFruitMastery: state.secondDevilFruit ? state.secondDevilFruitMastery : undefined,
  }
  const minTier = tierIndex(state)
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    affiliation: state.affiliation ?? 'Pirate',
    race: state.race,
    bloodline: state.bloodline,
    rank: state.rank,
    profile,
    minTier,
    marineTier: marineTierForRank(state),
    // Reaching Immortalize is inherently legendary — floor of 5, growing toward 10 the further
    // up their own rank ladder they'd climbed.
    notoriety: clamp(0, 10, Math.round(5 + (minTier / 7) * 5)),
    lethality: clamp(0, 3, Math.round((overallStrengthFromProfile(profile) / 100) * 3)),
    hasCrew: state.crew.length > 0 || Boolean(state.crewOrigin),
    color: immortalColorForIndex(loadImmortals().length),
    immortalizedAt: Date.now(),
  }
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

  submitImmortalName: (name) => {
    const node = STORY_GRAPH[get().currentNodeId]
    if (!node || node.type !== 'nameInput') return
    const state = get().character

    const finalName = uniqueImmortalName(name.trim(), state.pendingImmortalReplaceName)
    const record = buildImmortalizedRecord(state, finalName)

    if (state.pendingImmortalReplaceName) {
      replaceImmortal(state.pendingImmortalReplaceName, record)
    } else {
      addImmortal(record)
    }

    const nextState: CharacterState = {
      ...state,
      immortalized: true,
      immortalName: finalName,
      pendingImmortalReplaceName: undefined,
    }
    const nextId = typeof node.next === 'function' ? node.next(nextState) : node.next

    set((s) => ({ character: nextState, currentNodeId: nextId, visitId: s.visitId + 1 }))
  },

  restart: () => set((s) => ({ currentNodeId: START_NODE_ID, character: createInitialState(), visitId: s.visitId + 1 })),
}))

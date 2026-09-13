import type { Affiliation } from '../types'
import type { NpcDef, StrengthProfile } from './gameData'

/**
 * A character who chose Immortalize, frozen at that moment and persisted to localStorage so
 * they survive refreshes and can appear as an opponent in future runs on this device — until a
 * future character actually kills them, which deletes this record permanently (see
 * removeImmortalByName, called from applyAftermath in storyGraph.ts).
 */
export type ImmortalizedRecord = {
  id: string
  name: string
  affiliation: Affiliation
  race?: string
  bloodline?: string
  rank: string
  /** Same shape CharacterState.stats/.haki/.fightingMastery/.devilFruitMastery already use —
   * picked directly off the live character at immortalization time, no conversion needed. */
  profile: StrengthProfile
  /** tierIndex(state) at time of immortalization (0-7) — feeds npcOptions' continuous
   * tier-distance decay for the Pirate/Rival/Revolutionary pools. */
  minTier: number
  /** marineTierForRank(state) at time of immortalization — Marine encounters use a hard
   * 5-bucket partition instead of continuous decay, so this is frozen separately from minTier. */
  marineTier: 1 | 2 | 3 | 4 | 5
  notoriety: number
  lethality: number
  hasCrew: boolean
  color: string
  immortalizedAt: number
}

/** Once this many characters are immortalized, a new Immortalize pick fights an existing one
 * for their spot instead of just being added (see immortalizeGauntletOpponent in storyGraph.ts). */
export const IMMORTALS_CAP = 25

const STORAGE_KEY = 'one-piece-wheel:immortals'

const COLOR_PALETTE = [
  '#f59e0b',
  '#0ea5e9',
  '#dc2626',
  '#16a34a',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#b45309',
]

/** Cycles through a small fixed palette by insertion order — immortalized characters don't
 * have a hand-authored color like canon NPCs do, so this gives the gauntlet wheel and merged
 * rosters something real to render. */
export function immortalColorForIndex(index: number): string {
  return COLOR_PALETTE[index % COLOR_PALETTE.length]
}

/** localStorage can throw on read too (Safari private browsing, quota issues) — swallow and
 * treat as "no immortals saved" rather than crash the run. */
export function loadImmortals(): ImmortalizedRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveImmortals(list: ImmortalizedRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // Storage unavailable — silently no-op rather than crash the run over a persistence failure.
  }
}

export function isAtCap(): boolean {
  return loadImmortals().length >= IMMORTALS_CAP
}

/** No-ops (rather than overflow the cap) if called while already at capacity — the gauntlet
 * flow should always be used once isAtCap() is true; this is just a defensive backstop. */
export function addImmortal(record: ImmortalizedRecord): void {
  const list = loadImmortals()
  if (list.length >= IMMORTALS_CAP) return
  saveImmortals([...list, record])
}

/** Deletes the named record (the gauntlet opponent who was just defeated) and inserts the new
 * one, keeping the list at the cap rather than growing past it. */
export function replaceImmortal(oldName: string, record: ImmortalizedRecord): void {
  const list = loadImmortals().filter((r) => r.name !== oldName)
  saveImmortals([...list, record])
}

/** Permanently removes a stored immortalized character by name — called when a future
 * character kills them. Returns whether anything was actually removed (a no-op, safely, if the
 * name doesn't match a stored immortal — e.g. it was a canon NPC instead). */
export function removeImmortalByName(name: string): boolean {
  const list = loadImmortals()
  const next = list.filter((r) => r.name !== name)
  if (next.length === list.length) return false
  saveImmortals(next)
  return true
}

export function immortalsOfAffiliation(affiliation: Affiliation): ImmortalizedRecord[] {
  return loadImmortals().filter((r) => r.affiliation === affiliation)
}

/** Trivial field pick — an ImmortalizedRecord already carries everything an NpcDef needs. */
export function toNpcDef(record: ImmortalizedRecord): NpcDef {
  return {
    name: record.name,
    minTier: record.minTier,
    profile: record.profile,
    weight: 2,
    color: record.color,
    lethality: record.lethality,
    hasCrew: record.hasCrew,
    notoriety: record.notoriety,
  }
}

export function findImmortalNpcDef(name: string): NpcDef | undefined {
  const record = loadImmortals().find((r) => r.name === name)
  return record ? toNpcDef(record) : undefined
}

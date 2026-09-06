import {
  DURABILITY_TIERS,
  ENDURANCE_TIERS,
  HAKI_TYPES,
  POWER_TIERS,
  SPEED_TIERS,
  STAT_TIER_LADDERS,
  bumpStatTier,
  statTierIndex,
  type Affiliation,
  type CharacterState,
  type HakiLevel,
  type HakiState,
  type HakiType,
  type StatKey,
  type Stats,
  type WheelOption,
} from '../types'

export const opt = (label: string, weight: number, color: string, flavorText?: string): WheelOption => ({
  label,
  weight,
  color,
  flavorText,
})

// ---------------------------------------------------------------------------
// races
// ---------------------------------------------------------------------------

export type RaceDef = {
  label: string
  weight: number
  color: string
  /** Stat-tier shift applied on top of each starting-stat roll (e.g. +2 = two tiers higher). */
  mods: Partial<Record<StatKey, number>>
  blurb: string
}

export const RACES: RaceDef[] = [
  { label: 'Human', weight: 40, color: '#eab308', mods: {}, blurb: 'Balanced and adaptable — no bonuses, no penalties.' },
  { label: 'Fish-Man', weight: 6, color: '#2563eb', mods: { power: 2, endurance: 1 }, blurb: '10x strength underwater; built for brute force. (+2 Power tiers, +1 Endurance tier)' },
  { label: 'Mink', weight: 6, color: '#7c3aed', mods: { speed: 2, power: 1 }, blurb: 'Electro-charged reflexes and claws. (+2 Speed tiers, +1 Power tier)' },
  { label: 'Skypiean', weight: 5, color: '#64748b', mods: { speed: 1 }, blurb: 'Light-boned sky dwellers, built for the wind. (+1 Speed tier)' },
  { label: 'Giant', weight: 4, color: '#ea580c', mods: { power: 3, durability: 3, speed: -2 }, blurb: 'Towering size trades speed for raw power. (+3 Power tiers, +3 Durability tiers, -2 Speed tiers)' },
  { label: 'Cyborg', weight: 4, color: '#475569', mods: { durability: 3, power: 1 }, blurb: 'Reinforced frame, harder to put down. (+3 Durability tiers, +1 Power tier)' },
  { label: 'Hybrid', weight: 4, color: '#16a34a', mods: {}, blurb: 'The best of two worlds — spin twice more to find out which two.' },
  { label: 'Seraphim', weight: 3, color: '#8b5cf6', mods: { power: 3, durability: 2, speed: 2 }, blurb: 'Lunarian-blooded bioweapon output. (+3 Power tiers, +2 Durability tiers, +2 Speed tiers)' },
  { label: 'Tontatta', weight: 3, color: '#14b8a6', mods: { speed: 3, power: -2 }, blurb: 'Tiny and nimble, hits far above their size. (+3 Speed tiers, -2 Power tiers)' },
  { label: 'Long-Arm', weight: 3, color: '#f97316', mods: { power: 2, speed: -1 }, blurb: 'Reach for days. (+2 Power tiers, -1 Speed tier)' },
  { label: 'Long-Leg', weight: 3, color: '#ec4899', mods: { speed: 3, durability: -1 }, blurb: 'Built to run and kick. (+3 Speed tiers, -1 Durability tier)' },
  { label: 'Snake-Neck', weight: 3, color: '#dc2626', mods: { speed: 1, durability: 1 }, blurb: 'Deceptively hard to pin down. (+1 Speed tier, +1 Durability tier)' },
  { label: 'Three-Eye', weight: 2, color: '#84cc16', mods: { endurance: 2 }, blurb: 'The third eye senses beyond the five. (+2 Endurance tiers)' },
  { label: 'Celestial Dragon', weight: 1, color: '#fef08a', mods: { power: 1, speed: 1, durability: 1, endurance: 1 }, blurb: 'World Nobles — untouchable status, modest natural gifts. (+1 tier to everything)' },
]

// ---------------------------------------------------------------------------
// bloodlines — rare (~7%), each one grants a distinct permanent mechanical edge rather than a
// generic stat boost, so picking one feels like a different kind of advantage, not just "more".
// ---------------------------------------------------------------------------

export type BloodlineDef = {
  label: string
  weight: number
  color: string
  blurb: string
  /** Starting stat-tier shift, stacked on top of race mods via the same guaranteed-floor
   * mechanism used for race (see raceAdjustedStatTierOptions). */
  statMods?: Partial<Record<StatKey, number>>
  /** Guaranteed minimum Haki level(s) — the starting Haki wheel drops any option that would
   * fall short of this floor. */
  hakiFloor?: Partial<Record<HakiType, HakiLevel>>
  /** Starting Fighting Style Mastery is bumped this many tiers once rolled. */
  masteryStartBump?: number
  /** One fighting style becomes far likelier to be rolled. */
  fightingStyleBoost?: string
  /** Added to the "Yes" weight when rolling for a starting Devil Fruit. */
  devilFruitChanceBonus?: number
  /** Flat bonus applied to every post-fight/post-event growth roll for the rest of the run. */
  growthOddsBonus?: number
  /** Flat bonus applied to Road Poneglyph search odds. */
  poneglyphOddsBonus?: number
  /** Flat bonus applied to rank/bounty-increase rolls. */
  rankOddsBonus?: number
  /** Multiplies the "World Event" option's weight on every hub wheel. */
  worldEventWeightMultiplier?: number
  /** Nudges the starting-crew size/strength wheels toward their higher end; also applies to
   * every later crew-strength roll for a new recruit. */
  crewSizeBias?: number
  crewStrengthBias?: number
}

export const BLOODLINES: BloodlineDef[] = [
  {
    label: 'Monkey D. Family',
    weight: 3,
    color: '#dc2626',
    blurb:
      'The Will of D. — trouble and destiny find you no matter where you sail. (+1 Power tier; World Events much more frequent)',
    statMods: { power: 1 },
    worldEventWeightMultiplier: 3,
  },
  {
    label: "Gol D. Roger's Bloodline",
    weight: 1,
    color: '#facc15',
    blurb: "The Pirate King's own blood. (Guaranteed Conqueror's Haki; grow faster from every experience)",
    hakiFloor: { "Conqueror's": 'Basic' },
    growthOddsBonus: 6,
  },
  {
    label: 'Kozuki Family',
    weight: 3,
    color: '#be123c',
    blurb: 'Wano samurai royalty, hunted for twenty years. (Guaranteed Armament Haki; starts one mastery tier higher)',
    hakiFloor: { Armament: 'Basic' },
    masteryStartBump: 1,
  },
  {
    label: 'Vinsmoke Family (Germa 66)',
    weight: 2,
    color: '#1d4ed8',
    blurb: 'Genetically engineered super-soldier physiology. (+1 Power tier, +1 Durability tier)',
    statMods: { power: 1, durability: 1 },
  },
  {
    label: 'Charlotte Family',
    weight: 3,
    color: '#db2777',
    blurb: "Big Mom's sprawling brood — command comes naturally. (Your crew runs larger and stronger)",
    crewSizeBias: 2,
    crewStrengthBias: 1,
  },
  {
    label: 'Nico Family',
    weight: 3,
    color: '#0f766e',
    blurb: 'Ohara scholars, keepers of the true history. (Much better odds of finding Road Poneglyphs)',
    poneglyphOddsBonus: 4,
  },
  {
    label: 'Donquixote Family',
    weight: 2,
    color: '#c026d3',
    blurb: 'Fallen royalty with deep ties to the Devil Fruit underworld. (Much likelier to start with a Devil Fruit)',
    devilFruitChanceBonus: 3,
  },
  {
    label: 'Shimotsuki Family',
    weight: 2,
    color: '#334155',
    blurb: 'Descended from a legendary swordsman line. (Swordsmanship far more likely; starts one mastery tier higher)',
    fightingStyleBoost: 'Swordsmanship',
    masteryStartBump: 1,
  },
  {
    label: 'Kuja Tribe',
    weight: 3,
    color: '#f472b6',
    blurb: "Amazon Lily's warrior women — raised on combat since birth. (+2 Speed tiers)",
    statMods: { speed: 2 },
  },
  {
    label: "Fisher Tiger's Legacy",
    weight: 3,
    color: '#0369a1',
    blurb: "Carries the heroic will of the Sun Pirates' founder. (+1 Durability tier, +1 Endurance tier)",
    statMods: { durability: 1, endurance: 1 },
  },
  {
    label: "Rocks D. Xebec's Bloodline",
    weight: 1,
    color: '#450a0a',
    blurb: 'Blood tied to the single most monstrous generation the seas ever produced. (Grow far faster from every experience)',
    growthOddsBonus: 10,
  },
  {
    label: 'Nefertari Family',
    weight: 3,
    color: '#eab308',
    blurb: 'Alabastan royalty, trusted by common people and world leaders alike. (Much better odds of rising in rank)',
    rankOddsBonus: 5,
  },
]

export function bloodlineDef(state: CharacterState): BloodlineDef | undefined {
  return state.bloodline ? BLOODLINES.find((b) => b.label === state.bloodline) : undefined
}

/** A fixed, deliberately not-stat-dependent ~7% chance of carrying a special bloodline. */
export function bloodlineCheckOdds(): WheelOption[] {
  return [opt('Yes', 7, '#facc15'), opt('No', 93, '#374151')]
}

export function bloodlineOptions(): WheelOption[] {
  return BLOODLINES.map((b) => opt(b.label, b.weight, b.color, b.blurb))
}

const HAKI_LEVEL_RANK: Record<HakiLevel, number> = { None: 0, Basic: 1, Advanced: 2 }

/** Whether a Haki preset (e.g. one wedge of the starting Haki wheel) meets a bloodline's
 * guaranteed minimum for every Haki type it specifies. */
export function meetsHakiFloor(
  preset: Partial<Record<HakiType, HakiLevel>>,
  floor: Partial<Record<HakiType, HakiLevel>>,
): boolean {
  return (Object.keys(floor) as HakiType[]).every(
    (t) => HAKI_LEVEL_RANK[preset[t] ?? 'None'] >= HAKI_LEVEL_RANK[floor[t] as HakiLevel],
  )
}

/** Shifts a weighted ordinal ladder's distribution toward higher indices by `bias` steps —
 * used for the crew size/strength bloodline bonuses. Position i takes on the weight that used
 * to belong to position i-bias, sliding the whole shape toward the higher end without changing
 * its overall silhouette. */
function biasLadderOptions(options: WheelOption[], bias: number): WheelOption[] {
  if (bias === 0) return options
  const n = options.length
  return options.map((o, i) => {
    const sourceIdx = Math.min(n - 1, Math.max(0, i - bias))
    return { ...o, weight: options[sourceIdx].weight }
  })
}

export const STAT_OPTIONS: WheelOption[] = [
  opt('Power', 1, '#dc2626'),
  opt('Speed', 1, '#0ea5e9'),
  opt('Durability', 1, '#f59e0b'),
  opt('Endurance', 1, '#10b981'),
]

export const GROWTH_COUNT_OPTIONS: WheelOption[] = [
  opt('1', 10, '#fecaca'),
  opt('2', 7, '#f87171'),
  opt('3', 5, '#ef4444'),
  opt('4', 3, '#dc2626'),
  opt('5', 2, '#b91c1c'),
  opt('6', 1, '#7f1d1d'),
]

/** A race's net tier shift for one stat. A Hybrid character stacks the mods from both of
 * their component races instead of looking up a single race. */
function raceModFor(state: CharacterState, key: StatKey): number {
  const raceLabels = state.raceComponents ?? (state.race ? [state.race] : [])
  return raceLabels.reduce((sum, label) => {
    const raceDef = RACES.find((r) => r.label === label)
    return sum + (raceDef?.mods[key] ?? 0)
  }, 0)
}

function bloodlineModFor(state: CharacterState, key: StatKey): number {
  return bloodlineDef(state)?.statMods?.[key] ?? 0
}

/**
 * The starting-stat wheel for `key`, with every wedge's label already shifted by the
 * player's race mod — so the wheel can only ever land on the true final tier, and a positive
 * race bonus is a guaranteed floor rather than something the roll could still land under (the
 * old approach rolled on the unshifted wheel and applied the mod afterward, which meant the
 * on-screen result during the spin never matched what the race bonus should guarantee).
 * Wedges that shift onto the same resulting tier (clamped at either end of the ladder) merge
 * their weights rather than showing as duplicate slices.
 */
export function raceAdjustedStatTierOptions(state: CharacterState, key: StatKey): WheelOption[] {
  const mod = raceModFor(state, key) + bloodlineModFor(state, key)
  if (mod === 0) return STAT_TIER_OPTIONS[key]
  const merged = new Map<string, WheelOption>()
  for (const wedge of STAT_TIER_OPTIONS[key]) {
    const shiftedLabel = bumpStatTier(key, wedge.label, mod)
    const existing = merged.get(shiftedLabel)
    if (existing) {
      merged.set(shiftedLabel, { ...existing, weight: existing.weight + wedge.weight })
    } else {
      merged.set(shiftedLabel, { ...wedge, label: shiftedLabel })
    }
  }
  return [...merged.values()]
}

// ---------------------------------------------------------------------------
// stat tier wheels
// ---------------------------------------------------------------------------

const POWER_TIER_COLORS = ['#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#5c2a08', '#451a03', '#3b1704', '#2f1203', '#1c0a02']
const SPEED_TIER_COLORS = ['#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e', '#082f49', '#062338', '#041826', '#020c13']
const DURABILITY_TIER_COLORS = ['#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#651313', '#4c0e0e', '#380a0a', '#250606']
const ENDURANCE_TIER_COLORS = ['#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#0c3a1f']

function tierOptions(ladder: string[], colors: string[]): WheelOption[] {
  return ladder.map((label, i) => opt(label, Math.max(1, Math.round(30 * Math.pow(0.62, i))), colors[i % colors.length]))
}

export const POWER_TIER_OPTIONS = tierOptions(POWER_TIERS, POWER_TIER_COLORS)
export const SPEED_TIER_OPTIONS = tierOptions(SPEED_TIERS, SPEED_TIER_COLORS)
export const DURABILITY_TIER_OPTIONS = tierOptions(DURABILITY_TIERS, DURABILITY_TIER_COLORS)
export const ENDURANCE_TIER_OPTIONS = tierOptions(ENDURANCE_TIERS, ENDURANCE_TIER_COLORS)

export const STAT_TIER_OPTIONS: Record<StatKey, WheelOption[]> = {
  power: POWER_TIER_OPTIONS,
  speed: SPEED_TIER_OPTIONS,
  durability: DURABILITY_TIER_OPTIONS,
  endurance: ENDURANCE_TIER_OPTIONS,
}

/**
 * A single 1-100 "how strong is this character overall" number, built from every axis of
 * progression: the four core stats (45%), Haki (25%), fighting-style mastery (15%), and — if
 * they have one — Devil Fruit mastery (15%). Each axis is normalized to 0-1 by its own tier
 * ladder position before weighting, so a maxed-out character on every axis scores ~100 and a
 * fresh baseline character scores near 1. This is the number fight/growth/survival odds compare
 * against each opponent's own 1-100 power rating.
 */
/** A full stat sheet on the same scale the player builds — this is what both the player's own
 * overall strength and every NPC's overall strength are computed from, so the two sides of any
 * fight are always measured the same way. */
export type StrengthProfile = {
  stats: Stats
  haki: HakiState
  fightingMastery: string
  /** Omit (or leave undefined) for a character with no Devil Fruit. */
  devilFruitMastery?: string
  /** Only set for the rare survivor of a second Devil Fruit — its power stacks on top of the
   * first rather than replacing it. */
  secondDevilFruitMastery?: string
}

/**
 * The shared 1-100 "how strong is this character overall" formula: the four core stats
 * (45%), Haki (25%), fighting-style mastery (15%), and Devil Fruit mastery if applicable (15%).
 * Each axis is normalized to 0-1 by its own tier-ladder position before weighting, so a
 * character maxed out on every axis scores ~100 and a fresh baseline character scores near 1.
 */
export function overallStrengthFromProfile(profile: StrengthProfile): number {
  const statKeys: StatKey[] = ['power', 'speed', 'durability', 'endurance']
  const statScore =
    statKeys.reduce((sum, k) => sum + statTierIndex(k, profile.stats[k]) / (STAT_TIER_LADDERS[k].length - 1), 0) /
    statKeys.length

  const hakiOrder: HakiLevel[] = ['None', 'Basic', 'Advanced']
  const hakiScore =
    HAKI_TYPES.reduce((sum, t) => sum + hakiOrder.indexOf(profile.haki[t]), 0) / (HAKI_TYPES.length * 2)

  const masteryIdx = Math.max(0, MASTERY_LEVEL_ORDER.indexOf(profile.fightingMastery))
  const masteryScore = masteryIdx / (MASTERY_LEVEL_ORDER.length - 1)

  // A second Devil Fruit's mastery stacks on top of the first (capped at the same 1.0 ceiling as
  // a single maxed-out fruit) rather than averaging the two down — surviving the fluke is
  // supposed to make you stronger, not dilute what you already had.
  const dfIdx1 = profile.devilFruitMastery
    ? Math.max(0, DEVIL_FRUIT_MASTERY_LEVELS.indexOf(profile.devilFruitMastery))
    : 0
  const dfIdx2 = profile.secondDevilFruitMastery
    ? Math.max(0, DEVIL_FRUIT_MASTERY_LEVELS.indexOf(profile.secondDevilFruitMastery))
    : 0
  const dfScore = profile.devilFruitMastery
    ? Math.min(1, (dfIdx1 + dfIdx2) / (DEVIL_FRUIT_MASTERY_LEVELS.length - 1))
    : 0

  const combined = statScore * 0.45 + hakiScore * 0.25 + masteryScore * 0.15 + dfScore * 0.15
  return Math.max(1, Math.min(100, Math.round(combined * 100)))
}

/** Builds the player's own StrengthProfile from their current run and scores it. */
export function playerOverallStrength(state: CharacterState): number {
  return overallStrengthFromProfile({
    stats: state.stats,
    haki: state.haki,
    fightingMastery: state.fightingMastery ?? MASTERY_LEVEL_ORDER[0],
    devilFruitMastery: state.devilFruit ? (state.devilFruitMastery ?? DEVIL_FRUIT_MASTERY_LEVELS[0]) : undefined,
    secondDevilFruitMastery: state.secondDevilFruit
      ? (state.secondDevilFruitMastery ?? DEVIL_FRUIT_MASTERY_LEVELS[0])
      : undefined,
  })
}

// ---------------------------------------------------------------------------
// Combat edge — the actual fight/growth/survival math below is driven by this, not by the
// blended 1-100 overall-strength score above.
//
// Averaging four stats into one number (as overallStrengthFromProfile does) hides exactly the
// kind of mismatch that should decide a fight: a character with, say, Universal Level
// durability is untouchable by a foe who can at best output Town Level force, no matter how
// that foe's OTHER stats average out. So combat odds instead compare offense against defense
// tier-for-tier (my power vs their durability, and vice versa) and treat a several-tier gap as
// what it is in this setting — usually decisive — rather than one moderate blend.
// ---------------------------------------------------------------------------

type CombatProfile = {
  power: number
  speed: number
  durability: number
  endurance: number
  hakiSum: number
  masteryIdx: number
  dfMasteryIdx: number
}

const FALLBACK_COMBAT_PROFILE: CombatProfile = {
  power: 3,
  speed: 3,
  durability: 3,
  endurance: 3,
  hakiSum: 0,
  masteryIdx: 2,
  dfMasteryIdx: 0,
}

function combatProfileFrom(profile: StrengthProfile): CombatProfile {
  const hakiOrder: HakiLevel[] = ['None', 'Basic', 'Advanced']
  const dfIdx1 = profile.devilFruitMastery
    ? Math.max(0, DEVIL_FRUIT_MASTERY_LEVELS.indexOf(profile.devilFruitMastery))
    : 0
  // A second surviving Devil Fruit adds its own mastery on top in the fight math too — two
  // fruits' worth of power, not one diluted by the other.
  const dfIdx2 = profile.secondDevilFruitMastery
    ? Math.max(0, DEVIL_FRUIT_MASTERY_LEVELS.indexOf(profile.secondDevilFruitMastery))
    : 0
  return {
    power: statTierIndex('power', profile.stats.power),
    speed: statTierIndex('speed', profile.stats.speed),
    durability: statTierIndex('durability', profile.stats.durability),
    endurance: statTierIndex('endurance', profile.stats.endurance),
    hakiSum: HAKI_TYPES.reduce((sum, t) => sum + hakiOrder.indexOf(profile.haki[t]), 0),
    masteryIdx: Math.max(0, MASTERY_LEVEL_ORDER.indexOf(profile.fightingMastery)),
    dfMasteryIdx: dfIdx1 + dfIdx2,
  }
}

function playerCombatProfile(state: CharacterState): CombatProfile {
  return combatProfileFrom({
    stats: state.stats,
    haki: state.haki,
    fightingMastery: state.fightingMastery ?? MASTERY_LEVEL_ORDER[0],
    devilFruitMastery: state.devilFruit ? (state.devilFruitMastery ?? DEVIL_FRUIT_MASTERY_LEVELS[0]) : undefined,
    secondDevilFruitMastery: state.secondDevilFruit
      ? (state.secondDevilFruitMastery ?? DEVIL_FRUIT_MASTERY_LEVELS[0])
      : undefined,
  })
}

function npcCombatProfile(name: string): CombatProfile {
  const npc = ALL_NPCS.find((n) => n.name === name)
  return npc ? combatProfileFrom(npc.profile) : FALLBACK_COMBAT_PROFILE
}

/** How many edge-points constitute a "decisive" advantage in the win/lose logistic curve —
 * smaller means steeper, i.e. a smaller gap already produces lopsided odds. */
const FIGHT_EDGE_SCALE = 8

const EDGE_SPEED_WEIGHT = 0.5
const EDGE_ENDURANCE_WEIGHT = 0.3

/**
 * A signed "how lopsided is this matchup" score: positive favors the player, negative favors
 * the opponent. Built from raw tier-index gaps (not normalized 0-1), so a genuinely huge gap on
 * any one axis — especially the offense-vs-defense exchange — dominates the result the way it
 * would in the actual story, instead of being diluted by averaging in less-relevant stats.
 */
export function combatEdge(state: CharacterState, opponentName: string): number {
  const me = playerCombatProfile(state)
  const opp = npcCombatProfile(opponentName)

  // Can I hurt them? (my power vs their durability) minus can they hurt me? (their power vs
  // my durability) — this is what actually determines who's in danger in a fight, not a
  // power-vs-power or durability-vs-durability comparison in isolation.
  const myOffense = me.power - opp.durability
  const theirOffense = opp.power - me.durability
  const physicalEdge = myOffense - theirOffense

  const speedEdge = (me.speed - opp.speed) * EDGE_SPEED_WEIGHT
  const enduranceEdge = (me.endurance - opp.endurance) * EDGE_ENDURANCE_WEIGHT
  const hakiEdge = me.hakiSum - opp.hakiSum
  const masteryEdge = me.masteryIdx - opp.masteryIdx
  const dfEdge = me.dfMasteryIdx - opp.dfMasteryIdx

  return physicalEdge + speedEdge + enduranceEdge + hakiEdge + masteryEdge + dfEdge
}

/** Maps a signed edge score to a 1-99 weight via a logistic curve — steep enough that a
 * genuinely decisive edge (the kind a several-tier stat gap produces) lands in the 90s+,
 * while a near-even matchup stays close to 50/50. */
function logisticWeight(edge: number, scale: number): number {
  const probability = 100 / (1 + Math.pow(10, -edge / scale))
  return Math.round(Math.max(1, Math.min(99, probability)))
}

const STAT_TIER_COLOR_PALETTES: Record<StatKey, string[]> = {
  power: POWER_TIER_COLORS,
  speed: SPEED_TIER_COLORS,
  durability: DURABILITY_TIER_COLORS,
  endurance: ENDURANCE_TIER_COLORS,
}

/** Wheel of every tier of `key` above the player's current one, rarer the higher it goes. */
export function higherStatOptions(state: CharacterState, key: StatKey): WheelOption[] {
  const ladder = STAT_TIER_LADDERS[key]
  const colors = STAT_TIER_COLOR_PALETTES[key]
  const idx = statTierIndex(key, state.stats[key])
  const higher = ladder.slice(idx + 1)
  if (higher.length === 0) {
    return [opt(state.stats[key], 1, colors[colors.length - 1], "You've already reached the peak.")]
  }
  return higher.map((label, i) => opt(label, Math.max(1, Math.round(20 * Math.pow(0.55, i))), colors[(idx + 1 + i) % colors.length]))
}

const HAKI_LEVEL_ORDER: HakiLevel[] = ['None', 'Basic', 'Advanced']

/** Wheel of every Haki level of `type` above the player's current one. */
export function higherHakiOptions(state: CharacterState, type: HakiType): WheelOption[] {
  const idx = HAKI_LEVEL_ORDER.indexOf(state.haki[type])
  const higher = HAKI_LEVEL_ORDER.slice(idx + 1)
  const rare = type === "Conqueror's"
  if (higher.length === 0) {
    return [opt(state.haki[type], 1, '#6b7280', 'Already mastered.')]
  }
  return higher.map((level, i) =>
    opt(level, i === 0 ? (rare ? 2 : 10) : rare ? 1 : 3, level === 'Advanced' ? '#fde047' : '#f87171'),
  )
}

/** Generic "every rung of `ladder` above `current`", rarer the higher it goes. */
function higherLadderOptions(ladder: string[], current: string, colors: string[]): WheelOption[] {
  const idx = ladder.indexOf(current)
  const higher = ladder.slice(Math.max(0, idx) + 1)
  if (higher.length === 0) {
    return [opt(current, 1, colors[colors.length - 1], "You've already reached the peak.")]
  }
  return higher.map((label, i) => opt(label, Math.max(1, Math.round(20 * Math.pow(0.55, i))), colors[(idx + 1 + i) % colors.length]))
}

/** How many distinct stats (including the 3 Haki types, fighting mastery, and Devil Fruit
 * mastery if applicable) can still grow at all. */
export function growableCount(state: CharacterState): number {
  const statCount = STAT_OPTIONS.filter((o) => {
    const key = o.label.toLowerCase() as StatKey
    return statTierIndex(key, state.stats[key]) < STAT_TIER_LADDERS[key].length - 1
  }).length
  const hakiCount = HAKI_TYPES.filter((t) => state.haki[t] !== 'Advanced').length
  const masteryCount = MASTERY_LEVEL_ORDER.indexOf(state.fightingMastery ?? '') < MASTERY_LEVEL_ORDER.length - 1 ? 1 : 0
  const dfMaxIdx = DEVIL_FRUIT_MASTERY_LEVELS.length - 1
  const dfIdx1 = DEVIL_FRUIT_MASTERY_LEVELS.indexOf(state.devilFruitMastery ?? DEVIL_FRUIT_MASTERY_LEVELS[0])
  const dfIdx2 = state.secondDevilFruit
    ? DEVIL_FRUIT_MASTERY_LEVELS.indexOf(state.secondDevilFruitMastery ?? DEVIL_FRUIT_MASTERY_LEVELS[0])
    : dfMaxIdx
  const dfMasteryCount = state.devilFruit && (dfIdx1 < dfMaxIdx || dfIdx2 < dfMaxIdx) ? 1 : 0
  return statCount + hakiCount + masteryCount + dfMasteryCount
}

/** Weighted Yes/No odds for post-fight growth: the harder the fight relative to your own
 * overall strength, the more likely it is to have pushed you to grow. An easy stomp barely
 * teaches you anything; a fight against someone far stronger than you is where growth happens. */
export function growthOdds(state: CharacterState, opponentName: string): WheelOption[] {
  const difficulty = -combatEdge(state, opponentName) // positive = the fight was hard for me
  const bonus = bloodlineDef(state)?.growthOddsBonus ?? 0
  const yesWeight = Math.min(95, Math.max(2, Math.round(35 + difficulty * 1.5 + bonus)))
  const noWeight = 100 - yesWeight
  return [opt('Yes', yesWeight, '#16a34a'), opt('No', noWeight, '#dc2626')]
}

/** Opponent-agnostic growth odds for non-combat moments (a lucky find, a spreading
 * reputation) — scaled by how rare the triggering event was. `rarityWeight` is that event's
 * own weight on the hub wheel it came from: a smaller weight (rarer to land on) means a bigger
 * payoff when it does happen, since rare experiences should feel more rewarding than routine ones. */
export function growthOddsGeneric(state: CharacterState, rarityWeight = 5): WheelOption[] {
  const bonus = bloodlineDef(state)?.growthOddsBonus ?? 0
  const yesWeight = Math.min(95, Math.max(15, Math.round(85 - rarityWeight * 8 + bonus)))
  const noWeight = 100 - yesWeight
  return [opt('Yes', yesWeight, '#16a34a'), opt('No', noWeight, '#dc2626')]
}

/** Eating a second Devil Fruit is fatal in canon without exception — surviving it at all is a
 * fluke the story has never actually shown, so the odds stay a tiny fixed sliver regardless of
 * the character's own stats. */
export function secondDevilFruitSurvivalOdds(): WheelOption[] {
  return [opt('Survive', 2, '#16a34a'), opt('Die', 98, '#7f1d1d')]
}

/** Which Devil Fruit a "Devil Fruit Mastery" growth pick should target: for a two-fruit
 * survivor, whichever of the two currently lags behind, so both fruits' power keeps growing
 * instead of the second one sitting untrained forever. */
export function growableDevilFruitSlot(state: CharacterState): 'first' | 'second' {
  if (!state.secondDevilFruit) return 'first'
  const idx1 = DEVIL_FRUIT_MASTERY_LEVELS.indexOf(state.devilFruitMastery ?? DEVIL_FRUIT_MASTERY_LEVELS[0])
  const idx2 = DEVIL_FRUIT_MASTERY_LEVELS.indexOf(state.secondDevilFruitMastery ?? DEVIL_FRUIT_MASTERY_LEVELS[0])
  return idx2 < idx1 ? 'second' : 'first'
}

// ---------------------------------------------------------------------------
// Immortalize — a rare, story-ending option that appears on the hub wheel only after
// enough spins, growing more likely to land on the longer the run goes.
// ---------------------------------------------------------------------------

const IMMORTALIZE_MIN_SPINS = 20
const IMMORTALIZE_GROWTH_PER_SPIN = 0.5

/** Returns the Immortalize wheel option once the hub has been spun enough times, or null
 * before then. Starts as one of the smallest slices and grows heavier every spin after. */
export function immortalizeOption(hubSpinCount: number): WheelOption | null {
  if (hubSpinCount < IMMORTALIZE_MIN_SPINS) return null
  const weight = 1 + (hubSpinCount - IMMORTALIZE_MIN_SPINS) * IMMORTALIZE_GROWTH_PER_SPIN
  return opt('Immortalize', weight, '#111827', 'Your legend is etched into the wheel forever.')
}

/** Weighted Yes/No odds for a post-fight rank/bounty bump, favoring wins against relatively stronger foes. */
export function rankIncreaseOdds(state: CharacterState, opponentName: string): WheelOption[] {
  const difficulty = -combatEdge(state, opponentName) // positive = the fight was hard for me
  const bonus = bloodlineDef(state)?.rankOddsBonus ?? 0
  const yesWeight = Math.min(95, Math.max(2, Math.round(25 + difficulty * 1.75 + bonus)))
  const noWeight = 100 - yesWeight
  return [opt('Yes', yesWeight, '#16a34a'), opt('No', noWeight, '#374151')]
}

// ---------------------------------------------------------------------------
// fighting styles
// ---------------------------------------------------------------------------

export const FIGHTING_STYLES: WheelOption[] = [
  opt('Swordsmanship', 6, '#4c1d95'),
  opt('Hand-to-Hand Brawling', 6, '#7c2d12'),
  opt('Fish-Man Karate', 4, '#0891b2'),
  opt('Powerhouse Grappling', 4, '#78350f'),
  opt('Marksmanship', 4, '#b45309'),
  opt('Rokushiki', 3, '#374151'),
  opt('Iron Body', 3, '#78716c'),
  opt('Staff Mastery', 3, '#166534'),
  opt('Boxing', 3, '#1e3a8a'),
  opt('Dual-Pistol Gunplay', 3, '#3f3f46'),
  opt('Ryusoken', 2, '#7c2d12'),
  opt('Electro Combat', 2, '#facc15'),
  opt('Whip Mastery', 2, '#9d174d'),
  opt('Assassination Arts', 2, '#111827'),
  opt('Cooking-Style Kicks', 2, '#ca8a04'),
  opt('Clima-Weapon Mastery', 2, '#0369a1'),
]

export const MASTERY_LEVELS: WheelOption[] = [
  opt('Novice', 10, '#e2e8f0'),
  opt('Competent', 8, '#cbd5e1'),
  opt('Skilled', 6, '#94a3b8'),
  opt('Expert', 4, '#64748b'),
  opt('Master', 2, '#475569'),
  opt('Grandmaster', 1, '#1e293b'),
]

export const MASTERY_LEVEL_ORDER = MASTERY_LEVELS.map((o) => o.label)
const MASTERY_COLORS = MASTERY_LEVELS.map((o) => o.color)

/** Wheel of every fighting-style mastery level above the player's current one. */
export function higherMasteryOptions(current: string): WheelOption[] {
  return higherLadderOptions(MASTERY_LEVEL_ORDER, current, MASTERY_COLORS)
}

/** Shifts a mastery level by `amount` tiers, clamped to the ladder's ends — used for a
 * bloodline's starting-mastery bump. */
export function bumpMasteryLevel(current: string, amount: number): string {
  if (amount === 0) return current
  const idx = MASTERY_LEVEL_ORDER.indexOf(current)
  const newIdx = Math.min(MASTERY_LEVEL_ORDER.length - 1, Math.max(0, (idx === -1 ? 0 : idx) + amount))
  return MASTERY_LEVEL_ORDER[newIdx]
}

// ---------------------------------------------------------------------------
// devil fruits
// ---------------------------------------------------------------------------

export const DEVIL_FRUIT_TYPES: WheelOption[] = [
  opt('Paramecia', 50, '#7c3aed'),
  opt('Zoan', 25, '#15803d'),
  opt('Logia', 15, '#f59e0b'),
  opt('Ancient Zoan', 7, '#b45309'),
  opt('Mythical Zoan', 3, '#dc2626'),
]

const PARAMECIA_PALETTE = ['#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd']
const LOGIA_PALETTE = ['#c2410c', '#ea580c', '#f59e0b', '#fbbf24', '#fcd34d']
const ZOAN_PALETTE = ['#15803d', '#16a34a', '#22c55e', '#4ade80']
const ANCIENT_ZOAN_PALETTE = ['#92400e', '#b45309', '#d97706']
const MYTHICAL_ZOAN_PALETTE = ['#991b1b', '#dc2626', '#ef4444']

function fruitList(names: [string, number][], palette: string[]): WheelOption[] {
  return names.map(([name, weight], i) => opt(name, weight, palette[i % palette.length]))
}

export const PARAMECIA_FRUITS = fruitList(
  [
    ['Gomu Gomu no Mi', 1],
    ['Bara Bara no Mi', 3],
    ['Sube Sube no Mi', 3],
    ['Kilo Kilo no Mi', 3],
    ['Bomu Bomu no Mi', 3],
    ['Toge Toge no Mi', 3],
    ['Ori Ori no Mi', 3],
    ['Doru Doru no Mi', 3],
    ['Baku Baku no Mi', 3],
    ['Mane Mane no Mi', 2],
    ['Hana Hana no Mi', 2],
    ['Suke Suke no Mi', 2],
    ['Horo Horo no Mi', 2],
    ['Yomi Yomi no Mi', 2],
    ['Nikyu Nikyu no Mi', 1],
    ['Ito Ito no Mi', 2],
    ['Mero Mero no Mi', 2],
    ['Doku Doku no Mi', 2],
    ['Bane Bane no Mi', 2],
    ['Noro Noro no Mi', 2],
    ['Ope Ope no Mi', 1],
    ['Gura Gura no Mi', 1],
    ['Nui Nui no Mi', 2],
  ],
  PARAMECIA_PALETTE,
)

export const LOGIA_FRUITS = fruitList(
  [
    ['Mera Mera no Mi', 2],
    ['Hie Hie no Mi', 2],
    ['Suna Suna no Mi', 2],
    ['Goro Goro no Mi', 1],
    ['Pika Pika no Mi', 1],
    ['Yami Yami no Mi', 1],
    ['Moku Moku no Mi', 2],
    ['Gasu Gasu no Mi', 2],
    ['Numa Numa no Mi', 2],
    ['Magu Magu no Mi', 1],
  ],
  LOGIA_PALETTE,
)

export const ZOAN_FRUITS = fruitList(
  [
    ['Hito Hito no Mi (Human)', 2],
    ['Tori Tori no Mi (Falcon)', 2],
    ['Inu Inu no Mi (Dog)', 3],
    ['Neko Neko no Mi (Leopard)', 2],
    ['Ushi Ushi no Mi (Ox)', 2],
    ['Uma Uma no Mi (Horse)', 2],
    ['Zou Zou no Mi (Elephant)', 2],
    ['Mogu Mogu no Mi (Mole)', 2],
  ],
  ZOAN_PALETTE,
)

export const ANCIENT_ZOAN_FRUITS = fruitList(
  [
    ['Ryu Ryu no Mi (Spinosaurus)', 1],
    ['Ryu Ryu no Mi (Pteranodon)', 1],
    ['Ryu Ryu no Mi (Allosaurus)', 1],
    ['Ryu Ryu no Mi (Brachiosaurus)', 1],
    ['Zou Zou no Mi (Mammoth)', 1],
  ],
  ANCIENT_ZOAN_PALETTE,
)

export const MYTHICAL_ZOAN_FRUITS = fruitList(
  [
    ['Hito Hito no Mi (Nika)', 1],
    ['Tori Tori no Mi (Phoenix)', 1],
    ['Uo Uo no Mi (Seiryu)', 1],
    ['Hito Hito no Mi (Onyudo)', 1],
    ['Inu Inu no Mi (Okuchi no Makami)', 1],
    ['Hebi Hebi no Mi (Yamata no Orochi)', 1],
  ],
  MYTHICAL_ZOAN_PALETTE,
)

export function fruitListForType(type: string): WheelOption[] {
  switch (type) {
    case 'Paramecia':
      return PARAMECIA_FRUITS
    case 'Logia':
      return LOGIA_FRUITS
    case 'Zoan':
      return ZOAN_FRUITS
    case 'Ancient Zoan':
      return ANCIENT_ZOAN_FRUITS
    case 'Mythical Zoan':
      return MYTHICAL_ZOAN_FRUITS
    default:
      return PARAMECIA_FRUITS
  }
}

export const DEVIL_FRUIT_DISPOSAL: WheelOption[] = [
  opt('Eat it', 6, '#7c3aed'),
  opt('Throw it away', 2, '#374151'),
  opt('Sell it', 3, '#0d9488'),
  opt('Feed it to a weapon', 1, '#b45309'),
]

// Mastery over a Devil Fruit's power — grows like any other stat, topping out at Awakened.
export const DEVIL_FRUIT_MASTERY_LEVELS = [
  'Untrained',
  'Basic Understanding',
  'Practical Use',
  'Skilled Control',
  'Mastered',
  'Awakened',
]

const DEVIL_FRUIT_MASTERY_COLORS = ['#4c1d95', '#5b21b6', '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa']

/** Wheel of every Devil Fruit mastery level above the player's current one. */
export function higherDevilFruitMasteryOptions(current: string): WheelOption[] {
  return higherLadderOptions(DEVIL_FRUIT_MASTERY_LEVELS, current, DEVIL_FRUIT_MASTERY_COLORS)
}

// ---------------------------------------------------------------------------
// rank ladders
// ---------------------------------------------------------------------------

export const BOUNTY_TIERS = [
  '100-99,999',
  '100,000-999,999',
  '1M-10M',
  '10M-100M',
  '100M-400M',
  '400M-999M',
  '1B-2B',
  '2B-5B',
]

export const MARINE_RANKS = [
  'Chore Boy',
  'Seaman Recruit',
  'Petty Officer',
  'Ensign',
  'Lieutenant',
  'Lt. Commander',
  'Commander',
  'Captain',
  'Commodore',
  'Rear Admiral',
  'Vice Admiral',
  'Admiral',
  'Fleet Admiral',
]

export const REVOLUTIONARY_RANKS = [
  'Sympathizer',
  'Soldier',
  'Agent',
  'Squad Leader',
  'Area Commander',
  'Chief of Staff',
  'Army Commander-in-Chief',
]

export const RANK_LADDERS: Record<Affiliation, string[]> = {
  Pirate: BOUNTY_TIERS,
  Marine: MARINE_RANKS,
  Revolutionary: REVOLUTIONARY_RANKS,
}

const BOUNTY_COLORS = ['#134e4a', '#115e59', '#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4']
const MARINE_RANK_COLORS = [
  '#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
  '#0369a1', '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe',
]
const REVOLUTIONARY_RANK_COLORS = ['#1c1917', '#292524', '#44403c', '#57534e', '#78716c', '#a8a29e', '#d6d3d1']

export const RANK_COLORS: Record<Affiliation, string[]> = {
  Pirate: BOUNTY_COLORS,
  Marine: MARINE_RANK_COLORS,
  Revolutionary: REVOLUTIONARY_RANK_COLORS,
}

export function rankLadderFor(state: CharacterState): string[] {
  return RANK_LADDERS[state.affiliation ?? 'Pirate']
}

/** Every rank on the ladder, weighted so the bottom is common and the top is vanishingly rare. */
export function fullRankOptions(state: CharacterState): WheelOption[] {
  const ladder = rankLadderFor(state)
  const colors = RANK_COLORS[state.affiliation ?? 'Pirate']
  return ladder.map((label, i) => opt(label, Math.max(1, Math.round(30 * Math.pow(0.55, i))), colors[i % colors.length]))
}

/** Every rank strictly above the player's current one, rarer the higher it goes. */
export function higherRankOptions(state: CharacterState): WheelOption[] {
  const ladder = rankLadderFor(state)
  const colors = RANK_COLORS[state.affiliation ?? 'Pirate']
  const idx = ladder.indexOf(state.rank)
  const higher = ladder.slice(idx + 1)
  if (higher.length === 0) {
    return [opt(state.rank, 1, colors[colors.length - 1], "You've already reached the top.")]
  }
  return higher.map((label, i) => opt(label, Math.max(1, Math.round(20 * Math.pow(0.55, i))), colors[(idx + 1 + i) % colors.length]))
}

/** Normalizes the player's rank position to a 0-7 scale, matching NPC minTier bands. */
export function tierIndex(state: CharacterState): number {
  const ladder = rankLadderFor(state)
  const idx = ladder.indexOf(state.rank)
  const frac = idx === -1 ? 0 : idx / Math.max(1, ladder.length - 1)
  return Math.round(frac * 7)
}

/**
 * Which of the 5 Marine strength categories (1 = weakest, 5 = strongest) the player's current
 * rank/bounty position falls into, as a hard partition of their affiliation's ladder into equal
 * fifths — e.g. only the very top bounty bracket lands in category 5, guaranteeing a maxed-out
 * bounty only ever draws the strongest Marines rather than mixing in weaker ones.
 */
export function marineTierForRank(state: CharacterState): 1 | 2 | 3 | 4 | 5 {
  const ladder = rankLadderFor(state)
  const idx = ladder.indexOf(state.rank)
  const frac = idx === -1 ? 0 : idx / Math.max(1, ladder.length - 1)
  return (Math.min(4, Math.floor(frac * 5)) + 1) as 1 | 2 | 3 | 4 | 5
}

/**
 * How much weight the "Get a new bounty"/"Get promoted" hub option should carry, given how the
 * player's raw stat-based overall strength compares to where they currently sit on the rank
 * ladder. Mapping playerOverallStrength (1-100) onto the same ladder gives an "expected" rank
 * position; being well ahead of that (stats far outpacing your current rank) makes the
 * promotion option common, while being well behind it (an over-ranked, under-powered character)
 * makes it rare — reflecting that the wheel is what's actually deciding whether the world
 * notices you're overdue, not the other way around.
 */
export function rankPressureWeight(state: CharacterState, baseWeight: number): number {
  const ladder = rankLadderFor(state)
  const maxIdx = Math.max(1, ladder.length - 1)
  const expectedIdx = Math.round((playerOverallStrength(state) / 100) * maxIdx)
  const actualIdx = ladder.indexOf(state.rank)
  const gap = expectedIdx - (actualIdx === -1 ? 0 : actualIdx)
  return Math.max(1, Math.min(15, Math.round(baseWeight + gap * 1.2)))
}

/** Road Poneglyphs are famously scarce — searching a location rarely turns one up, though a
 * higher-tier explorer with better resources fares a little better. */
export function poneglyphFindOdds(state: CharacterState): WheelOption[] {
  const t = tierIndex(state)
  const bonus = bloodlineDef(state)?.poneglyphOddsBonus ?? 0
  const yesWeight = Math.min(9, Math.max(1, 1 + Math.floor(t / 3) + bonus))
  const noWeight = Math.max(1, 10 - yesWeight)
  return [opt('Yes', yesWeight, '#16a34a'), opt('No', noWeight, '#374151')]
}

// ---------------------------------------------------------------------------
// NPC rosters (tiered by strength, gated by player rank; dead ones are filtered out)
// ---------------------------------------------------------------------------

export type NpcDef = {
  name: string
  /** 0-7 narrative encounter band, used only to gate which opponents show up at a given
   * rank/bounty — separate from the StrengthProfile, which drives the actual fight math. */
  minTier: number
  /** A full stat sheet on the same scale the player has, scored via the same
   * overallStrengthFromProfile() formula — see `profile()` below for the compact builder. */
  profile: StrengthProfile
  weight: number
  color: string
  /** 0 = wouldn't kill you, 3 = will end your story without hesitation. */
  lethality: number
}

/**
 * Compact builder for an NPC's StrengthProfile: tier *indices* into the same ladders the
 * player's stats are drawn from (0 = the ladder's lowest rung), rather than spelling out each
 * label. Keeps ~55 hand-assessed canon power levels readable side by side.
 *   p/s/d/e         — Power / Speed / Durability / Endurance tier index
 *   haki            — any of Armament / Observation / Conqueror's the character has (default None)
 *   masteryIdx      — index into Novice..Grandmaster
 *   dfMasteryIdx    — index into Untrained..Awakened; omit entirely if no Devil Fruit
 */
// No character seen, said, or reasonably inferred from the manga/anime has ever displayed
// power, speed, or endurance beyond these ceilings — the top rungs of each ladder (Moon Level
// and up for power/durability, FTL and Infinite Speed, Absolute endurance) are left reachable
// only by the player's own stat rolls, which can exceed anything canon has shown.
const NPC_POWER_DURABILITY_MAX_IDX = POWER_TIERS.length - 1 - 4
const NPC_SPEED_MAX_IDX = SPEED_TIERS.length - 1 - 2
const NPC_ENDURANCE_MAX_IDX = ENDURANCE_TIERS.length - 1 - 1

function profile(
  p: number,
  s: number,
  d: number,
  e: number,
  haki: Partial<HakiState>,
  masteryIdx: number,
  dfMasteryIdx?: number,
): StrengthProfile {
  const clampIdx = (i: number, max: number) => Math.max(0, Math.min(max, i))
  return {
    stats: {
      power: POWER_TIERS[clampIdx(p, NPC_POWER_DURABILITY_MAX_IDX)],
      speed: SPEED_TIERS[clampIdx(s, NPC_SPEED_MAX_IDX)],
      durability: DURABILITY_TIERS[clampIdx(d, NPC_POWER_DURABILITY_MAX_IDX)],
      endurance: ENDURANCE_TIERS[clampIdx(e, NPC_ENDURANCE_MAX_IDX)],
    },
    haki: {
      Armament: haki.Armament ?? 'None',
      Observation: haki.Observation ?? 'None',
      "Conqueror's": haki["Conqueror's"] ?? 'None',
    },
    fightingMastery: MASTERY_LEVEL_ORDER[clampIdx(masteryIdx, MASTERY_LEVEL_ORDER.length - 1)],
    devilFruitMastery:
      dfMasteryIdx !== undefined
        ? DEVIL_FRUIT_MASTERY_LEVELS[clampIdx(dfMasteryIdx, DEVIL_FRUIT_MASTERY_LEVELS.length - 1)]
        : undefined,
  }
}

// Marines are grouped into 5 fixed strength categories (weakest to strongest) rather than
// picked from a spin-for-difficulty wheel — marineTierForRank() above maps the player's current
// rank/bounty straight onto one of these 5 rosters, so a maxed-out bounty only ever draws from
// MARINE_TIER_5. minTier is unused for this selection (kept only because NpcDef requires it).

export const MARINE_TIER_1: NpcDef[] = [
  { name: 'Helmeppo', minTier: 0, profile: profile(0, 1, 0, 1, {}, 1), weight: 3, color: '#fca5a5', lethality: 0 },
  { name: 'Fullbody', minTier: 0, profile: profile(0, 1, 0, 1, {}, 1), weight: 3, color: '#93c5fd', lethality: 0 },
  { name: 'Jango', minTier: 0, profile: profile(0, 1, 1, 1, {}, 1), weight: 3, color: '#bef264', lethality: 0 },
  { name: 'Nezumi', minTier: 0, profile: profile(0, 1, 1, 1, {}, 1), weight: 3, color: '#fda4af', lethality: 0 },
  { name: 'T-Bone', minTier: 1, profile: profile(1, 1, 1, 2, {}, 1), weight: 2, color: '#7c2d12', lethality: 1 },
  { name: 'Doberman', minTier: 1, profile: profile(1, 1, 1, 2, {}, 2), weight: 2, color: '#78716c', lethality: 1 },
]

export const MARINE_TIER_2: NpcDef[] = [
  { name: 'Tashigi', minTier: 1, profile: profile(1, 2, 1, 2, {}, 2), weight: 3, color: '#38bdf8', lethality: 0 },
  {
    name: 'Ain',
    minTier: 1,
    profile: profile(2, 2, 2, 2, { Observation: 'Basic' }, 2),
    weight: 3,
    color: '#22d3ee',
    lethality: 0,
  },
  { name: 'Hina', minTier: 2, profile: profile(2, 3, 2, 3, {}, 2, 2), weight: 3, color: '#f472b6', lethality: 0 },
  {
    name: 'Momonga',
    minTier: 2,
    profile: profile(3, 2, 3, 3, { Armament: 'Basic' }, 3),
    weight: 2,
    color: '#a3a3a3',
    lethality: 1,
  },
  {
    name: 'Bastille',
    minTier: 2,
    profile: profile(2, 2, 3, 3, { Armament: 'Basic' }, 2),
    weight: 2,
    color: '#65a30d',
    lethality: 1,
  },
  {
    name: 'Hannyabal',
    minTier: 2,
    profile: profile(2, 2, 3, 3, {}, 2),
    weight: 2,
    color: '#d97706',
    lethality: 1,
  },
]

export const MARINE_TIER_3: NpcDef[] = [
  // Post-timeskip/Wano Coby trained under Garp, made Rear Admiral track, and — notably —
  // awakened Conqueror's Haki (one of only a handful of named characters confirmed to have it).
  {
    name: 'Coby',
    minTier: 2,
    profile: profile(2, 2, 2, 3, { Observation: 'Basic', "Conqueror's": 'Basic' }, 2),
    weight: 3,
    color: '#f9a8d4',
    lethality: 0,
  },
  {
    name: 'Smoker',
    minTier: 3,
    profile: profile(3, 4, 3, 5, { Armament: 'Basic', Observation: 'Basic' }, 3, 4),
    weight: 3,
    color: '#94a3b8',
    lethality: 1,
  },
  {
    name: 'X-Drake',
    minTier: 3,
    profile: profile(4, 3, 4, 4, { Armament: 'Basic' }, 3, 3),
    weight: 2,
    color: '#4d7c0f',
    lethality: 1,
  },
  {
    name: 'Vergo',
    minTier: 3,
    profile: profile(4, 3, 5, 4, { Armament: 'Advanced', Observation: 'Basic' }, 4),
    weight: 2,
    color: '#1f2937',
    lethality: 2,
  },
  {
    // A Vice Admiral present at Marineford with an unusual glass-and-mirror devil fruit.
    name: 'Doll',
    minTier: 4,
    profile: profile(4, 3, 4, 4, { Armament: 'Basic' }, 3, 2),
    weight: 2,
    color: '#c4b5fd',
    lethality: 1,
  },
  {
    name: 'Strawberry',
    minTier: 4,
    profile: profile(4, 3, 4, 4, { Armament: 'Basic' }, 3),
    weight: 2,
    color: '#fb7185',
    lethality: 1,
  },
]

export const MARINE_TIER_4: NpcDef[] = [
  {
    name: 'Sentomaru',
    minTier: 4,
    profile: profile(5, 3, 5, 4, { Armament: 'Basic' }, 3),
    weight: 3,
    color: '#57534e',
    lethality: 1,
  },
  {
    name: 'Tsuru',
    minTier: 4,
    profile: profile(5, 3, 4, 4, { Armament: 'Advanced', Observation: 'Basic' }, 4),
    weight: 2,
    color: '#0ea5e9',
    lethality: 1,
  },
  {
    // Impel Down's Chief Warden — poison powers feared even by top-tier pirates.
    name: 'Magellan',
    minTier: 5,
    profile: profile(6, 4, 7, 6, { Armament: 'Advanced' }, 4, 4),
    weight: 2,
    color: '#581c87',
    lethality: 2,
  },
  {
    name: 'Sengoku',
    minTier: 5,
    profile: profile(8, 5, 8, 7, { Armament: 'Advanced', Observation: 'Advanced' }, 5, 4),
    weight: 2,
    color: '#b45309',
    lethality: 1,
  },
  {
    name: 'Kong',
    minTier: 5,
    profile: profile(7, 6, 8, 7, { Armament: 'Advanced', Observation: 'Basic' }, 5),
    weight: 1,
    color: '#3f3f46',
    lethality: 2,
  },
]

export const MARINE_TIER_5: NpcDef[] = [
  {
    name: 'Garp',
    minTier: 6,
    profile: profile(9, 6, 9, 7, { Armament: 'Advanced', Observation: 'Advanced', "Conqueror's": 'Advanced' }, 5),
    weight: 4,
    color: '#78716c',
    lethality: 0,
  },
  {
    name: 'Kuzan',
    minTier: 6,
    profile: profile(8, 7, 8, 7, { Armament: 'Advanced', Observation: 'Advanced' }, 5, 5),
    weight: 3,
    color: '#2563eb',
    lethality: 1,
  },
  {
    name: 'Issho',
    minTier: 6,
    profile: profile(8, 6, 8, 7, { Armament: 'Basic', Observation: 'Advanced' }, 5, 5),
    weight: 3,
    color: '#a855f7',
    lethality: 1,
  },
  {
    // Kizaru's own namesake/gimmick is genuinely "attacks travel at the speed of light" — the
    // one canon character who fits the very top rung left open for NPCs.
    name: 'Borsalino',
    minTier: 7,
    profile: profile(8, 10, 8, 7, { Armament: 'Advanced', Observation: 'Advanced' }, 5, 5),
    weight: 2,
    color: '#facc15',
    lethality: 2,
  },
  {
    // Akainu sits at the very ceiling of what's canonically shown — alongside Kaido, Big Mom,
    // Blackbeard, and Shanks — as the single most feared/destructive individual combatants.
    name: 'Sakazuki',
    minTier: 7,
    profile: profile(9, 8, 9, 8, { Armament: 'Advanced', Observation: 'Advanced' }, 5, 5),
    weight: 2,
    color: '#991b1b',
    lethality: 3,
  },
]

export const MARINE_ROSTERS: Record<1 | 2 | 3 | 4 | 5, NpcDef[]> = {
  1: MARINE_TIER_1,
  2: MARINE_TIER_2,
  3: MARINE_TIER_3,
  4: MARINE_TIER_4,
  5: MARINE_TIER_5,
}

/** Builds wheel options straight from the Marine roster matching the player's current
 * rank/bounty tier — no separate difficulty spin, and dead Marines are excluded. */
export function marineRosterOptions(state: CharacterState): WheelOption[] {
  const pool = MARINE_ROSTERS[marineTierForRank(state)]
  const alive = pool.filter((n) => !state.deceased.has(n.name))
  const candidates = alive.length > 0 ? alive : pool
  return candidates.map((n) => opt(n.name, n.weight, n.color))
}

export const PIRATE_ROSTER: NpcDef[] = [
  { name: "Alvida's Gang", minTier: 0, profile: profile(0, 0, 0, 0, {}, 0), weight: 4, color: '#7f1d1d', lethality: 1 },
  {
    name: "Buggy's Crew",
    minTier: 0,
    profile: profile(1, 1, 1, 1, {}, 1, 1),
    weight: 4,
    color: '#dc2626',
    lethality: 1,
  },
  {
    name: 'A drunken island bandit crew',
    minTier: 0,
    profile: profile(0, 0, 0, 0, {}, 0),
    weight: 3,
    color: '#78350f',
    lethality: 1,
  },
  {
    name: "Bellamy's Crew",
    minTier: 1,
    profile: profile(2, 3, 2, 2, {}, 2, 2),
    weight: 3,
    color: '#f97316',
    lethality: 1,
  },
  {
    name: "Foxy's Crew",
    minTier: 1,
    profile: profile(1, 2, 1, 2, {}, 1, 1),
    weight: 3,
    color: '#ea580c',
    lethality: 0,
  },
  {
    name: "Krieg's Remnants",
    minTier: 2,
    profile: profile(2, 1, 3, 2, {}, 2),
    weight: 2,
    color: '#57534e',
    lethality: 2,
  },
  {
    name: 'A Baroque Works Agent',
    minTier: 2,
    profile: profile(2, 2, 2, 2, {}, 2, 2),
    weight: 2,
    color: '#334155',
    lethality: 2,
  },
  {
    name: "Hawkins' Crew",
    minTier: 3,
    profile: profile(4, 3, 3, 3, { Armament: 'Basic' }, 3, 3),
    weight: 2,
    color: '#581c87',
    lethality: 2,
  },
  {
    name: "Capone Bege's Crew",
    minTier: 3,
    profile: profile(4, 2, 5, 3, { Armament: 'Basic' }, 3, 3),
    weight: 2,
    color: '#1e293b',
    lethality: 2,
  },
  {
    name: 'Kid & Killer',
    minTier: 4,
    profile: profile(6, 4, 5, 5, { Armament: 'Advanced', "Conqueror's": 'Basic' }, 4, 4),
    weight: 2,
    color: '#dc2626',
    lethality: 2,
  },
  {
    name: "Bonney's Crew",
    minTier: 4,
    profile: profile(5, 3, 3, 4, {}, 3, 3),
    weight: 2,
    color: '#f472b6',
    lethality: 1,
  },
  {
    name: "Blackbeard's Crew",
    minTier: 5,
    profile: profile(7, 4, 6, 5, { Armament: 'Basic' }, 4, 4),
    weight: 2,
    color: '#0c0a09',
    lethality: 3,
  },
  {
    // Sweet/All-Star Commanders sit just below the true Yonko-tier ceiling below.
    name: 'A Big Mom Pirates Commander',
    minTier: 5,
    profile: profile(8, 7, 7, 6, { Armament: 'Advanced', Observation: 'Advanced', "Conqueror's": 'Basic' }, 5, 4),
    weight: 1,
    color: '#be185d',
    lethality: 3,
  },
  {
    name: 'A Beast Pirates Commander',
    minTier: 6,
    profile: profile(8, 6, 8, 6, { Armament: 'Advanced', Observation: 'Basic' }, 5, 4),
    weight: 1,
    color: '#1e3a8a',
    lethality: 3,
  },
  {
    // Big Mom sits at the ceiling of what canon has shown — alongside Kaido, Akainu,
    // Blackbeard, and Shanks.
    name: 'Charlotte Linlin',
    minTier: 7,
    profile: profile(9, 6, 9, 8, { Armament: 'Advanced', Observation: 'Advanced', "Conqueror's": 'Advanced' }, 5, 5),
    weight: 1,
    color: '#be185d',
    lethality: 3,
  },
  {
    // "The strongest creature" — tied at the very top of what canon has depicted, deliberately
    // just below the reserved player-only tiers (Moon Level and up, FTL+, Absolute endurance).
    name: 'Kaido',
    minTier: 7,
    profile: profile(9, 6, 9, 8, { Armament: 'Advanced', Observation: 'Advanced', "Conqueror's": 'Advanced' }, 5, 5),
    weight: 1,
    color: '#1e3a8a',
    lethality: 3,
  },
]

export const WORLD_EVENT_THREATS: NpcDef[] = [
  { name: 'A Sea King', minTier: 1, profile: profile(3, 2, 4, 3, {}, 0), weight: 3, color: '#0c4a6e', lethality: 2 },
  {
    name: 'A desperate rival captain',
    minTier: 2,
    profile: profile(2, 2, 2, 2, {}, 2),
    weight: 3,
    color: '#7f1d1d',
    lethality: 1,
  },
  {
    name: 'The raging storm itself',
    minTier: 2,
    profile: profile(3, 2, 4, 2, {}, 0),
    weight: 3,
    color: '#0369a1',
    lethality: 2,
  },
  {
    name: 'A rampaging Marine fleet',
    minTier: 3,
    profile: profile(4, 2, 4, 3, { Armament: 'Basic' }, 2),
    weight: 3,
    color: '#1d4ed8',
    lethality: 2,
  },
  {
    name: 'An Ancient Weapon guardian',
    minTier: 4,
    profile: profile(8, 4, 9, 6, {}, 0),
    weight: 2,
    color: '#374151',
    lethality: 3,
  },
  {
    name: 'A CP0 black-ops agent',
    minTier: 4,
    profile: profile(6, 5, 5, 5, { Armament: 'Advanced', Observation: 'Advanced' }, 4),
    weight: 2,
    color: '#1c1917',
    lethality: 3,
  },
  {
    name: 'A rival Yonko commander',
    minTier: 5,
    profile: profile(8, 6, 7, 6, { Armament: 'Advanced', Observation: 'Basic' }, 5, 4),
    weight: 2,
    color: '#7c2d12',
    lethality: 3,
  },
  {
    // Commander of the Knights of God, second in authority only to Garling himself — Garling
    // once suggested Shanks might reach Shamrock's level only after receiving a Covenant.
    // Immortal, Awakened Mythical Zoan (Cerberus) blade, Haki potent enough to be sensed as
    // abnormal by a Roger-era legend.
    name: 'Figarland Shamrock',
    minTier: 7,
    profile: profile(9, 7, 9, 8, { Armament: 'Advanced', Observation: 'Advanced', "Conqueror's": 'Advanced' }, 5, 5),
    weight: 1,
    color: '#1e1b4b',
    lethality: 3,
  },
  {
    // Overwhelmed four Straw Hats (including Jinbe) and defeated Scopper Gaban — mostly through
    // ruthless cunning rather than a clean power advantage. Immortal, master swordswoman
    // (trained by Brook), Aro Aro no Mi.
    name: 'Manmayer Gunko',
    minTier: 6,
    profile: profile(8, 6, 7, 8, { Armament: 'Advanced', Observation: 'Advanced', "Conqueror's": 'Basic' }, 5, 4),
    weight: 1,
    color: '#7c2d92',
    lethality: 3,
  },
  {
    // Explicitly the weakest Knight of God shown — easily beaten by Gaban, Rayleigh, Luffy, and
    // Loki — but still overpowered an ex-Vice Admiral and Nico Robin with ease. Immortal
    // (regenerates even from decapitation), Iba Iba no Mi (thorned vines).
    name: 'Shepherd Sommers',
    minTier: 5,
    profile: profile(6, 4, 7, 8, { Armament: 'Advanced', Observation: 'Basic', "Conqueror's": 'Basic' }, 3, 4),
    weight: 2,
    color: '#3f6212',
    lethality: 3,
  },
  {
    // Beats multiple giants with ease but was easily defeated by three Straw Hats without them
    // needing Conqueror's Haki. Immortal, Awakened Mythical Zoan (Ryu Ryu no Mi, Model: Kirin),
    // plus a unique dream-manifestation/sleep-inducing ability.
    name: 'Rimoshifu Killingham',
    minTier: 6,
    profile: profile(7, 5, 7, 8, { Armament: 'Advanced', Observation: 'Basic', "Conqueror's": 'Basic' }, 3, 5),
    weight: 1,
    color: '#78350f',
    lethality: 3,
  },
  {
    // One of the Five Elders — shown transforming into an immense Ancient/Mythical Zoan
    // "Guardian Deity" form at Egghead, threatening city-scale devastation in a single blow.
    name: 'Saint Jaygarcia Saturn',
    minTier: 6,
    profile: profile(9, 5, 8, 7, { Armament: 'Advanced', Observation: 'Advanced' }, 5, 5),
    weight: 1,
    color: '#f3f4f6',
    lethality: 3,
  },
  {
    // One of the Five Elders — canon implies all five wield comparably overwhelming,
    // Ancient/Mythical Zoan-tier power to Saturn's.
    name: 'Saint Marcus Mars',
    minTier: 6,
    profile: profile(9, 6, 8, 7, { Armament: 'Advanced', Observation: 'Advanced' }, 5, 5),
    weight: 1,
    color: '#e5e7eb',
    lethality: 3,
  },
  {
    name: 'Saint Topman Warcury',
    minTier: 6,
    profile: profile(8, 6, 8, 7, { Armament: 'Advanced', Observation: 'Basic' }, 5, 4),
    weight: 1,
    color: '#d1d5db',
    lethality: 3,
  },
  {
    name: 'Saint Ethanbaron V. Nusjuro',
    minTier: 6,
    profile: profile(8, 5, 9, 7, { Armament: 'Advanced', Observation: 'Advanced' }, 5, 4),
    weight: 1,
    color: '#9ca3af',
    lethality: 3,
  },
  {
    name: 'Saint Shepherd Ju Peng',
    minTier: 6,
    profile: profile(9, 7, 7, 6, { Armament: 'Advanced', Observation: 'Advanced' }, 5, 5),
    weight: 1,
    color: '#f9fafb',
    lethality: 3,
  },
  {
    // The mysterious figure on the Empty Throne, above even the Five Elders — deliberately kept
    // shrouded in canon, so no confirmed Devil Fruit here either.
    name: 'Imu',
    minTier: 7,
    profile: profile(9, 6, 9, 8, { Armament: 'Advanced', Observation: 'Advanced', "Conqueror's": 'Advanced' }, 5),
    weight: 1,
    color: '#18181b',
    lethality: 3,
  },
  {
    // Revealed as the true King commanding even the Five Elders — the same treatment as Imu:
    // absolute authority, no confirmed personal combat feats shown on-screen, so no Devil Fruit.
    name: 'Garling Figarland',
    minTier: 7,
    profile: profile(9, 7, 9, 8, { Armament: 'Advanced', Observation: 'Advanced', "Conqueror's": 'Advanced' }, 5),
    weight: 1,
    color: '#27272a',
    lethality: 3,
  },
]

export const RIVAL_ROSTER: NpcDef[] = [
  { name: 'Duval', minTier: 0, profile: profile(1, 1, 1, 2, {}, 1), weight: 3, color: '#b45309', lethality: 0 },
  { name: 'Mr. 9', minTier: 0, profile: profile(0, 0, 0, 1, {}, 0), weight: 2, color: '#78716c', lethality: 1 },
  { name: 'Arlong', minTier: 1, profile: profile(3, 2, 3, 3, {}, 2), weight: 3, color: '#0891b2', lethality: 2 },
  {
    name: 'Bellamy',
    minTier: 1,
    profile: profile(2, 3, 2, 2, {}, 2, 2),
    weight: 2,
    color: '#f97316',
    lethality: 1,
  },
  {
    name: 'Caesar Clown',
    minTier: 2,
    profile: profile(4, 3, 3, 3, {}, 2, 3),
    weight: 2,
    color: '#84cc16',
    lethality: 2,
  },
  {
    name: 'Capone Bege',
    minTier: 3,
    profile: profile(4, 2, 5, 3, { Armament: 'Basic' }, 3, 3),
    weight: 2,
    color: '#1e293b',
    lethality: 2,
  },
  {
    name: 'Crocodile',
    minTier: 4,
    profile: profile(7, 4, 6, 5, { Armament: 'Advanced', Observation: 'Basic' }, 4, 4),
    weight: 2,
    color: '#eab308',
    lethality: 2,
  },
  {
    name: 'Gecko Moria',
    minTier: 4,
    profile: profile(6, 3, 5, 5, { Armament: 'Basic' }, 4, 4),
    weight: 2,
    color: '#581c87',
    lethality: 2,
  },
  {
    // A former Warlord, extremely dangerous, but a notch below the true Yonko-tier ceiling.
    name: 'Donquixote Doflamingo',
    minTier: 5,
    profile: profile(8, 6, 7, 6, { Armament: 'Advanced', Observation: 'Advanced', "Conqueror's": 'Basic' }, 5, 5),
    weight: 2,
    color: '#ec4899',
    lethality: 3,
  },
  {
    // Two Devil Fruits, Yonko-tier — sits at the very ceiling alongside Kaido/Big Mom/Akainu.
    name: 'Marshall D. Teach "Blackbeard"',
    minTier: 6,
    profile: profile(9, 5, 9, 8, { Armament: 'Advanced', Observation: 'Advanced', "Conqueror's": 'Advanced' }, 5, 5),
    weight: 1,
    color: '#450a0a',
    lethality: 3,
  },
  {
    // Widely regarded as top-tier even one-armed — no Devil Fruit, so his score leans entirely
    // on stats/Haki/mastery rather than the Devil Fruit slice of the formula.
    name: 'Shanks',
    minTier: 7,
    profile: profile(9, 7, 8, 7, { Armament: 'Advanced', Observation: 'Advanced', "Conqueror's": 'Advanced' }, 5),
    weight: 1,
    color: '#dc2626',
    lethality: 2,
  },
  {
    // A dangerous, god-revered Giant antagonist encountered in Elbaf — elite tier, a notch
    // below the very top of the roster, with a Giant's raw physical stats rather than speed.
    name: 'Loki',
    minTier: 5,
    profile: profile(8, 4, 8, 6, { Armament: 'Advanced', Observation: 'Basic' }, 4, 3),
    weight: 2,
    color: '#4338ca',
    lethality: 3,
  },
]

// ---------------------------------------------------------------------------
// starting crew origin (Pirate only)
// ---------------------------------------------------------------------------

export const MAJOR_PIRATE_CREWS: WheelOption[] = [
  opt('Straw Hat Pirates', 3, '#dc2626'),
  opt('Heart Pirates', 3, '#eab308'),
  opt('Buggy Pirates', 3, '#ec4899'),
  opt('Alvida Pirates', 3, '#7f1d1d'),
  opt('Foxy Pirates', 3, '#ea580c'),
  opt('On Air Pirates', 3, '#f59e0b'),
  opt('Kid Pirates', 2, '#f97316'),
  opt('Sun Pirates', 2, '#0891b2'),
  opt('Krieg Pirates', 2, '#57534e'),
  opt('Baroque Works', 2, '#334155'),
  opt('Red Hair Pirates', 2, '#b91c1c'),
  opt('Whitebeard Pirates', 2, '#1e3a8a'),
  opt('Big Mom Pirates', 2, '#be185d'),
  opt('Beast Pirates', 2, '#1e293b'),
  opt('Blackbeard Pirates', 1, '#0c0a09'),
  opt('Roger Pirates', 1, '#facc15'),
  opt('Golden Lion Pirates', 1, '#a16207'),
  opt('Rocks Pirates', 1, '#111827'),
]

// ---------------------------------------------------------------------------
// starting crew size & strength (own-crew Pirate origin only)
// ---------------------------------------------------------------------------

/** Crew size 1-10, gently favoring a mid-sized crew over a lone wolf or a full ten-person one. */
export const CREW_SIZE_OPTIONS: WheelOption[] = [
  opt('1', 3, '#134e4a'),
  opt('2', 4, '#115e59'),
  opt('3', 5, '#0f766e'),
  opt('4', 6, '#0d9488'),
  opt('5', 6, '#14b8a6'),
  opt('6', 5, '#2dd4bf'),
  opt('7', 4, '#5eead4'),
  opt('8', 3, '#99f6e4'),
  opt('9', 2, '#ccfbf1'),
  opt('10', 2, '#f0fdfa'),
]

/** How your crew's average strength compares to your own — peaks one notch below "Equal" since
 * a captain is typically the strongest one aboard, with both extremes deliberately rare. */
export const CREW_STRENGTH_OPTIONS: WheelOption[] = [
  opt('Much weaker than you on average', 1, '#7f1d1d'),
  opt('Weaker than you on average', 5, '#b91c1c'),
  opt('Slightly weaker than you on average', 12, '#dc2626'),
  opt('Equal in strength to you on average', 7, '#a16207'),
  opt('Slightly stronger than you on average', 4, '#15803d'),
  opt('Stronger than you on average', 2, '#166534'),
  opt('Much stronger than you on average', 1, '#052e16'),
]

/** CREW_SIZE_OPTIONS, nudged toward bigger crews by a bloodline's crewSizeBias, if any. */
export function crewSizeOptionsFor(state: CharacterState): WheelOption[] {
  return biasLadderOptions(CREW_SIZE_OPTIONS, bloodlineDef(state)?.crewSizeBias ?? 0)
}

/** CREW_STRENGTH_OPTIONS, nudged toward stronger crewmates by a bloodline's crewStrengthBias,
 * if any — used both for the starting-crew roll and every later individual recruit. */
export function crewStrengthOptionsFor(state: CharacterState): WheelOption[] {
  return biasLadderOptions(CREW_STRENGTH_OPTIONS, bloodlineDef(state)?.crewStrengthBias ?? 0)
}

/** How much an NPC's own weight shrinks per tier of distance from the player's current
 * rank/bounty tier — lower means a steeper falloff (rarer to run into a badly-mismatched foe). */
const ENCOUNTER_TIER_DECAY = 0.45

/**
 * Builds wheel options from an NPC roster, continuously reweighted so the higher the player's
 * current rank/bounty tier climbs, the more the odds shift toward encountering opponents whose
 * own minTier sits close to (or above) it — every tier of distance shrinks an NPC's weight
 * further, rather than gating by a few coarse bands. Nobody is ever fully excluded (a legend
 * can still stumble on small fry, and a nobody can still run into someone way out of their
 * league), it just gets steadily rarer the further apart they are — and anyone already killed
 * off is excluded entirely.
 */
export function npcOptions(pool: NpcDef[], state: CharacterState): WheelOption[] {
  const playerTier = tierIndex(state)
  const alive = pool.filter((n) => !state.deceased.has(n.name))
  const candidates = alive.length > 0 ? alive : pool
  return candidates.map((n) => {
    const distance = Math.abs(n.minTier - playerTier)
    const decay = Math.pow(ENCOUNTER_TIER_DECAY, distance)
    const weight = Math.max(1, Math.round(n.weight * decay * 10))
    return opt(n.name, weight, n.color)
  })
}

const ALL_NPCS: NpcDef[] = [
  ...MARINE_TIER_1,
  ...MARINE_TIER_2,
  ...MARINE_TIER_3,
  ...MARINE_TIER_4,
  ...MARINE_TIER_5,
  ...PIRATE_ROSTER,
  ...WORLD_EVENT_THREATS,
  ...RIVAL_ROSTER,
]

/** Looks up a named opponent's 1-100 overall-strength rating; unknown names default to a
 * moderate mid-strength value. */
export function npcStrength(name: string): number {
  const npc = ALL_NPCS.find((n) => n.name === name)
  return npc ? overallStrengthFromProfile(npc.profile) : 30
}

/** Looks up a named opponent's lethality (0-3); unknown names default to moderate. */
export function npcLethality(name: string): number {
  return ALL_NPCS.find((n) => n.name === name)?.lethality ?? 1
}

/**
 * Weighted Yes/No odds for surviving a lost fight or a risky event, driven by the opponent's
 * strength relative to the player, how lethal/villainous they are, and situational risk.
 */
export function survivalOdds(state: CharacterState, opponentName: string, extraRisk = 0): WheelOption[] {
  const difficulty = -combatEdge(state, opponentName) // positive = they had the edge on me
  const lethality = npcLethality(opponentName)
  const dieWeight = Math.min(95, Math.max(1, Math.round(10 + difficulty * 2 + lethality * 12 + extraRisk * 8)))
  const surviveWeight = 100 - dieWeight
  return [
    opt('Yes', surviveWeight, '#16a34a'),
    opt('No', dieWeight, '#7f1d1d'),
  ]
}

/**
 * Weighted Yes/No odds for a fight, driven by the player's aggregate stat tiers vs the
 * opponent's strength band, plus any tactical bonus/penalty from a pre-fight choice.
 */
export function fightOddsOptions(
  state: CharacterState,
  opponentName: string,
  flavorYes: string,
  flavorNo: string,
): WheelOption[] {
  const edge = combatEdge(state, opponentName) + (state.pendingTacticBonus ?? 0)
  const winWeight = logisticWeight(edge, FIGHT_EDGE_SCALE)
  const loseWeight = 100 - winWeight
  return [
    opt('Yes', winWeight, '#16a34a', flavorYes),
    opt('No', loseWeight, '#dc2626', flavorNo),
  ]
}

export const TACTIC_OPTIONS: WheelOption[] = [
  opt('Frontal assault', 4, '#b91c1c'),
  opt('Ambush', 3, '#166534'),
  opt('Use your Devil Fruit', 2, '#7c3aed'),
  opt('Call for backup', 2, '#1d4ed8'),
]

// Rescaled to sit alongside the 1-100 overall-strength gap used in fightOddsOptions.
const TACTIC_BONUSES: Record<string, number> = {
  'Frontal assault': 0,
  Ambush: 6,
  'Use your Devil Fruit': 10,
  'Call for backup': 4,
}

export function tacticBonus(label: string): number {
  return TACTIC_BONUSES[label] ?? 0
}

// ---------------------------------------------------------------------------
// world event reactions (tailored per event, with a generic fallback)
// ---------------------------------------------------------------------------

export const WORLD_EVENT_REACTIONS: Record<string, WheelOption[]> = {
  'A Yonko clashes with the Marines': [
    opt('Join the Yonko', 3, '#1e3a8a'),
    opt('Join the Marines', 3, '#2563eb'),
    opt('Stay far away', 4, '#374151'),
  ],
  'A new island rises from the sea': [
    opt('Explore it immediately', 5, '#065f46'),
    opt('Let others go first', 3, '#374151'),
    opt('Claim it for your flag', 2, '#b45309'),
  ],
  'An Ancient Weapon stirs': [
    opt('Seek it out', 3, '#7f1d1d'),
    opt('Warn the World Government', 2, '#2563eb'),
    opt('Flee the region', 5, '#374151'),
  ],
  'A rival crew declares war on you': [
    opt('Meet them head-on', 5, '#b45309'),
    opt('Set a trap', 3, '#166534'),
    opt('Try to negotiate peace', 2, '#0284c7'),
  ],
  'The World Government holds a Reverie': [
    opt('Try to crash it', 2, '#7f1d1d'),
    opt('Use the distraction to your advantage', 5, '#4338ca'),
    opt('Ignore it entirely', 3, '#374151'),
  ],
  'A storm wrecks half the Grand Line': [
    opt('Help stranded sailors', 5, '#0369a1'),
    opt('Loot the wreckage', 3, '#b45309'),
    opt('Ride out the storm', 2, '#374151'),
  ],
}

export const GENERIC_EVENT_REACTIONS: WheelOption[] = [
  opt('Get involved', 4, '#1d4ed8'),
  opt('Stay out of it', 4, '#374151'),
  opt('Profit from the chaos', 2, '#b45309'),
]

// ---------------------------------------------------------------------------
// crew roles
// ---------------------------------------------------------------------------

export const CREW_ROLES: WheelOption[] = [
  opt('A swordsman', 4, '#1d4ed8'),
  opt('A doctor', 3, '#059669'),
  opt('A sniper', 3, '#b45309'),
  opt('A navigator', 3, '#0284c7'),
  opt('A shipwright', 3, '#78350f'),
  opt('A musician', 2, '#a21caf'),
  opt('A cook', 3, '#ca8a04'),
  opt('A helmsman', 2, '#0891b2'),
  opt('An archaeologist', 2, '#4338ca'),
  opt('A mechanic', 2, '#525252'),
  opt('A former Marine defector', 1, '#334155'),
  opt('A giant warrior', 1, '#ea580c'),
  opt('A Mink bodyguard', 1, '#7c3aed'),
  opt('A mysterious stranger', 1, '#111827'),
]

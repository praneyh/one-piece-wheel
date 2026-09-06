export type WheelOption = {
  label: string
  weight: number
  color: string
  image?: string
  flavorText?: string
}

export type PoneglyphLocation = 'Wano' | 'Zou' | 'TottoLand' | 'ManMarkedByFlames'

export const ALL_PONEGLYPHS: PoneglyphLocation[] = [
  'Wano',
  'Zou',
  'TottoLand',
  'ManMarkedByFlames',
]

export const PONEGLYPH_LABELS: Record<PoneglyphLocation, string> = {
  Wano: 'Wano',
  Zou: 'Zou',
  TottoLand: 'Totto Land',
  ManMarkedByFlames: 'the Man Marked by Flames',
}

export type Affiliation = 'Pirate' | 'Marine' | 'Revolutionary'

export type StatKey = 'power' | 'speed' | 'durability' | 'endurance'
export type Stats = Record<StatKey, string>

export const STAT_LABELS: Record<StatKey, string> = {
  power: 'Power',
  speed: 'Speed',
  durability: 'Durability',
  endurance: 'Endurance',
}

// Ascending power-scaling ladders — later tiers are dramatically rarer.
export const POWER_TIERS = [
  'Normal Human',
  'Peak Human',
  'Superhuman',
  'Wall Level',
  'Building Level',
  'City Block Level',
  'Town Level',
  'Island Level',
  'Country Level',
  'Continent Level',
  'Moon Level',
  'Planet Level',
  'Star Level',
  'Universal Level',
]

export const DURABILITY_TIERS = POWER_TIERS

export const SPEED_TIERS = [
  'Normal Human',
  'Peak Human',
  'Superhuman',
  'Subsonic',
  'Transonic',
  'Supersonic',
  'Hypersonic',
  'Massively Hypersonic',
  'Sub-Relativistic',
  'Relativistic',
  'Speed of Light',
  'FTL',
  'Infinite Speed',
]

export const ENDURANCE_TIERS = [
  'Below Average',
  'Normal Human',
  'Peak Human',
  'Superhuman',
  'Enhanced',
  'Extraordinary',
  'Tireless',
  'Nigh-Limitless',
  'Limitless',
  'Absolute',
]

export const STAT_TIER_LADDERS: Record<StatKey, string[]> = {
  power: POWER_TIERS,
  speed: SPEED_TIERS,
  durability: DURABILITY_TIERS,
  endurance: ENDURANCE_TIERS,
}

export function statTierIndex(key: StatKey, label: string): number {
  const idx = STAT_TIER_LADDERS[key].indexOf(label)
  return idx === -1 ? 0 : idx
}

export function bumpStatTier(key: StatKey, currentLabel: string, amount: number): string {
  const ladder = STAT_TIER_LADDERS[key]
  const idx = statTierIndex(key, currentLabel)
  const newIdx = Math.min(ladder.length - 1, Math.max(0, idx + amount))
  return ladder[newIdx]
}

export type HakiType = 'Armament' | 'Observation' | "Conqueror's"
export type HakiLevel = 'None' | 'Basic' | 'Advanced'
export type HakiState = Record<HakiType, HakiLevel>

export const HAKI_TYPES: HakiType[] = ['Armament', 'Observation', "Conqueror's"]

export type DevilFruitType = 'Paramecia' | 'Zoan' | 'Logia' | 'Ancient Zoan' | 'Mythical Zoan'

export type CrewMember = {
  name: string
  role: string
  /** How this crewmate's strength compares to yours — same wording as the starting-crew
   * strength wheel, spun individually for each new recruit. */
  strengthTier?: string
}

export type EventLogEntry = { question: string; answer: string }

export type CharacterState = {
  affiliation?: Affiliation
  race?: string
  /** For a Hybrid character: the two underlying races whose stat mods both apply. Absent for
   * a single-race character (whose mods come from looking up `race` directly). */
  raceComponents?: [string, string]
  pendingHybridRace1?: string
  stats: Stats
  haki: HakiState
  fightingStyle?: string
  fightingMastery?: string
  additionalStyles: { style: string; mastery: string }[]
  pendingNewStyle?: string
  weapon?: string
  weaponHasDevilFruit?: boolean
  rank: string
  rankHistory: string[]
  poneglyphsCollected: Set<PoneglyphLocation>
  crew: CrewMember[]
  /** Pirate-only: whose crew you started with, if any (your own, or a canon crew's name). */
  crewOrigin?: string
  /** Only set when crewOrigin is your own crew: how many crewmates you started with (1-10). */
  crewSize?: number
  /** Only set when crewOrigin is your own crew: how your crewmates' average strength compares
   * to your own, from "Much weaker than you" to "Much stronger than you". */
  crewStrengthTier?: string
  deceased: Set<string>
  defeatedOpponents: string[]
  lastOpponent?: string
  lastMet?: string
  lastWorldEvent?: string
  pendingTacticBonus?: number
  devilFruit?: string
  devilFruitType?: DevilFruitType
  devilFruitMastery?: string
  /** Set only on the rare survivor of eating a second Devil Fruit — its power stacks with the
   * first rather than replacing it. */
  secondDevilFruit?: string
  secondDevilFruitType?: DevilFruitType
  secondDevilFruitMastery?: string
  pendingDevilFruitType?: DevilFruitType
  pendingFoundFruit?: string
  /** True only while resolving the "eat a second Devil Fruit" survival wheel — distinguishes an
   * already-fruited character eating another from a first-time bite, since onSelect sets
   * devilFruit for both by the time `next` inspects the post-onSelect state. */
  pendingSecondFruit?: boolean
  pendingStatRolls: number
  pendingStatName?: StatKey
  pendingHakiName?: HakiType
  pendingGrowthPicked: string[]
  /** Node id to return to once a shared post-fight sequence (rank check / growth check) finishes. */
  pendingReturnNode?: string
  /** The triggering hub option's own wheel weight, for non-combat growth checks — lower means
   * the experience was rarer, which should raise its odds of teaching you something. */
  pendingEventRarityWeight?: number
  /** How many times the "What's next?" hub wheel has been spun — gates and grows the odds
   * of the Immortalize option appearing on that wheel. */
  hubSpinCount: number
  /** Set when the player lands on Immortalize — the run ends here, distinct from death. */
  immortalized?: boolean
  causeOfDeath?: string
  eventLog: EventLogEntry[]
}

export function createInitialState(): CharacterState {
  return {
    stats: {
      power: POWER_TIERS[0],
      speed: SPEED_TIERS[0],
      durability: DURABILITY_TIERS[0],
      endurance: ENDURANCE_TIERS[0],
    },
    haki: { Armament: 'None', Observation: 'None', "Conqueror's": 'None' },
    rank: 'Unknown',
    rankHistory: [],
    poneglyphsCollected: new Set(),
    crew: [],
    deceased: new Set(),
    defeatedOpponents: [],
    additionalStyles: [],
    pendingStatRolls: 0,
    pendingGrowthPicked: [],
    hubSpinCount: 0,
    eventLog: [],
  }
}

export type WheelOptionsSource = WheelOption[] | ((state: CharacterState) => WheelOption[])

export type WheelNode = {
  type: 'wheel'
  id: string
  category?: string
  question: string
  icon?: string
  options: WheelOptionsSource
  onSelect?: (
    state: CharacterState,
    chosenLabel: string,
    chosenOption: WheelOption,
  ) => CharacterState
  next: string | ((state: CharacterState, chosenLabel: string) => string)
}

export function resolveOptions(node: WheelNode, state: CharacterState): WheelOption[] {
  return typeof node.options === 'function' ? node.options(state) : node.options
}

export type RecapNode = {
  type: 'recap'
  id: string
  condition?: (state: CharacterState) => boolean
  title: (state: CharacterState) => string
  body: (state: CharacterState) => string
  accent: 'green' | 'pink'
  next: string | ((state: CharacterState) => string)
}

export type EndingNode = {
  type: 'ending'
  id: string
}

export type StoryNode = WheelNode | RecapNode | EndingNode

export type StoryGraph = Record<string, StoryNode>

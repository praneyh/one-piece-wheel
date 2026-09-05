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
  type HakiType,
  type StatKey,
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
  { label: 'Hybrid', weight: 4, color: '#16a34a', mods: { power: 1, speed: 1 }, blurb: 'The best of two worlds. (+1 Power tier, +1 Speed tier)' },
  { label: 'Seraphim', weight: 3, color: '#8b5cf6', mods: { power: 3, durability: 2, speed: 2 }, blurb: 'Lunarian-blooded bioweapon output. (+3 Power tiers, +2 Durability tiers, +2 Speed tiers)' },
  { label: 'Tontatta', weight: 3, color: '#14b8a6', mods: { speed: 3, power: -2 }, blurb: 'Tiny and nimble, hits far above their size. (+3 Speed tiers, -2 Power tiers)' },
  { label: 'Long-Arm', weight: 3, color: '#f97316', mods: { power: 2, speed: -1 }, blurb: 'Reach for days. (+2 Power tiers, -1 Speed tier)' },
  { label: 'Long-Leg', weight: 3, color: '#ec4899', mods: { speed: 3, durability: -1 }, blurb: 'Built to run and kick. (+3 Speed tiers, -1 Durability tier)' },
  { label: 'Snake-Neck', weight: 3, color: '#dc2626', mods: { speed: 1, durability: 1 }, blurb: 'Deceptively hard to pin down. (+1 Speed tier, +1 Durability tier)' },
  { label: 'Three-Eye', weight: 2, color: '#84cc16', mods: { endurance: 2 }, blurb: 'The third eye senses beyond the five. (+2 Endurance tiers)' },
  { label: 'Celestial Dragon', weight: 1, color: '#fef08a', mods: { power: 1, speed: 1, durability: 1, endurance: 1 }, blurb: 'World Nobles — untouchable status, modest natural gifts. (+1 tier to everything)' },
]

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

/** Applies a race's tier shift to a freshly-rolled base stat tier. */
export function applyRaceModToTier(state: CharacterState, key: StatKey, baseLabel: string): string {
  const raceDef = RACES.find((r) => r.label === state.race)
  const mod = raceDef?.mods[key] ?? 0
  return bumpStatTier(key, baseLabel, mod)
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

/** Sum of each stat's tier index — a rough aggregate combat score. */
export function playerPowerScore(state: CharacterState): number {
  const keys: StatKey[] = ['power', 'speed', 'durability', 'endurance']
  return keys.reduce((sum, k) => sum + statTierIndex(k, state.stats[k]), 0)
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
  const dfMasteryCount =
    state.devilFruit &&
    DEVIL_FRUIT_MASTERY_LEVELS.indexOf(state.devilFruitMastery ?? DEVIL_FRUIT_MASTERY_LEVELS[0]) <
      DEVIL_FRUIT_MASTERY_LEVELS.length - 1
      ? 1
      : 0
  return statCount + hakiCount + masteryCount + dfMasteryCount
}

/** Weighted Yes/No odds for post-fight growth, favoring wins against relatively stronger foes. */
export function growthOdds(state: CharacterState, opponentName: string): WheelOption[] {
  const playerTier = tierIndex(state)
  const opponentTier = npcStrength(opponentName)
  const diff = opponentTier - playerTier
  const yesWeight = Math.min(9, Math.max(1, Math.round(4 + diff * 1.2)))
  const noWeight = 10 - yesWeight
  return [opt('Yes', yesWeight, '#16a34a'), opt('No', noWeight, '#dc2626')]
}

/** Flat, opponent-agnostic growth odds for non-combat moments (a lucky find, a spreading
 * reputation) that can still teach you something, just without a foe to measure against. */
export function growthOddsGeneric(): WheelOption[] {
  return [opt('Yes', 5, '#16a34a'), opt('No', 5, '#dc2626')]
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
  const playerTier = tierIndex(state)
  const opponentTier = npcStrength(opponentName)
  const diff = opponentTier - playerTier
  const yesWeight = Math.min(9, Math.max(1, Math.round(3 + diff * 1.5)))
  const noWeight = 10 - yesWeight
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

/** Road Poneglyphs are famously scarce — searching a location rarely turns one up, though a
 * higher-tier explorer with better resources fares a little better. */
export function poneglyphFindOdds(state: CharacterState): WheelOption[] {
  const t = tierIndex(state)
  const yesWeight = Math.min(4, Math.max(1, 1 + Math.floor(t / 3)))
  const noWeight = 10 - yesWeight
  return [opt('Yes', yesWeight, '#16a34a'), opt('No', noWeight, '#374151')]
}

// ---------------------------------------------------------------------------
// NPC rosters (tiered by strength, gated by player rank; dead ones are filtered out)
// ---------------------------------------------------------------------------

export type NpcDef = {
  name: string
  minTier: number
  weight: number
  color: string
  /** 0 = wouldn't kill you, 3 = will end your story without hesitation. */
  lethality: number
}

export const MARINE_STRONG_ROSTER: NpcDef[] = [
  { name: 'Coby', minTier: 0, weight: 4, color: '#f9a8d4', lethality: 0 },
  { name: 'Helmeppo', minTier: 0, weight: 3, color: '#fca5a5', lethality: 0 },
  { name: 'Fullbody', minTier: 0, weight: 3, color: '#93c5fd', lethality: 0 },
  { name: 'Smoker', minTier: 1, weight: 4, color: '#94a3b8', lethality: 1 },
  { name: 'Tashigi', minTier: 1, weight: 3, color: '#38bdf8', lethality: 0 },
  { name: 'Hina', minTier: 2, weight: 3, color: '#f472b6', lethality: 0 },
  { name: 'X-Drake', minTier: 2, weight: 2, color: '#4d7c0f', lethality: 1 },
  { name: 'Momonga', minTier: 2, weight: 2, color: '#a3a3a3', lethality: 1 },
  { name: 'Vergo', minTier: 3, weight: 2, color: '#1f2937', lethality: 2 },
  { name: 'T-Bone', minTier: 3, weight: 2, color: '#7c2d12', lethality: 1 },
]

export const MARINE_EXTREME_ROSTER: NpcDef[] = [
  { name: 'Garp', minTier: 3, weight: 4, color: '#78716c', lethality: 0 },
  { name: 'Sentomaru', minTier: 3, weight: 3, color: '#57534e', lethality: 1 },
  { name: 'Kuzan', minTier: 4, weight: 3, color: '#2563eb', lethality: 1 },
  { name: 'Issho', minTier: 4, weight: 3, color: '#a855f7', lethality: 1 },
  { name: 'Tsuru', minTier: 4, weight: 2, color: '#0ea5e9', lethality: 1 },
  { name: 'Borsalino', minTier: 5, weight: 2, color: '#facc15', lethality: 2 },
  { name: 'Sengoku', minTier: 5, weight: 2, color: '#b45309', lethality: 1 },
  { name: 'Sakazuki', minTier: 6, weight: 2, color: '#991b1b', lethality: 3 },
  { name: 'Kong', minTier: 7, weight: 1, color: '#3f3f46', lethality: 2 },
]

export const PIRATE_ROSTER: NpcDef[] = [
  { name: "Alvida's Gang", minTier: 0, weight: 4, color: '#7f1d1d', lethality: 1 },
  { name: "Buggy's Crew", minTier: 0, weight: 4, color: '#dc2626', lethality: 1 },
  { name: 'A drunken island bandit crew', minTier: 0, weight: 3, color: '#78350f', lethality: 1 },
  { name: "Bellamy's Crew", minTier: 1, weight: 3, color: '#f97316', lethality: 1 },
  { name: "Foxy's Crew", minTier: 1, weight: 3, color: '#ea580c', lethality: 0 },
  { name: "Krieg's Remnants", minTier: 2, weight: 2, color: '#57534e', lethality: 2 },
  { name: 'A Baroque Works Agent', minTier: 2, weight: 2, color: '#334155', lethality: 2 },
  { name: "Hawkins' Crew", minTier: 3, weight: 2, color: '#581c87', lethality: 2 },
  { name: "Capone Bege's Crew", minTier: 3, weight: 2, color: '#1e293b', lethality: 2 },
  { name: 'Kid & Killer', minTier: 4, weight: 2, color: '#dc2626', lethality: 2 },
  { name: "Bonney's Crew", minTier: 4, weight: 2, color: '#f472b6', lethality: 1 },
  { name: "Blackbeard's Crew", minTier: 5, weight: 2, color: '#0c0a09', lethality: 3 },
  { name: 'A Big Mom Pirates Commander', minTier: 5, weight: 1, color: '#be185d', lethality: 3 },
  { name: 'A Beast Pirates Commander', minTier: 6, weight: 1, color: '#1e3a8a', lethality: 3 },
  { name: 'Charlotte Linlin', minTier: 7, weight: 1, color: '#be185d', lethality: 3 },
  { name: 'Kaido', minTier: 7, weight: 1, color: '#1e3a8a', lethality: 3 },
]

export const WORLD_EVENT_THREATS: NpcDef[] = [
  { name: 'A Sea King', minTier: 1, weight: 3, color: '#0c4a6e', lethality: 2 },
  { name: 'A desperate rival captain', minTier: 2, weight: 3, color: '#7f1d1d', lethality: 1 },
  { name: 'The raging storm itself', minTier: 2, weight: 3, color: '#0369a1', lethality: 2 },
  { name: 'A rampaging Marine fleet', minTier: 3, weight: 3, color: '#1d4ed8', lethality: 2 },
  { name: 'An Ancient Weapon guardian', minTier: 4, weight: 2, color: '#374151', lethality: 3 },
  { name: 'A CP0 black-ops agent', minTier: 4, weight: 2, color: '#1c1917', lethality: 3 },
  { name: 'A rival Yonko commander', minTier: 5, weight: 2, color: '#7c2d12', lethality: 3 },
]

export const RIVAL_ROSTER: NpcDef[] = [
  { name: 'Duval', minTier: 0, weight: 3, color: '#b45309', lethality: 0 },
  { name: 'Mr. 9', minTier: 0, weight: 2, color: '#78716c', lethality: 1 },
  { name: 'Arlong', minTier: 1, weight: 3, color: '#0891b2', lethality: 2 },
  { name: 'Bellamy', minTier: 1, weight: 2, color: '#f97316', lethality: 1 },
  { name: 'Caesar Clown', minTier: 2, weight: 2, color: '#84cc16', lethality: 2 },
  { name: 'Capone Bege', minTier: 3, weight: 2, color: '#1e293b', lethality: 2 },
  { name: 'Crocodile', minTier: 4, weight: 2, color: '#eab308', lethality: 2 },
  { name: 'Gecko Moria', minTier: 4, weight: 2, color: '#581c87', lethality: 2 },
  { name: 'Donquixote Doflamingo', minTier: 5, weight: 2, color: '#ec4899', lethality: 3 },
  { name: 'Marshall D. Teach "Blackbeard"', minTier: 6, weight: 1, color: '#450a0a', lethality: 3 },
  { name: 'Shanks', minTier: 7, weight: 1, color: '#dc2626', lethality: 2 },
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

/** Which "weak / medium / strong" band a tier (0-7) falls into. */
function tierBand(t: number): 'weak' | 'medium' | 'strong' {
  if (t <= 2) return 'weak'
  if (t <= 5) return 'medium'
  return 'strong'
}

function isAdjacentBand(a: 'weak' | 'medium' | 'strong', b: 'weak' | 'medium' | 'strong'): boolean {
  if (a === b) return false
  return a === 'medium' || b === 'medium'
}

/**
 * Builds wheel options from an NPC roster, biased hard toward opponents in the player's own
 * weak/medium/strong strength band (with a thinned-out chance of an adjacent band), so a
 * high-rank player mostly faces serious threats instead of leftover fodder — and excludes
 * anyone already killed off.
 */
export function npcOptions(pool: NpcDef[], state: CharacterState): WheelOption[] {
  const playerBand = tierBand(tierIndex(state))
  const alive = pool.filter((n) => !state.deceased.has(n.name))
  const sameBand = alive.filter((n) => tierBand(n.minTier) === playerBand)
  const adjacentBand = alive.filter((n) => isAdjacentBand(playerBand, tierBand(n.minTier)))

  let list: NpcDef[]
  if (sameBand.length > 0) {
    list = [...sameBand, ...adjacentBand.map((n) => ({ ...n, weight: Math.max(1, Math.round(n.weight * 0.25)) }))]
  } else if (adjacentBand.length > 0) {
    list = adjacentBand
  } else {
    list = alive.length > 0 ? alive : pool
  }
  return list.map((n) => opt(n.name, n.weight, n.color))
}

const ALL_NPCS: NpcDef[] = [
  ...MARINE_STRONG_ROSTER,
  ...MARINE_EXTREME_ROSTER,
  ...PIRATE_ROSTER,
  ...WORLD_EVENT_THREATS,
  ...RIVAL_ROSTER,
]

/** Looks up a named opponent's rough strength band (0-7); unknown names default to mid-strength. */
export function npcStrength(name: string): number {
  return ALL_NPCS.find((n) => n.name === name)?.minTier ?? 3
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
  const playerTier = tierIndex(state)
  const opponentTier = npcStrength(opponentName)
  const lethality = npcLethality(opponentName)
  const diff = opponentTier - playerTier
  const dieWeight = Math.min(9, Math.max(0, Math.round(diff * 0.8 + lethality * 1.6 + extraRisk)))
  const surviveWeight = Math.max(1, 10 - dieWeight)
  return [
    opt('Yes', surviveWeight, '#16a34a'),
    opt('No', Math.max(1, dieWeight), '#7f1d1d'),
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
  const playerScore = playerPowerScore(state)
  const opponentScore = npcStrength(opponentName) * 6
  const diff = playerScore - opponentScore + (state.pendingTacticBonus ?? 0)
  const winWeight = Math.min(9, Math.max(1, Math.round(5 + diff * 0.4)))
  const loseWeight = 10 - winWeight
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

const TACTIC_BONUSES: Record<string, number> = {
  'Frontal assault': 0,
  Ambush: 3,
  'Use your Devil Fruit': 5,
  'Call for backup': 2,
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

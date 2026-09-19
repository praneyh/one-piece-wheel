import {
  ALL_PONEGLYPHS,
  HAKI_TYPES,
  PONEGLYPH_LABELS,
  statTierIndex,
  type Affiliation,
  type CharacterState,
  type HakiLevel,
  type HakiType,
  type PoneglyphLocation,
  type StatKey,
  type StoryGraph,
  type WheelOption,
} from '../types'
import {
  CREW_ROLES,
  DEVIL_FRUIT_MASTERY_LEVELS,
  DEVIL_FRUIT_MASTERY_START_OPTIONS,
  DEVIL_FRUIT_TYPES,
  FIGHTING_STYLES,
  GENERIC_EVENT_REACTIONS,
  GROWTH_COUNT_OPTIONS,
  MAJOR_PIRATE_CREWS,
  MASTERY_LEVEL_ORDER,
  MASTERY_LEVELS,
  RACES,
  RUINS_DEVIL_FRUIT_TYPES,
  STAT_OPTIONS,
  STAT_TIER_OPTIONS,
  TACTIC_OPTIONS,
  WORLD_EVENT_REACTIONS,
  aftermathOptions,
  bloodlineCheckOdds,
  bloodlineDef,
  bloodlineOptions,
  bountyRangeFor,
  bumpMasteryLevel,
  canReforgeWeapon,
  crewSizeOptionsFor,
  crewStrengthOptionsFor,
  devilFruitDisposalOptions,
  fightOddsOptions,
  fruitListForType,
  fullRankOptions,
  growableCount,
  growableDevilFruitSlot,
  growthOdds,
  growthOddsGeneric,
  higherDevilFruitMasteryOptions,
  higherHakiOptions,
  higherMasteryOptions,
  higherRankOptions,
  higherStatOptions,
  immortalizeOption,
  marineRosterOptionsWithImmortals,
  masteryGrowable,
  meetsHakiFloor,
  npcOptions,
  opt,
  pirateRosterWithImmortals,
  poneglyphFindOdds,
  poneglyphLocationModifier,
  PONEGLYPH_SEARCH_LOCATIONS,
  raceAdjustedStatTierOptions,
  rankIncreaseOdds,
  rankLadderFor,
  rankPressureWeight,
  revolutionaryRosterOptions,
  rivalRosterWithImmortals,
  secondDevilFruitSurvivalOdds,
  stormRescueOdds,
  survivalOdds,
  tacticBonus,
  weaponReforgeOptions,
  worldEventDangerPool,
} from './gameData'
import { isAtCap, loadImmortals, removeImmortalByName } from './immortals'

export const START_NODE_ID = 'affiliation'

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function hubIdFor(state: CharacterState): string {
  return `hub${state.affiliation ?? 'Pirate'}`
}

function isAtMaxRank(state: CharacterState): boolean {
  const ladder = rankLadderFor(state)
  return ladder.indexOf(state.rank) >= ladder.length - 1
}

/** Which fighting style a landed "Fighting Style Mastery" growth pick targets — whatever
 * growthMasteryStylePick set, or the primary style by default when there was nothing to choose
 * between (a single-style character skips that picker node entirely). */
function masteryTargetStyle(state: CharacterState): string {
  return state.pendingMasteryStyle ?? state.fightingStyle ?? 'your style'
}

/** Current mastery level for a named known style — the primary style's own field, or the
 * matching entry in additionalStyles. */
function currentMasteryForStyle(state: CharacterState, styleName: string): string {
  if (styleName === state.fightingStyle) return state.fightingMastery ?? MASTERY_LEVEL_ORDER[0]
  return state.additionalStyles.find((s) => s.style === styleName)?.mastery ?? MASTERY_LEVEL_ORDER[0]
}

/** Writes a new mastery level back to whichever style it belongs to — the primary
 * `fightingMastery` field, or the matching entry inside `additionalStyles`. */
function applyMasteryForStyle(state: CharacterState, styleName: string, newLevel: string): CharacterState {
  if (styleName === state.fightingStyle) return { ...state, fightingMastery: newLevel }
  return {
    ...state,
    additionalStyles: state.additionalStyles.map((s) => (s.style === styleName ? { ...s, mastery: newLevel } : s)),
  }
}

/** Shared "continue the growth batch, or return" routing for growthStatTarget, growthHakiTarget,
 * growthMasteryTarget, and growthDevilFruitMasteryTarget. */
function growthLoopNext(state: CharacterState): string {
  if (state.pendingStatRolls > 0) return 'growthStatPick'
  return state.pendingReturnNode ?? hubIdFor(state)
}

/** Shared routing for both growthCheck and growthCheckGeneric: enter the growth batch on a
 * Yes (if anything is left to grow), otherwise return to wherever this sequence was called from. */
function growthCheckNext(state: CharacterState, label: string): string {
  return label === 'Yes' && growableCount(state) > 0 ? 'growthStatCount' : (state.pendingReturnNode ?? hubIdFor(state))
}

/** rankIncreaseCheck/rankIncreaseTarget are shared by real fights (lastOpponent set to a foe)
 * and non-combat moments (lastOpponent explicitly cleared) — route each to the growth check
 * that matches, so the follow-up question is never worded like a fight that didn't happen. */
function growthCheckIdFor(state: CharacterState): string {
  return state.lastOpponent ? 'growthCheck' : 'growthCheckGeneric'
}

/** Every path into the shared post-fight rank/growth sequence should route through this instead
 * of the literal 'rankIncreaseCheck' — skips straight to the growth check once there's nowhere
 * higher to climb, since "does your reputation grow?" is a meaningless question at max rank. */
function rankIncreaseCheckIdFor(state: CharacterState): string {
  return isAtMaxRank(state) ? growthCheckIdFor(state) : 'rankIncreaseCheck'
}

// Every world-event reaction that escalates beyond flavor text routes to its own node here,
// hand-picked per reaction rather than funneling everything into one generic encounter — a
// storm-rescue attempt shouldn't share a consequence chain with crashing a Reverie. A reaction
// with no entry here is flavor-only and returns straight to the hub (see worldEventReaction).
// 'Join the Yonko'/'Join the Marines'/'Seek it out'/'Try to crash it'/'Loot the wreckage' all
// route to the shared worldEventDanger — see WORLD_EVENT_DANGER_POOL in gameData.ts for how
// each of those gets its own curated opponent pool despite sharing that one node.
const WORLD_EVENT_REACTION_ROUTES: Record<string, string> = {
  'Join the Yonko': 'worldEventDanger',
  'Join the Marines': 'worldEventDanger',
  'Explore it immediately': 'worldEventIslandDiscovery',
  'Claim it for your flag': 'rivalEncounter',
  'Seek it out': 'worldEventDanger',
  'Meet them head-on': 'rivalEncounter',
  'Set a trap': 'worldEventRivalTrap',
  'Try to negotiate peace': 'worldEventNegotiate',
  'Try to crash it': 'worldEventDanger',
  'Use the distraction to your advantage': 'worldEventReverieHeist',
  'Help stranded sailors': 'worldEventStormRescue',
  'Loot the wreckage': 'worldEventDanger',
  'Ride out the storm': 'worldEventStormRideOut',
}

function pickMissingPoneglyph(state: CharacterState): PoneglyphLocation | undefined {
  const missing = ALL_PONEGLYPHS.filter((p) => !state.poneglyphsCollected.has(p))
  if (missing.length === 0) return undefined
  return missing[Math.floor(Math.random() * missing.length)]
}

function withPoneglyph(state: CharacterState): CharacterState {
  const found = pickMissingPoneglyph(state)
  if (!found) return state
  const next = new Set(state.poneglyphsCollected)
  next.add(found)
  return {
    ...state,
    poneglyphsCollected: next,
    eventLog: [
      ...state.eventLog,
      { question: 'Road Poneglyph acquired', answer: PONEGLYPH_LABELS[found] },
    ],
  }
}

/** Multiplies the "World Event" option's weight in place if the player's bloodline boosts it
 * (Monkey D. Family's destiny effect) — mutates the array passed in, matching how the other
 * conditional hub-option pushes above already work. */
function applyWorldEventBoost(state: CharacterState, options: WheelOption[]): void {
  const mult = bloodlineDef(state)?.worldEventWeightMultiplier
  if (!mult) return
  const idx = options.findIndex((o) => o.label === 'World Event')
  if (idx !== -1) options[idx] = { ...options[idx], weight: options[idx].weight * mult }
}

function setLastCrewmateStrength(state: CharacterState, label: string): CharacterState {
  if (state.crew.length === 0) return state
  const crew = [...state.crew]
  crew[crew.length - 1] = { ...crew[crew.length - 1], strengthTier: label }
  return { ...state, crew }
}

// Deliberate one-off exception to every other aftermath/onSelect function in this file being a
// pure state transform: killing an immortalized character has to permanently delete them from
// localStorage (not just this run's `deceased` set, which resets on restart), and this is the
// single shared choke point every kill passes through (marineAftermath and pirateFightAftermath
// both call it, and nothing else in the file sets 'You kill them'). Don't "purify" this away.
function aftermathCategory(label: string): keyof CharacterState['aftermathCounts'] {
  if (label === 'You kill them') return 'kill'
  if (label.startsWith('You capture')) return 'capture'
  return 'retreat'
}

function applyAftermath(state: CharacterState, label: string): CharacterState {
  const foe = state.lastOpponent ?? 'an opponent'
  const category = aftermathCategory(label)
  const withDefeat = {
    ...state,
    defeatedOpponents: [...state.defeatedOpponents, foe],
    aftermathCounts: { ...state.aftermathCounts, [category]: state.aftermathCounts[category] + 1 },
  }
  if (label === 'You kill them') {
    removeImmortalByName(foe)
    return { ...withDefeat, deceased: new Set(withDefeat.deceased).add(foe) }
  }
  return withDefeat
}

function lossConsequenceOptions(state: CharacterState): WheelOption[] {
  const base = [opt('You barely escape', 6, '#374151'), opt('Word spreads of your defeat', 2, '#7f1d1d')]
  // Which ally is lost isn't decided here — landing on this spins loseAllyTarget next.
  if (state.crew.length > 0) base.splice(1, 0, opt('You lose an ally', 2, '#450a0a'))
  return base
}

const HAKI_PRESET_MAP: Record<string, Partial<Record<HakiType, HakiLevel>>> = {
  Armament: { Armament: 'Basic' },
  Observation: { Observation: 'Basic' },
  "Conqueror's": { "Conqueror's": 'Basic' },
  'Armament & Observation': { Armament: 'Basic', Observation: 'Basic' },
  "Conqueror's & Observation": { "Conqueror's": 'Basic', Observation: 'Basic' },
  'All 3 Basic': { Armament: 'Basic', Observation: 'Basic', "Conqueror's": 'Basic' },
  'Advanced Armament': { Armament: 'Advanced' },
  'Advanced Observation': { Observation: 'Advanced' },
  "Advance Conqueror's & Observation": { "Conqueror's": 'Advanced', Observation: 'Advanced' },
  'All 3 Advanced': { Armament: 'Advanced', Observation: 'Advanced', "Conqueror's": 'Advanced' },
}

const HAKI_OPTIONS: WheelOption[] = [
  opt('Armament', 10, '#7f1d1d'),
  opt('Observation', 10, '#991b1b'),
  opt("Conqueror's", 4, '#b91c1c'),
  opt('Armament & Observation', 8, '#dc2626'),
  opt("Conqueror's & Observation", 4, '#ef4444'),
  opt('All 3 Basic', 3, '#f87171'),
  opt('Advanced Armament', 3, '#fca5a5'),
  opt('Advanced Observation', 3, '#fecaca'),
  opt("Advance Conqueror's & Observation", 2, '#450a0a'),
  opt('All 3 Advanced', 1, '#fde047'),
]

// ---------------------------------------------------------------------------
// story graph
// ---------------------------------------------------------------------------

export const STORY_GRAPH: StoryGraph = {
  // ---- who do you want to be ---------------------------------------------
  affiliation: {
    type: 'wheel',
    id: 'affiliation',
    category: 'One Piece',
    question: 'What do you want to be?',
    icon: '⚓',
    options: [
      opt('Pirate', 14, '#dc2626', 'Freedom on the open sea — chase your dream, make your name.'),
      opt('Marine', 5, '#2563eb', 'Uphold Absolute Justice under the World Government flag.'),
      opt('Revolutionary', 3, '#111827', 'Topple the World Government from the shadows.'),
    ],
    onSelect: (state, label) => ({ ...state, affiliation: label as Affiliation }),
    next: 'race',
  },

  race: {
    type: 'wheel',
    id: 'race',
    category: 'One Piece',
    question: 'What race are you?',
    icon: '❓',
    options: RACES.map((r) => opt(r.label, r.weight, r.color, r.blurb)),
    onSelect: (state, label) => ({ ...state, race: label }),
    next: (_state, label) => (label === 'Hybrid' ? 'raceHybrid1' : 'bloodlineCheck'),
  },

  // ---- Hybrid race: spin twice more for the two component races -----------
  raceHybrid1: {
    type: 'wheel',
    id: 'raceHybrid1',
    category: 'Hybrid',
    question: "What's your first race?",
    icon: '🧬',
    options: RACES.filter((r) => r.label !== 'Hybrid').map((r) => opt(r.label, r.weight, r.color, r.blurb)),
    onSelect: (state, label) => ({ ...state, pendingHybridRace1: label }),
    next: 'raceHybrid2',
  },

  raceHybrid2: {
    type: 'wheel',
    id: 'raceHybrid2',
    category: 'Hybrid',
    question: "What's your second race?",
    icon: '🧬',
    options: (state) =>
      RACES.filter((r) => r.label !== 'Hybrid' && r.label !== state.pendingHybridRace1).map((r) =>
        opt(r.label, r.weight, r.color, r.blurb),
      ),
    onSelect: (state, label) => ({
      ...state,
      race: `${state.pendingHybridRace1} / ${label} Hybrid`,
      raceComponents: [state.pendingHybridRace1 ?? 'Human', label],
    }),
    next: 'bloodlineCheck',
  },

  // ---- special bloodline (rare, ~7%) --------------------------------------
  bloodlineCheck: {
    type: 'wheel',
    id: 'bloodlineCheck',
    category: 'One Piece',
    question: 'Do you carry a special bloodline?',
    icon: '🩸',
    options: bloodlineCheckOdds,
    next: (_state, label) => (label === 'Yes' ? 'bloodlineType' : 'devilFruitStart'),
  },

  bloodlineType: {
    type: 'wheel',
    id: 'bloodlineType',
    category: 'One Piece',
    question: 'Which bloodline?',
    icon: '🩸',
    options: bloodlineOptions,
    onSelect: (state, label) => ({ ...state, bloodline: label }),
    next: 'devilFruitStart',
  },

  // ---- starting devil fruit (~30% base, bloodline can raise it) -----------
  devilFruitStart: {
    type: 'wheel',
    id: 'devilFruitStart',
    category: 'Devil Fruit',
    question: 'Do you already have one?',
    icon: '🍈',
    options: (state) => {
      const bonus = bloodlineDef(state)?.devilFruitChanceBonus ?? 0
      return [opt('Yes', 3 + bonus, '#7c3aed'), opt('No', 7, '#374151')]
    },
    next: (_state, label) => (label === 'Yes' ? 'devilFruitStartType' : 'fightingStyle'),
  },

  devilFruitStartType: {
    type: 'wheel',
    id: 'devilFruitStartType',
    category: 'Devil Fruit',
    question: 'What type is it?',
    icon: '🍈',
    options: DEVIL_FRUIT_TYPES,
    onSelect: (state, label) => ({ ...state, pendingDevilFruitType: label as CharacterState['pendingDevilFruitType'] }),
    next: 'devilFruitStartFruit',
  },

  devilFruitStartFruit: {
    type: 'wheel',
    id: 'devilFruitStartFruit',
    category: 'Devil Fruit',
    question: 'Which one?',
    icon: '🍈',
    options: (state) => fruitListForType(state.pendingDevilFruitType ?? 'Paramecia'),
    onSelect: (state, label) => ({
      ...state,
      devilFruit: label,
      devilFruitType: state.pendingDevilFruitType,
    }),
    next: 'devilFruitStartMastery',
  },

  devilFruitStartMastery: {
    type: 'wheel',
    id: 'devilFruitStartMastery',
    category: 'Devil Fruit',
    question: 'How well do you control it?',
    icon: '🍈',
    options: DEVIL_FRUIT_MASTERY_START_OPTIONS,
    onSelect: (state, label) => ({ ...state, devilFruitMastery: label }),
    next: 'fightingStyle',
  },

  // ---- fighting style -------------------------------------------------------
  fightingStyle: {
    type: 'wheel',
    id: 'fightingStyle',
    category: 'Training',
    question: 'What is your fighting style?',
    icon: '🥋',
    options: (state) => {
      const boost = bloodlineDef(state)?.fightingStyleBoost
      if (!boost) return FIGHTING_STYLES
      return FIGHTING_STYLES.map((o) => (o.label === boost ? { ...o, weight: o.weight * 6 } : o))
    },
    onSelect: (state, label) => ({ ...state, fightingStyle: label }),
    next: (_state, label) => (label === 'Swordsmanship' ? 'weapon' : 'fightingMastery'),
  },

  weapon: {
    type: 'wheel',
    id: 'weapon',
    category: 'Make your own sword',
    question: 'What type is it?',
    icon: '🗡️',
    options: [
      opt('Katana', 5, '#4c1d95'),
      opt('Claymore', 3, '#5b21b6'),
      opt('Cutlass', 3, '#6d28d9'),
      opt('Rapier', 3, '#7c3aed'),
      opt('Longsword', 3, '#8b5cf6'),
      opt('Saber', 3, '#a78bfa'),
      opt('Scimitar', 3, '#c4b5fd'),
      opt('Gladius', 2, '#3b0764'),
      opt('Hookswrod', 2, '#581c87'),
      opt('Spadroon', 2, '#6b21a8'),
    ],
    onSelect: (state, label) => ({ ...state, weapon: label }),
    next: 'fightingMastery',
  },

  fightingMastery: {
    type: 'wheel',
    id: 'fightingMastery',
    category: 'Training',
    question: 'What is your mastery level?',
    icon: '📈',
    options: MASTERY_LEVELS,
    onSelect: (state, label) => ({
      ...state,
      fightingMastery: bumpMasteryLevel(label, bloodlineDef(state)?.masteryStartBump ?? 0),
    }),
    next: 'statStartPower',
  },

  // ---- starting stats (each wheel's own labels are already race-adjusted, so whatever it
  // lands on IS the final tier — a race bonus is a guaranteed floor, not a roll that could
  // still land under it) --------------------------------------------------------------------
  statStartPower: {
    type: 'wheel',
    id: 'statStartPower',
    category: 'Stats',
    question: 'What is your power level?',
    icon: '💥',
    options: (state) => raceAdjustedStatTierOptions(state, 'power'),
    onSelect: (state, label) => ({ ...state, stats: { ...state.stats, power: label } }),
    next: 'statStartSpeed',
  },

  statStartSpeed: {
    type: 'wheel',
    id: 'statStartSpeed',
    category: 'Stats',
    question: 'How fast are you?',
    icon: '💨',
    options: (state) => raceAdjustedStatTierOptions(state, 'speed'),
    onSelect: (state, label) => ({ ...state, stats: { ...state.stats, speed: label } }),
    next: 'statStartDurability',
  },

  statStartDurability: {
    type: 'wheel',
    id: 'statStartDurability',
    category: 'Stats',
    question: 'How much can you take?',
    icon: '🛡️',
    options: (state) => raceAdjustedStatTierOptions(state, 'durability'),
    onSelect: (state, label) => ({ ...state, stats: { ...state.stats, durability: label } }),
    next: 'statStartEndurance',
  },

  statStartEndurance: {
    type: 'wheel',
    id: 'statStartEndurance',
    category: 'Stats',
    question: 'How long can you keep going?',
    icon: '🔋',
    options: (state) => raceAdjustedStatTierOptions(state, 'endurance'),
    onSelect: (state, label) => ({ ...state, stats: { ...state.stats, endurance: label } }),
    // A bloodline that guarantees a Haki floor (e.g. Kozuki's Armament) skips straight to the
    // type wheel — "no Haki at all" would contradict a guaranteed minimum.
    next: (state) => (bloodlineDef(state)?.hakiFloor ? 'haki' : 'hakiStartCheck'),
  },

  // ---- haki -----------------------------------------------------------------
  hakiStartCheck: {
    type: 'wheel',
    id: 'hakiStartCheck',
    category: 'Haki',
    question: 'Do you start with Haki?',
    icon: '🥊',
    options: [opt('Yes', 35, '#7f1d1d'), opt('No', 65, '#374151')],
    next: (_state, label) => (label === 'Yes' ? 'haki' : 'initialRank'),
  },

  haki: {
    type: 'wheel',
    id: 'haki',
    category: 'Haki',
    question: 'What types do you have?',
    icon: '🥊',
    options: (state) => {
      const floor = bloodlineDef(state)?.hakiFloor
      if (!floor) return HAKI_OPTIONS
      const eligible = HAKI_OPTIONS.filter((o) => meetsHakiFloor(HAKI_PRESET_MAP[o.label] ?? {}, floor))
      return eligible.length > 0 ? eligible : HAKI_OPTIONS
    },
    onSelect: (state, label) => ({ ...state, haki: { ...state.haki, ...HAKI_PRESET_MAP[label] } }),
    next: 'initialRank',
  },

  // ---- starting rank ----------------------------------------------------
  initialRank: {
    type: 'wheel',
    id: 'initialRank',
    category: 'Rank',
    question: 'Where do you start?',
    icon: '🏴‍☠️',
    options: fullRankOptions,
    onSelect: (state, label) => ({
      ...state,
      rank: label,
      rankHistory: [label],
      ...(state.affiliation === 'Pirate' ? { pendingBountyReturnNode: 'crewOriginCheck' } : {}),
    }),
    next: (state) => (state.affiliation === 'Pirate' ? 'bountyRoll' : hubIdFor(state)),
  },

  // ---- starting crew origin (Pirate only) --------------------------------
  crewOriginCheck: {
    type: 'wheel',
    id: 'crewOriginCheck',
    category: 'Crew',
    question: 'Do you start with a crew?',
    icon: '🏴‍☠️',
    options: [opt('Yes', 6, '#16a34a'), opt('No', 4, '#374151')],
    next: (state, label) => (label === 'Yes' ? 'crewOriginType' : hubIdFor(state)),
  },

  crewOriginType: {
    type: 'wheel',
    id: 'crewOriginType',
    category: 'Crew',
    question: 'Is it your own crew, or an existing one?',
    icon: '🏴‍☠️',
    options: [opt('Your own crew', 6, '#dc2626'), opt("An existing pirate's crew", 4, '#7f1d1d')],
    onSelect: (state, label) => (label === 'Your own crew' ? { ...state, crewOrigin: 'Their own crew (Captain)' } : state),
    next: (_state, label) => (label === "An existing pirate's crew" ? 'crewOriginExisting' : 'crewOriginOwnSize'),
  },

  crewOriginExisting: {
    type: 'wheel',
    id: 'crewOriginExisting',
    category: 'Crew',
    question: 'Which crew are you part of?',
    icon: '🏴‍☠️',
    options: MAJOR_PIRATE_CREWS,
    onSelect: (state, label) => ({ ...state, crewOrigin: label }),
    next: hubIdFor,
  },

  // ---- your own crew: how many, and how do they compare to you ------------
  crewOriginOwnSize: {
    type: 'wheel',
    id: 'crewOriginOwnSize',
    category: 'Crew',
    question: 'How many crewmates do you start with?',
    icon: '🧑‍🤝‍🧑',
    options: crewSizeOptionsFor,
    onSelect: (state, label) => ({ ...state, crewSize: Number(label) }),
    next: 'crewOriginOwnStrength',
  },

  crewOriginOwnStrength: {
    type: 'wheel',
    id: 'crewOriginOwnStrength',
    category: 'Crew',
    question: 'How do they compare to you?',
    icon: '💪',
    options: crewStrengthOptionsFor,
    onSelect: (state, label) => ({ ...state, crewStrengthTier: label }),
    next: hubIdFor,
  },

  // ---- hubs (one per affiliation) ----------------------------------------
  // Weights are tuned so World Event is rare and dramatic against the everyday flow of
  // fights, crew-building, and training; the rank-up option disappears once maxed.
  hubPirate: {
    type: 'wheel',
    id: 'hubPirate',
    category: 'Pirate',
    question: "What's next?",
    icon: '🧭',
    options: (state) => {
      const options = [
        opt('World Event', 3, '#374151'),
        opt('You meet other pirates on the seas', 9, '#dc2626'),
        opt('You gain more crewmates', 5, '#7f1d1d'),
        opt('Search for a Road Poneglyph', 6, '#be185d'),
        opt('Marines come after you', 9, '#2563eb'),
        opt('Train', 4, '#f59e0b'),
        opt('Learn a new fighting style', 3, '#0ea5e9'),
        opt('Find a Devil Fruit', 2, '#7c3aed'),
        opt('You discover ancient ruins', 3, '#78350f'),
        opt('A rival marks you for death', 3, '#450a0a'),
        opt('Revolutionaries confront you', 3, '#166534'),
        opt('A legendary master offers to train you', 2, '#facc15'),
        opt('Word of your exploits spreads', 3, '#0d9488'),
      ]
      applyWorldEventBoost(state, options)
      if (canReforgeWeapon(state)) options.push(opt('A blacksmith offers to reforge your weapon', 2, '#6b21a8'))
      if (!isAtMaxRank(state)) {
        options.push(opt('Get a new bounty', rankPressureWeight(state, 3), '#0d9488'))
      }
      const immortalize = immortalizeOption(state.hubSpinCount)
      if (immortalize) options.push(immortalize)
      return options
    },
    onSelect: (state, label) => ({
      ...state,
      hubSpinCount: state.hubSpinCount + 1,
      ...(label === 'Immortalize' ? { immortalized: true } : {}),
      ...(label === 'Train' || label === 'A legendary master offers to train you'
        ? { pendingReturnNode: undefined }
        : {}),
    }),
    next: (state, label) => {
      if (label === 'Immortalize') return isAtCap() ? 'immortalizeGauntletOpponent' : 'immortalizeNamePrompt'
      // How you train is flavor only: either route lands on the same real growth roll.
      if (label === 'Train') return 'growthStronger'
      // A legendary master's teaching always pays off — no separate flavor step needed.
      if (label === 'A legendary master offers to train you') {
        return growableCount(state) > 0 ? 'growthStatCount' : hubIdFor(state)
      }
      const routes: Record<string, string> = {
        'World Event': 'worldEvent',
        'You meet other pirates on the seas': 'meetPirates',
        'You gain more crewmates': 'gainCrewmates',
        'Search for a Road Poneglyph': 'poneglyphMethod',
        'Marines come after you': 'marineEncounter',
        'Learn a new fighting style': 'fightingStyleLearn',
        'Find a Devil Fruit': 'devilFruitEncounter',
        'You discover ancient ruins': 'ruinsExploration',
        'A rival marks you for death': 'rivalEncounter',
        'Revolutionaries confront you': 'revolutionaryEncounter',
        'A blacksmith offers to reforge your weapon': 'weaponReforge',
        'Word of your exploits spreads': 'reputationSpread',
        'Get a new bounty': 'rankJump',
      }
      return routes[label] ?? 'hubPirate'
    },
  },

  hubMarine: {
    type: 'wheel',
    id: 'hubMarine',
    category: 'Marine',
    question: "What's next?",
    icon: '🧭',
    options: (state) => {
      const options = [
        opt('World Event', 3, '#374151'),
        opt('Pirates attack you', 8, '#dc2626'),
        opt('Hunt down a pirate crew', 6, '#7f1d1d'),
        opt('Recruit new subordinates', 5, '#1d4ed8'),
        opt('Investigate a Road Poneglyph lead', 4, '#be185d'),
        opt('Train', 4, '#f59e0b'),
        opt('Learn a new fighting style', 3, '#0ea5e9'),
        opt('Find a Devil Fruit', 2, '#7c3aed'),
        opt('You discover ancient ruins', 3, '#78350f'),
        opt('An old enemy resurfaces', 3, '#450a0a'),
        opt('Revolutionaries confront you', 3, '#166534'),
        opt('A legendary master offers to train you', 2, '#facc15'),
        opt('Your service is recognized', 3, '#0d9488'),
      ]
      applyWorldEventBoost(state, options)
      if (canReforgeWeapon(state)) options.push(opt('A blacksmith offers to reforge your weapon', 2, '#6b21a8'))
      if (!isAtMaxRank(state)) {
        options.push(opt('Get promoted', rankPressureWeight(state, 4), '#0d9488'))
      }
      const immortalize = immortalizeOption(state.hubSpinCount)
      if (immortalize) options.push(immortalize)
      return options
    },
    onSelect: (state, label) => ({
      ...state,
      hubSpinCount: state.hubSpinCount + 1,
      ...(label === 'Immortalize' ? { immortalized: true } : {}),
      ...(label === 'Train' || label === 'A legendary master offers to train you'
        ? { pendingReturnNode: undefined }
        : {}),
    }),
    next: (state, label) => {
      if (label === 'Immortalize') return isAtCap() ? 'immortalizeGauntletOpponent' : 'immortalizeNamePrompt'
      // How you train is flavor only: either route lands on the same real growth roll.
      if (label === 'Train') return 'growthStronger'
      // A legendary master's teaching always pays off — no separate flavor step needed.
      if (label === 'A legendary master offers to train you') {
        return growableCount(state) > 0 ? 'growthStatCount' : hubIdFor(state)
      }
      const routes: Record<string, string> = {
        'World Event': 'worldEvent',
        'Pirates attack you': 'pirateFightRoster',
        'Hunt down a pirate crew': 'pirateFightRoster',
        'Recruit new subordinates': 'gainCrewmates',
        'Investigate a Road Poneglyph lead': 'poneglyphMethod',
        'Learn a new fighting style': 'fightingStyleLearn',
        'Find a Devil Fruit': 'devilFruitEncounter',
        'You discover ancient ruins': 'ruinsExploration',
        'An old enemy resurfaces': 'rivalEncounter',
        'Revolutionaries confront you': 'revolutionaryEncounter',
        'A blacksmith offers to reforge your weapon': 'weaponReforge',
        'Your service is recognized': 'reputationSpread',
        'Get promoted': 'rankJump',
      }
      return routes[label] ?? 'hubMarine'
    },
  },

  hubRevolutionary: {
    type: 'wheel',
    id: 'hubRevolutionary',
    category: 'Revolutionary',
    question: "What's next?",
    icon: '🧭',
    options: (state) => {
      const options = [
        opt('World Event', 3, '#374151'),
        opt('Liberate an island', 5, '#166534'),
        opt('Clash with the Marines', 8, '#2563eb'),
        opt('Recruit revolutionaries', 5, '#1d4ed8'),
        opt('Search for a Road Poneglyph', 5, '#be185d'),
        opt('Train', 4, '#f59e0b'),
        opt('Learn a new fighting style', 3, '#0ea5e9'),
        opt('Find a Devil Fruit', 2, '#7c3aed'),
        opt('You discover ancient ruins', 3, '#78350f'),
        opt('A legendary master offers to train you', 2, '#facc15'),
        opt('Your cause gains sympathizers', 3, '#0d9488'),
      ]
      applyWorldEventBoost(state, options)
      if (canReforgeWeapon(state)) options.push(opt('A blacksmith offers to reforge your weapon', 2, '#6b21a8'))
      if (!isAtMaxRank(state)) {
        options.push(opt('Get promoted', rankPressureWeight(state, 4), '#0d9488'))
      }
      // Only possible once you've actually recruited someone — see traitorEncounter, whose
      // wheel is drawn from state.crew itself rather than the generic rival roster.
      if (state.crew.length > 0) {
        options.push(opt('A traitor from within challenges you', 3, '#450a0a'))
      }
      const immortalize = immortalizeOption(state.hubSpinCount)
      if (immortalize) options.push(immortalize)
      return options
    },
    onSelect: (state, label) => ({
      ...state,
      hubSpinCount: state.hubSpinCount + 1,
      ...(label === 'Immortalize' ? { immortalized: true } : {}),
      ...(label === 'Train' || label === 'A legendary master offers to train you'
        ? { pendingReturnNode: undefined }
        : {}),
    }),
    next: (state, label) => {
      if (label === 'Immortalize') return isAtCap() ? 'immortalizeGauntletOpponent' : 'immortalizeNamePrompt'
      // How you train is flavor only: either route lands on the same real growth roll.
      if (label === 'Train') return 'growthStronger'
      // A legendary master's teaching always pays off — no separate flavor step needed.
      if (label === 'A legendary master offers to train you') {
        return growableCount(state) > 0 ? 'growthStatCount' : hubIdFor(state)
      }
      const routes: Record<string, string> = {
        'World Event': 'worldEvent',
        'Liberate an island': 'liberateIsland',
        'Clash with the Marines': 'marineEncounter',
        'Recruit revolutionaries': 'gainCrewmates',
        'Search for a Road Poneglyph': 'poneglyphMethod',
        'Learn a new fighting style': 'fightingStyleLearn',
        'Find a Devil Fruit': 'devilFruitEncounter',
        'You discover ancient ruins': 'ruinsExploration',
        'A traitor from within challenges you': 'traitorEncounter',
        'A blacksmith offers to reforge your weapon': 'weaponReforge',
        'Your cause gains sympathizers': 'reputationSpread',
        'Get promoted': 'rankJump',
      }
      return routes[label] ?? 'hubRevolutionary'
    },
  },

  // ---- immortalize: name prompt, and the "hall is full" gauntlet fight --------
  // A character who chooses Immortalize either names themselves directly (immortalizeNamePrompt,
  // the app's one free-text screen — see NameInputNode/submitImmortalName) or, once the local
  // 25-character cap is reached, first has to beat an existing immortalized legend for their
  // spot. That gauntlet fight is deliberately all-or-nothing (no survivalOdds roll, unlike every
  // other fight in the game): losing is simply fatal, winning permanently replaces the defeated
  // legend (see submitImmortalName's use of pendingImmortalReplaceName).
  immortalizeNamePrompt: {
    type: 'nameInput',
    id: 'immortalizeNamePrompt',
    question: 'Name the legend you leave behind.',
    maxLength: 24,
    next: 'ending',
  },

  immortalizeGauntletOpponent: {
    type: 'wheel',
    id: 'immortalizeGauntletOpponent',
    category: 'Immortalized',
    question: 'The hall of legends is full. Who do you have to overcome?',
    icon: '🗿',
    options: () => loadImmortals().map((r) => opt(r.name, 1, r.color)),
    onSelect: (state, label) => ({ ...state, lastOpponent: label }),
    next: 'immortalizeGauntletTactic',
  },

  immortalizeGauntletTactic: {
    type: 'wheel',
    id: 'immortalizeGauntletTactic',
    category: 'Immortalized',
    question: 'How do you approach the fight?',
    icon: '🗡️',
    options: (state) =>
      TACTIC_OPTIONS.filter(
        (o) =>
          (o.label !== 'Use your Devil Fruit' || Boolean(state.devilFruit)) &&
          (o.label !== 'Call for backup' || state.crew.length > 0),
      ),
    onSelect: (state, label) => ({ ...state, pendingTacticBonus: tacticBonus(label) }),
    next: 'immortalizeGauntletOutcome',
  },

  immortalizeGauntletOutcome: {
    type: 'wheel',
    id: 'immortalizeGauntletOutcome',
    category: 'Immortalized',
    question: 'Do you overcome them?',
    icon: '⚔️',
    options: (state) =>
      fightOddsOptions(
        state,
        state.lastOpponent ?? '',
        'You strike down the legend and claim their place among the immortals.',
        'They prove why they earned their legend — and it costs you everything.',
      ),
    onSelect: (state, label) =>
      label === 'Yes'
        ? { ...state, pendingImmortalReplaceName: state.lastOpponent }
        : { ...state, causeOfDeath: `${state.lastOpponent ?? 'They'} prove why they earned their legend.` },
    next: (state, label) => (label === 'Yes' ? 'immortalizeNamePrompt' : hubIdFor(state)),
  },

  // ---- world event -----------------------------------------------------
  worldEvent: {
    type: 'wheel',
    id: 'worldEvent',
    category: 'World Event',
    question: 'What happens?',
    icon: '🌍',
    options: [
      opt('A Yonko clashes with the Marines', 3, '#1e3a8a'),
      opt('A new island rises from the sea', 3, '#065f46'),
      opt('An Ancient Weapon stirs', 2, '#7f1d1d'),
      opt('A rival crew declares war on you', 3, '#b45309'),
      opt('The World Government holds a Reverie', 2, '#4338ca'),
      opt('A storm wrecks half the Grand Line', 3, '#0369a1'),
    ],
    onSelect: (state, label) => ({ ...state, lastWorldEvent: label }),
    next: 'worldEventReaction',
  },

  worldEventReaction: {
    type: 'wheel',
    id: 'worldEventReaction',
    question: 'What do you do?',
    icon: '🌍',
    options: (state) => WORLD_EVENT_REACTIONS[state.lastWorldEvent ?? ''] ?? GENERIC_EVENT_REACTIONS,
    onSelect: (state, label) => ({ ...state, lastWorldEventReaction: label }),
    next: (state, label) => WORLD_EVENT_REACTION_ROUTES[label] ?? hubIdFor(state),
  },

  // The handful of reactions that escalate into a full "epic confrontation" — a real threat,
  // a tactical choice, a win/lose roll, and (on a win) a big one-off reward, or (on a loss) a
  // real chance the story ends here. Which opponent pool shows up is picked by
  // worldEventDangerPool(lastWorldEventReaction) in gameData.ts — a Yonko clash, an Ancient
  // Weapon, a crashed Reverie, and looted wreckage each get their own curated pool rather than
  // all sharing the full WORLD_EVENT_THREATS roster.
  worldEventDanger: {
    type: 'wheel',
    id: 'worldEventDanger',
    category: 'World Event',
    question: 'What do you face?',
    icon: '⚡',
    options: (state) => npcOptions(worldEventDangerPool(state.lastWorldEventReaction ?? ''), state),
    onSelect: (state, label) => ({ ...state, lastOpponent: label }),
    next: 'worldEventTactic',
  },

  worldEventTactic: {
    type: 'wheel',
    id: 'worldEventTactic',
    category: 'World Event',
    question: 'How do you handle it?',
    icon: '🗡️',
    options: (state) =>
      TACTIC_OPTIONS.filter(
        (o) =>
          (o.label !== 'Use your Devil Fruit' || Boolean(state.devilFruit)) &&
          (o.label !== 'Call for backup' || state.crew.length > 0),
      ),
    onSelect: (state, label) => ({ ...state, pendingTacticBonus: tacticBonus(label) }),
    next: 'worldEventOutcome',
  },

  worldEventOutcome: {
    type: 'wheel',
    id: 'worldEventOutcome',
    question: 'Do you come out on top?',
    icon: '⚔️',
    options: (state) =>
      fightOddsOptions(
        state,
        state.lastOpponent ?? '',
        'You come out on top of a defining moment.',
        'It overwhelms you.',
      ),
    next: (_state, label) => (label === 'Yes' ? 'worldEventReward' : 'worldEventDeathRoll'),
  },

  worldEventReward: {
    type: 'wheel',
    id: 'worldEventReward',
    question: 'What do you walk away with?',
    icon: '🏆',
    options: (state) => {
      const options = [
        opt('A huge reputation spike', 4, '#0d9488'),
        opt('A Road Poneglyph lead pays off', 2, '#be185d'),
        opt('A powerful new ally', 2, '#1d4ed8'),
        opt('Nothing but glory', 3, '#78350f'),
      ]
      if (!state.devilFruit) options.splice(1, 0, opt('A Devil Fruit', 2, '#7c3aed'))
      return options
    },
    onSelect: (state, label) => ({
      ...(label === 'A Road Poneglyph lead pays off' ? withPoneglyph(state) : state),
      defeatedOpponents: [...state.defeatedOpponents, state.lastOpponent ?? 'the threat'],
      pendingReturnNode: hubIdFor(state),
    }),
    next: (state, label) =>
      label === 'A Devil Fruit' && !state.devilFruit ? 'devilFruitFoundType' : rankIncreaseCheckIdFor(state),
  },

  worldEventDeathRoll: {
    type: 'wheel',
    id: 'worldEventDeathRoll',
    question: 'Do you survive?',
    icon: '💀',
    options: (state) => survivalOdds(state, state.lastOpponent ?? '', 2),
    onSelect: (state, label) =>
      label === 'No'
        ? { ...state, causeOfDeath: `${state.lastOpponent ?? 'The moment'} proved fatal. Your story ends here.` }
        : state,
    next: (state, label) => (label === 'Yes' ? 'worldEventLossConsequence' : hubIdFor(state)),
  },

  worldEventLossConsequence: {
    type: 'wheel',
    id: 'worldEventLossConsequence',
    question: "What's the cost?",
    icon: '💥',
    options: lossConsequenceOptions,
    onSelect: (state) => ({ ...state, pendingReturnNode: hubIdFor(state) }),
    next: (_state, label) => (label === 'You lose an ally' ? 'loseAllyTarget' : 'growthCheck'),
  },

  // ---- new island: exploring it directly, rather than fighting a claim-jumper -------------
  worldEventIslandDiscovery: {
    type: 'wheel',
    id: 'worldEventIslandDiscovery',
    category: 'World Event',
    question: 'What do you find on the new island?',
    icon: '🏝️',
    options: (state) => {
      const options = [
        opt('A Road Poneglyph lead', 3, '#be185d'),
        opt('Untold treasure', 3, '#78350f'),
        opt('The island is already claimed — by something hostile', 3, '#7f1d1d'),
      ]
      if (!state.devilFruit) options.splice(1, 0, opt('A Devil Fruit', 2, '#7c3aed'))
      return options
    },
    onSelect: (state, label) => ({
      ...(label === 'A Road Poneglyph lead' ? withPoneglyph(state) : state),
      // Nothing here was a fight — clear any lastOpponent left over from earlier in the run, so
      // the growth check downstream reads as "did you grow from this experience?" rather than
      // stale-referencing whoever you last actually fought.
      lastOpponent: undefined,
      pendingReturnNode: hubIdFor(state),
      pendingEventRarityWeight: 3,
    }),
    next: (state, label) => {
      if (label === 'A Devil Fruit' && !state.devilFruit) return 'devilFruitFoundType'
      if (label === 'The island is already claimed — by something hostile') return 'worldEventIslandDanger'
      return rankIncreaseCheckIdFor(state)
    },
  },

  worldEventIslandDanger: {
    type: 'wheel',
    id: 'worldEventIslandDanger',
    question: 'Do you make it off the island safely?',
    icon: '🏝️',
    options: (state) => survivalOdds(state, "the island's guardians", 1),
    onSelect: (state, label) => ({
      ...state,
      lastOpponent: undefined,
      pendingReturnNode: hubIdFor(state),
      ...(label === 'No' ? { causeOfDeath: "Whatever claimed that island made sure you'd never leave it." } : {}),
    }),
    next: (state, label) => (label === 'Yes' ? rankIncreaseCheckIdFor(state) : hubIdFor(state)),
  },

  // ---- rival crew war: the two reactions that don't just reuse rivalEncounter outright -------
  worldEventRivalTrap: {
    type: 'wheel',
    id: 'worldEventRivalTrap',
    category: 'Rival',
    question: 'Who takes the bait?',
    icon: '🪤',
    // Setting the trap already *is* the tactic — this skips straight to marineOutcome (the same
    // shared outcome/aftermath chain rivalEncounter itself uses via marineTactic) with an Ambush
    // bonus baked in, rather than asking "how do you handle it?" a second time.
    options: (state) => npcOptions(rivalRosterWithImmortals(), state),
    onSelect: (state, label) => ({ ...state, lastOpponent: label, pendingTacticBonus: tacticBonus('Ambush') }),
    next: 'marineOutcome',
  },

  worldEventNegotiate: {
    type: 'wheel',
    id: 'worldEventNegotiate',
    category: 'Rival',
    question: 'Does the negotiation hold?',
    icon: '🕊️',
    options: [
      opt('Yes', 4, '#16a34a', 'A tense truce, but a truce.'),
      opt('No', 6, '#dc2626', 'They were never going to talk.'),
    ],
    // A failed negotiation just becomes the same rival fight "Meet them head-on" leads to —
    // rivalEncounter picks its own target fresh.
    next: (state, label) => (label === 'Yes' ? hubIdFor(state) : 'rivalEncounter'),
  },

  // ---- Reverie: crashing it uses worldEventDanger; this is the "use the chaos" branch -------
  worldEventReverieHeist: {
    type: 'wheel',
    id: 'worldEventReverieHeist',
    category: 'World Event',
    question: 'What do you make of the chaos?',
    icon: '🎭',
    options: (state) => {
      const options = [
        opt('You steal a valuable secret', 3, '#be185d'),
        opt('You recruit a disillusioned defector', 3, '#1d4ed8'),
        opt('CP0 catches you in the act', 3, '#7f1d1d'),
      ]
      if (!state.devilFruit) options.splice(2, 0, opt('You slip away with a Devil Fruit', 2, '#7c3aed'))
      return options
    },
    onSelect: (state, label) => {
      if (label === 'You recruit a disillusioned defector') {
        return { ...state, crew: [...state.crew, { name: 'A disillusioned defector', role: 'Defector' }] }
      }
      return label === 'You steal a valuable secret' ? withPoneglyph(state) : state
    },
    next: (state, label) => {
      if (label === 'You slip away with a Devil Fruit' && !state.devilFruit) return 'devilFruitFoundType'
      if (label === 'CP0 catches you in the act') return 'worldEventReverieCaught'
      return hubIdFor(state)
    },
  },

  worldEventReverieCaught: {
    type: 'wheel',
    id: 'worldEventReverieCaught',
    question: 'Do you slip away in time?',
    icon: '🕴️',
    options: (state) =>
      fightOddsOptions(
        state,
        'A CP0 black-ops agent',
        'You vanish into the crowd before they close in.',
        'They corner you.',
      ),
    onSelect: (state) => ({ ...state, lastOpponent: 'A CP0 black-ops agent' }),
    next: (state, label) => (label === 'Yes' ? hubIdFor(state) : 'worldEventDeathRoll'),
  },

  // ---- storm wrecks half the Grand Line: three genuinely different responses -----------------
  worldEventStormRescue: {
    type: 'wheel',
    id: 'worldEventStormRescue',
    category: 'World Event',
    question: 'Do you reach them in time?',
    icon: '🌊',
    // Speed-led, not combatEdge — see stormRescueOdds: this is a race against the storm, not a
    // fight, so Power/Durability don't factor in at all.
    options: (state) =>
      stormRescueOdds(
        state,
        'The raging storm itself',
        'You pull the stranded sailors to safety.',
        'The storm tears your ship away before you reach them.',
      ),
    onSelect: (state, label) => ({
      ...state,
      lastOpponent: 'The raging storm itself',
      pendingReturnNode: hubIdFor(state),
      ...(label === 'Yes' ? { crew: [...state.crew, { name: 'A rescued sailor', role: 'Grateful crewmate' }] } : {}),
    }),
    next: (state, label) => (label === 'Yes' ? rankIncreaseCheckIdFor(state) : 'worldEventDeathRoll'),
  },

  worldEventStormRideOut: {
    type: 'wheel',
    id: 'worldEventStormRideOut',
    category: 'World Event',
    question: 'Does your ship survive?',
    icon: '🌊',
    options: (state) => survivalOdds(state, 'The raging storm itself', 1),
    // No growth/rank check follows this (riding it out passively earns nothing beyond survival),
    // so lastOpponent is never read downstream — clear it anyway rather than leave it set to a
    // value nothing consumes, which would otherwise linger stale for whatever non-combat check
    // comes next in the run.
    onSelect: (state, label) => ({
      ...state,
      lastOpponent: undefined,
      ...(label === 'No' ? { causeOfDeath: 'The storm swallowed your ship whole. Your story ends here.' } : {}),
    }),
    next: hubIdFor,
  },

  // ---- meeting other pirates --------------------------------------------
  meetPirates: {
    type: 'wheel',
    id: 'meetPirates',
    category: 'Pirate Encounter',
    question: 'Who do you run into?',
    icon: '🏴‍☠️',
    options: (state) => npcOptions(pirateRosterWithImmortals(), state),
    // Sets both lastMet (for a possible recruit) and lastOpponent (for a possible fight,
    // reusing the same combat chain the Marine faction's pirate-hunting uses).
    onSelect: (state, label) => ({ ...state, lastMet: label, lastOpponent: label }),
    next: 'meetPiratesEncounterType',
  },

  meetPiratesEncounterType: {
    type: 'wheel',
    id: 'meetPiratesEncounterType',
    question: 'What happens?',
    icon: '⚔️',
    options: [
      opt('A fight breaks out', 5, '#7f1d1d'),
      opt('You try to recruit them', 3, '#1d4ed8'),
      opt('You avoid them entirely', 3, '#374151'),
    ],
    next: (state, label) => {
      const routes: Record<string, string> = {
        'A fight breaks out': 'pirateFightTactic',
        'You try to recruit them': 'meetPiratesRecruitAttempt',
        'You avoid them entirely': 'meetPiratesAvoid',
      }
      return routes[label] ?? hubIdFor(state)
    },
  },

  meetPiratesRecruitAttempt: {
    type: 'wheel',
    id: 'meetPiratesRecruitAttempt',
    question: 'Do they accept?',
    icon: '🤝',
    options: [opt('Yes', 6, '#16a34a'), opt('No', 4, '#dc2626')],
    // An existing character's specialty and strength are already established (their NpcDef
    // profile) — no need to spin for either, unlike a brand-new, unnamed recruit.
    onSelect: (state, label) => {
      if (label !== 'Yes') return state
      const name = state.lastMet ?? 'a new ally'
      return {
        ...state,
        crew: [...state.crew, { name, role: 'Crewmate' }],
        recruited: new Set(state.recruited).add(name),
      }
    },
    next: (state, label) => (label === 'Yes' ? hubIdFor(state) : 'meetPiratesRecruitFail'),
  },

  meetPiratesRecruitFail: {
    type: 'wheel',
    id: 'meetPiratesRecruitFail',
    question: 'How do they respond?',
    icon: '🤝',
    options: [
      opt('They refuse and walk away', 6, '#374151'),
      opt('They refuse and attack!', 3, '#7f1d1d'),
    ],
    next: (state, label) => (label === 'They refuse and attack!' ? 'pirateFightTactic' : hubIdFor(state)),
  },

  meetPiratesAvoid: {
    type: 'wheel',
    id: 'meetPiratesAvoid',
    question: 'Do you get away clean?',
    icon: '🏃',
    options: [
      opt('You slip away unnoticed', 6, '#374151'),
      opt('They spot you and give chase!', 3, '#7f1d1d'),
    ],
    next: (state, label) => (label === 'They spot you and give chase!' ? 'pirateFightTactic' : hubIdFor(state)),
  },

  // ---- gaining crewmates --------------------------------------------------
  gainCrewmates: {
    type: 'wheel',
    id: 'gainCrewmates',
    category: 'Crew',
    question: 'Who joins your ranks?',
    icon: '🧑‍🤝‍🧑',
    options: CREW_ROLES,
    onSelect: (state, label) => ({ ...state, crew: [...state.crew, { name: label, role: label }] }),
    next: 'gainCrewmatesStrength',
  },

  gainCrewmatesStrength: {
    type: 'wheel',
    id: 'gainCrewmatesStrength',
    question: 'How do they compare to you?',
    icon: '💪',
    options: crewStrengthOptionsFor,
    onSelect: (state, label) => setLastCrewmateStrength(state, label),
    next: hubIdFor,
  },

  // ---- road poneglyphs ------------------------------------------------------
  poneglyphMethod: {
    type: 'wheel',
    id: 'poneglyphMethod',
    category: 'Road Poneglyph',
    question: 'How do you acquire one?',
    icon: '🗿',
    options: [
      opt('Steal from other Pirates', 6, '#7f1d1d'),
      opt('Search for them', 4, '#991b1b'),
    ],
    next: (_state, label) =>
      label === 'Steal from other Pirates' ? 'poneglyphTarget' : 'poneglyphSearchLocation',
  },

  poneglyphTarget: {
    type: 'wheel',
    id: 'poneglyphTarget',
    category: 'Road Poneglyph',
    question: 'Who do you steal from?',
    icon: '🗿',
    options: (state) => npcOptions(pirateRosterWithImmortals().filter((n) => n.minTier >= 3), state),
    onSelect: (state, label) => ({ ...state, lastOpponent: label }),
    next: 'poneglyphTactic',
  },

  poneglyphTactic: {
    type: 'wheel',
    id: 'poneglyphTactic',
    category: 'Road Poneglyph',
    question: 'How do you approach the theft?',
    icon: '🗡️',
    options: (state) =>
      TACTIC_OPTIONS.filter(
        (o) =>
          (o.label !== 'Use your Devil Fruit' || Boolean(state.devilFruit)) &&
          (o.label !== 'Call for backup' || state.crew.length > 0),
      ),
    onSelect: (state, label) => ({ ...state, pendingTacticBonus: tacticBonus(label) }),
    next: 'poneglyphFightOutcome',
  },

  poneglyphFightOutcome: {
    type: 'wheel',
    id: 'poneglyphFightOutcome',
    question: 'Do you win the fight?',
    icon: '⚔️',
    options: (state) =>
      fightOddsOptions(
        state,
        state.lastOpponent ?? '',
        'You beat them down and take the Poneglyph.',
        'They overpower you and you flee empty-handed.',
      ),
    onSelect: (state, label) =>
      label === 'Yes'
        ? {
            ...withPoneglyph({
              ...state,
              defeatedOpponents: [...state.defeatedOpponents, state.lastOpponent ?? 'them'],
            }),
            pendingReturnNode: hubIdFor(state),
          }
        : state,
    next: (state, label) => (label === 'Yes' ? rankIncreaseCheckIdFor(state) : 'poneglyphDeathRoll'),
  },

  poneglyphDeathRoll: {
    type: 'wheel',
    id: 'poneglyphDeathRoll',
    question: 'Do you survive?',
    icon: '💀',
    options: (state) => survivalOdds(state, state.lastOpponent ?? ''),
    onSelect: (state, label) =>
      label === 'No'
        ? { ...state, causeOfDeath: `${state.lastOpponent ?? 'They'} made sure you'd never steal from them again.` }
        : state,
    next: (state, label) => (label === 'Yes' ? 'poneglyphLossConsequence' : hubIdFor(state)),
  },

  poneglyphLossConsequence: {
    type: 'wheel',
    id: 'poneglyphLossConsequence',
    question: "What's the cost?",
    icon: '💥',
    options: lossConsequenceOptions,
    onSelect: (state) => ({ ...state, pendingReturnNode: hubIdFor(state) }),
    next: (_state, label) => (label === 'You lose an ally' ? 'loseAllyTarget' : 'growthCheck'),
  },

  poneglyphSearchLocation: {
    type: 'wheel',
    id: 'poneglyphSearchLocation',
    category: 'Road Poneglyph',
    question: 'Where do you look?',
    icon: '🗺️',
    options: PONEGLYPH_SEARCH_LOCATIONS,
    onSelect: (state, label) => ({ ...state, pendingPoneglyphLocation: label }),
    next: 'poneglyphSearchResult',
  },

  poneglyphSearchResult: {
    type: 'wheel',
    id: 'poneglyphSearchResult',
    category: 'Road Poneglyph',
    question: 'Is it actually there?',
    icon: '🗿',
    options: (state) => poneglyphFindOdds(state, poneglyphLocationModifier(state.pendingPoneglyphLocation ?? '')),
    onSelect: (state, label) => ({
      ...(label === 'Yes' ? withPoneglyph(state) : state),
      pendingPoneglyphLocation: undefined,
    }),
    next: hubIdFor,
  },

  // ---- marines -----------------------------------------------------------
  // Which Marine you draw is decided entirely by your current rank/bounty (marineTierForRank) —
  // no separate difficulty spin; a maxed-out bounty only ever pulls from the strongest roster.
  marineEncounter: {
    type: 'wheel',
    id: 'marineEncounter',
    category: 'Marines',
    question: 'Which Marine?',
    icon: '⚓',
    options: (state) => marineRosterOptionsWithImmortals(state),
    onSelect: (state, label) => ({ ...state, lastOpponent: label }),
    next: 'marineTactic',
  },

  // Liberating an island means fighting whoever the Marines have garrisoned there — same
  // roster/tactic/outcome chain as a direct Marine clash, just reached through a different door.
  liberateIsland: {
    type: 'wheel',
    id: 'liberateIsland',
    category: 'Revolutionary',
    question: 'Who holds the island?',
    icon: '🌋',
    options: (state) => marineRosterOptionsWithImmortals(state),
    onSelect: (state, label) => ({ ...state, lastOpponent: label }),
    next: 'marineTactic',
  },

  marineTactic: {
    type: 'wheel',
    id: 'marineTactic',
    category: 'Marines',
    question: 'How do you approach the fight?',
    icon: '🗡️',
    options: (state) =>
      TACTIC_OPTIONS.filter(
        (o) =>
          (o.label !== 'Use your Devil Fruit' || Boolean(state.devilFruit)) &&
          (o.label !== 'Call for backup' || state.crew.length > 0),
      ),
    onSelect: (state, label) => ({ ...state, pendingTacticBonus: tacticBonus(label) }),
    next: 'marineOutcome',
  },

  marineOutcome: {
    type: 'wheel',
    id: 'marineOutcome',
    question: 'Are you successful?',
    icon: '⚔️',
    options: (state) =>
      fightOddsOptions(
        state,
        state.lastOpponent ?? '',
        'You overpower them and walk away victorious.',
        'You barely escape with your life.',
      ),
    next: (_state, label) => (label === 'Yes' ? 'marineAftermath' : 'marineDeathRoll'),
  },

  marineDeathRoll: {
    type: 'wheel',
    id: 'marineDeathRoll',
    question: 'Do you survive?',
    icon: '💀',
    options: (state) => survivalOdds(state, state.lastOpponent ?? ''),
    onSelect: (state, label) =>
      label === 'No'
        ? { ...state, causeOfDeath: `${state.lastOpponent ?? 'The Marines'} finish the job. Your story ends here.` }
        : state,
    next: (state, label) => (label === 'Yes' ? 'marineLossConsequence' : hubIdFor(state)),
  },

  marineAftermath: {
    type: 'wheel',
    id: 'marineAftermath',
    question: 'What happens to them?',
    icon: '⚔️',
    options: (state) => aftermathOptions(state, 'They retreat and report back', 'You capture them'),
    onSelect: (state, label) => ({ ...applyAftermath(state, label), pendingReturnNode: hubIdFor(state) }),
    next: rankIncreaseCheckIdFor,
  },

  marineLossConsequence: {
    type: 'wheel',
    id: 'marineLossConsequence',
    question: "What's the cost?",
    icon: '💥',
    options: lossConsequenceOptions,
    onSelect: (state) => ({ ...state, pendingReturnNode: hubIdFor(state) }),
    next: (_state, label) => (label === 'You lose an ally' ? 'loseAllyTarget' : 'growthCheck'),
  },

  // ---- fighting pirates (Marine faction) ---------------------------------
  pirateFightRoster: {
    type: 'wheel',
    id: 'pirateFightRoster',
    category: 'Pirates',
    question: 'Who do you face?',
    icon: '🏴‍☠️',
    options: (state) => npcOptions(pirateRosterWithImmortals(), state),
    onSelect: (state, label) => ({ ...state, lastOpponent: label }),
    next: 'pirateFightTactic',
  },

  pirateFightTactic: {
    type: 'wheel',
    id: 'pirateFightTactic',
    category: 'Pirates',
    question: 'How do you approach the fight?',
    icon: '🗡️',
    options: (state) =>
      TACTIC_OPTIONS.filter(
        (o) =>
          (o.label !== 'Use your Devil Fruit' || Boolean(state.devilFruit)) &&
          (o.label !== 'Call for backup' || state.crew.length > 0),
      ),
    onSelect: (state, label) => ({ ...state, pendingTacticBonus: tacticBonus(label) }),
    next: 'pirateFightOutcome',
  },

  pirateFightOutcome: {
    type: 'wheel',
    id: 'pirateFightOutcome',
    question: 'Do you defeat them?',
    icon: '⚔️',
    options: (state) =>
      fightOddsOptions(
        state,
        state.lastOpponent ?? '',
        'Justice prevails — this time.',
        'You barely escape with your life.',
      ),
    next: (_state, label) => (label === 'Yes' ? 'pirateFightAftermath' : 'pirateFightDeathRoll'),
  },

  pirateFightDeathRoll: {
    type: 'wheel',
    id: 'pirateFightDeathRoll',
    question: 'Do you survive?',
    icon: '💀',
    options: (state) => survivalOdds(state, state.lastOpponent ?? ''),
    onSelect: (state, label) =>
      label === 'No'
        ? { ...state, causeOfDeath: `${state.lastOpponent ?? 'They'} show no mercy. Your story ends here.` }
        : state,
    next: (state, label) => (label === 'Yes' ? 'pirateFightLossConsequence' : hubIdFor(state)),
  },

  pirateFightAftermath: {
    type: 'wheel',
    id: 'pirateFightAftermath',
    question: 'What happens to them?',
    icon: '⚔️',
    options: (state) => aftermathOptions(state, 'They scatter and flee', 'You capture their captain'),
    onSelect: (state, label) => ({ ...applyAftermath(state, label), pendingReturnNode: hubIdFor(state) }),
    next: rankIncreaseCheckIdFor,
  },

  pirateFightLossConsequence: {
    type: 'wheel',
    id: 'pirateFightLossConsequence',
    question: "What's the cost?",
    icon: '💥',
    options: lossConsequenceOptions,
    onSelect: (state) => ({ ...state, pendingReturnNode: hubIdFor(state) }),
    next: (_state, label) => (label === 'You lose an ally' ? 'loseAllyTarget' : 'growthCheck'),
  },

  // ---- shared post-fight-win sequence: rank/bounty bump, then growth ------
  rankIncreaseCheck: {
    type: 'wheel',
    id: 'rankIncreaseCheck',
    question: 'Does your reputation grow?',
    icon: '📯',
    options: (state) => rankIncreaseOdds(state, state.lastOpponent ?? ''),
    next: (state, label) =>
      label === 'Yes' && !isAtMaxRank(state) ? 'rankIncreaseTarget' : growthCheckIdFor(state),
  },

  rankIncreaseTarget: {
    type: 'wheel',
    id: 'rankIncreaseTarget',
    category: 'Rank',
    question: 'How far does it climb?',
    icon: '📈',
    options: higherRankOptions,
    onSelect: (state, label) => {
      const next = { ...state, rank: label, rankHistory: [...state.rankHistory, label] }
      // Detour through bountyRoll for Pirates — stash where growthCheckIdFor would otherwise
      // have sent us directly, since bountyRoll is shared and needs to know where to return.
      return next.affiliation === 'Pirate' ? { ...next, pendingBountyReturnNode: growthCheckIdFor(next) } : next
    },
    next: (state) => (state.affiliation === 'Pirate' ? 'bountyRoll' : growthCheckIdFor(state)),
  },

  growthCheck: {
    type: 'wheel',
    id: 'growthCheck',
    question: 'Do you get stronger from this fight?',
    icon: '🗡️',
    options: (state) => growthOdds(state, state.lastOpponent ?? ''),
    next: growthCheckNext,
  },

  // Same growth roll, but for non-combat moments (a treasure haul, spreading fame) — no
  // opponent to size up against, so the odds and wording stay neutral instead of fight-flavored.
  growthCheckGeneric: {
    type: 'wheel',
    id: 'growthCheckGeneric',
    question: 'Do you grow from this experience?',
    icon: '📈',
    options: (state) => growthOddsGeneric(state, state.pendingEventRarityWeight),
    next: growthCheckNext,
  },

  // ---- fresh hub encounters: exploration, rivals, mentors, gear, downtime -----
  ruinsExploration: {
    type: 'wheel',
    id: 'ruinsExploration',
    category: 'Exploration',
    question: 'What do you find?',
    icon: '🏛️',
    options: (state) => {
      const options = [
        opt('A guardian attacks!', 3, '#7f1d1d'),
        opt('A cache of treasure — your reputation grows', 3, '#b45309'),
        opt('Just dust and bones', 3, '#374151'),
      ]
      if (!state.devilFruit) options.splice(1, 0, opt('A hidden Devil Fruit', 2, '#7c3aed'))
      return options
    },
    onSelect: (state, label) => (label === 'A guardian attacks!' ? { ...state, lastOpponent: 'A Ruins Guardian' } : state),
    next: (state, label) => {
      const routes: Record<string, string> = {
        'A guardian attacks!': 'marineTactic',
        'A hidden Devil Fruit': 'ruinsDevilFruitType',
        'A cache of treasure — your reputation grows': 'ruinsTreasureCheck',
        'Just dust and bones': hubIdFor(state),
      }
      return routes[label] ?? hubIdFor(state)
    },
  },

  ruinsTreasureCheck: {
    type: 'wheel',
    id: 'ruinsTreasureCheck',
    question: 'Does it pay off?',
    icon: '💰',
    options: [opt('Yes', 4, '#16a34a'), opt('No', 6, '#374151')],
    // "You discover ancient ruins" is weight 3 on the hub wheel — a fairly rare pull — so the
    // growth check downstream should reflect that rarity.
    onSelect: (state) => ({
      ...state,
      lastOpponent: undefined,
      pendingReturnNode: hubIdFor(state),
      pendingEventRarityWeight: 3,
    }),
    next: (state, label) =>
      label === 'Yes' && !isAtMaxRank(state) ? 'rankIncreaseTarget' : growthCheckIdFor(state),
  },

  rivalEncounter: {
    type: 'wheel',
    id: 'rivalEncounter',
    category: 'Rival',
    question: 'Who confronts you?',
    icon: '⚔️',
    options: (state) => npcOptions(rivalRosterWithImmortals(), state),
    onSelect: (state, label) => ({ ...state, lastOpponent: label }),
    next: 'marineTactic',
  },

  // No canon roster of Revolutionary NPCs exists — this encounter only ever draws from
  // immortalized Revolutionaries, which is why the hub option that routes here only appears
  // once at least one exists (see the hubPirate/hubMarine option-list builders below). Reuses
  // the same shared marineTactic/marineOutcome/marineAftermath chain as marineEncounter,
  // liberateIsland, and rivalEncounter — no new tactic/outcome/aftermath nodes needed.
  revolutionaryEncounter: {
    type: 'wheel',
    id: 'revolutionaryEncounter',
    category: 'Revolutionary',
    question: 'Which Revolutionary?',
    icon: '✊',
    options: (state) => revolutionaryRosterOptions(state),
    onSelect: (state, label) => ({ ...state, lastOpponent: label }),
    next: 'marineTactic',
  },

  // "A traitor from within" is only ever someone you actually recruited — the wheel is drawn
  // straight from state.crew, never the generic rival/canon rosters (see the conditional push
  // in hubRevolutionary, gated on state.crew.length > 0). Removing them from crew immediately
  // on selection (not just after the fight resolves) matters mechanically too: myCrewEdgeBonus
  // sums everyone in state.crew into the player's own combat edge, and a traitor shouldn't be
  // boosting your side of the fight you're about to have with them.
  traitorEncounter: {
    type: 'wheel',
    id: 'traitorEncounter',
    category: 'Revolutionary',
    question: 'Who turns on you?',
    icon: '🗡️',
    options: (state) => state.crew.map((c) => opt(c.name, 1, '#450a0a')),
    onSelect: (state, label) => ({
      ...state,
      lastOpponent: label,
      crew: state.crew.filter((c) => c.name !== label),
    }),
    next: 'marineTactic',
  },

  // Landed on by every *LossConsequence node's "You lose an ally" option — spins for *which*
  // crewmate, rather than picking one invisibly. They're removed from state.crew and marked
  // deceased either way, same as the old inline resolution did.
  loseAllyTarget: {
    type: 'wheel',
    id: 'loseAllyTarget',
    question: 'Who do you lose?',
    icon: '💔',
    options: (state) => state.crew.map((c) => opt(c.name, 1, '#450a0a')),
    onSelect: (state, label) => ({
      ...state,
      crew: state.crew.filter((c) => c.name !== label),
      deceased: new Set(state.deceased).add(label),
    }),
    next: 'growthCheck',
  },

  weaponReforge: {
    type: 'wheel',
    id: 'weaponReforge',
    category: 'Gear',
    question: 'A blacksmith offers to reforge your weapon. What do they improve?',
    icon: '🗡️',
    options: weaponReforgeOptions,
    onSelect: (state, label) => ({
      ...state,
      pendingStatName: label.toLowerCase() as StatKey,
      pendingReturnNode: undefined,
    }),
    next: 'growthStatTarget',
  },

  reputationSpread: {
    type: 'wheel',
    id: 'reputationSpread',
    question: 'Does it pay off?',
    icon: '📯',
    options: [opt('Yes', 4, '#16a34a'), opt('No', 6, '#374151')],
    // Its hub weight is 3 across all three affiliations — a fairly rare pull — so the growth
    // check downstream should reflect that rarity.
    onSelect: (state) => ({
      ...state,
      lastOpponent: undefined,
      pendingReturnNode: hubIdFor(state),
      pendingEventRarityWeight: 3,
    }),
    next: (state, label) =>
      label === 'Yes' && !isAtMaxRank(state) ? 'rankIncreaseTarget' : growthCheckIdFor(state),
  },

  // ---- training / growth --------------------------------------------------
  growthStronger: {
    type: 'wheel',
    id: 'growthStronger',
    question: 'Do you get stronger?',
    icon: '🗡️',
    options: [opt('Yes', 8, '#16a34a'), opt('No', 2, '#dc2626')],
    next: (state, label) =>
      label === 'Yes' && growableCount(state) > 0 ? 'growthStatCount' : hubIdFor(state),
  },

  growthStatCount: {
    type: 'wheel',
    id: 'growthStatCount',
    question: 'How many stats improve?',
    icon: '📈',
    options: (state) => GROWTH_COUNT_OPTIONS.slice(0, Math.max(1, Math.min(6, growableCount(state)))),
    onSelect: (state, label) => ({ ...state, pendingStatRolls: Number(label), pendingGrowthPicked: [] }),
    next: 'growthStatPick',
  },

  // "Which stat improves?" pool spans the 4 numeric stats, the 3 Haki types, fighting-style
  // mastery, and (if you have one) Devil Fruit mastery — one shared wheel, no duplicates
  // within a batch, and maxed-out entries drop off the wheel entirely.
  growthStatPick: {
    type: 'wheel',
    id: 'growthStatPick',
    question: 'Which stat improves?',
    icon: '💪',
    options: (state) => {
      const picked = new Set(state.pendingGrowthPicked)
      const statOpts = STAT_OPTIONS.filter((o) => {
        const key = o.label.toLowerCase() as StatKey
        return !picked.has(o.label) && statTierIndex(key, state.stats[key]) < STAT_TIER_OPTIONS[key].length - 1
      })
      const hakiOpts = HAKI_TYPES.filter((t) => state.haki[t] !== 'Advanced' && !picked.has(`${t} Haki`)).map((t) =>
        opt(
          `${t} Haki`,
          t === "Conqueror's" ? 1 : 4,
          t === 'Armament' ? '#7f1d1d' : t === 'Observation' ? '#991b1b' : '#facc15',
        ),
      )
      const masteryOpts =
        !picked.has('Fighting Style Mastery') && masteryGrowable(state)
          ? [opt('Fighting Style Mastery', 3, '#94a3b8')]
          : []
      const dfMaxIdx = DEVIL_FRUIT_MASTERY_LEVELS.length - 1
      const dfIdx1 = DEVIL_FRUIT_MASTERY_LEVELS.indexOf(state.devilFruitMastery ?? DEVIL_FRUIT_MASTERY_LEVELS[0])
      const dfIdx2 = state.secondDevilFruit
        ? DEVIL_FRUIT_MASTERY_LEVELS.indexOf(state.secondDevilFruitMastery ?? DEVIL_FRUIT_MASTERY_LEVELS[0])
        : dfMaxIdx
      const dfMasteryOpts =
        state.devilFruit && !picked.has('Devil Fruit Mastery') && (dfIdx1 < dfMaxIdx || dfIdx2 < dfMaxIdx)
          ? [opt('Devil Fruit Mastery', 2, '#7c3aed')]
          : []
      const combined = [...statOpts, ...hakiOpts, ...masteryOpts, ...dfMasteryOpts]
      return combined.length > 0 ? combined : STAT_OPTIONS
    },
    onSelect: (state, label) => {
      const picked = [...state.pendingGrowthPicked, label]
      if (label.endsWith('Haki')) {
        return { ...state, pendingHakiName: label.replace(' Haki', '') as HakiType, pendingGrowthPicked: picked }
      }
      if (label === 'Fighting Style Mastery' || label === 'Devil Fruit Mastery') {
        return { ...state, pendingGrowthPicked: picked }
      }
      return { ...state, pendingStatName: label.toLowerCase() as StatKey, pendingGrowthPicked: picked }
    },
    next: (state, label) => {
      if (label.endsWith('Haki')) return 'growthHakiTarget'
      if (label === 'Fighting Style Mastery') {
        return state.additionalStyles.length > 0 ? 'growthMasteryStylePick' : 'growthMasteryTarget'
      }
      if (label === 'Devil Fruit Mastery') return 'growthDevilFruitMasteryTarget'
      return 'growthStatTarget'
    },
  },

  growthStatTarget: {
    type: 'wheel',
    id: 'growthStatTarget',
    question: 'What level do you reach?',
    icon: '📈',
    options: (state) => higherStatOptions(state, state.pendingStatName ?? 'power'),
    onSelect: (state, label) => {
      const key = state.pendingStatName ?? 'power'
      return {
        ...state,
        stats: { ...state.stats, [key]: label },
        pendingStatRolls: state.pendingStatRolls - 1,
      }
    },
    next: growthLoopNext,
  },

  growthHakiTarget: {
    type: 'wheel',
    id: 'growthHakiTarget',
    question: 'What level do you reach?',
    icon: '🥊',
    options: (state) => higherHakiOptions(state, state.pendingHakiName ?? 'Armament'),
    onSelect: (state, label) => {
      const t = state.pendingHakiName ?? 'Armament'
      return {
        ...state,
        haki: { ...state.haki, [t]: label as HakiLevel },
        pendingStatRolls: state.pendingStatRolls - 1,
      }
    },
    next: growthLoopNext,
  },

  // Only reached when the player knows more than one fighting style — picks which one the
  // "Fighting Style Mastery" growth slot actually improves, before growthMasteryTarget rolls
  // how far it climbs. A single-style character skips straight to growthMasteryTarget instead
  // (see growthStatPick's next()), since there's nothing to choose between.
  growthMasteryStylePick: {
    type: 'wheel',
    id: 'growthMasteryStylePick',
    category: 'Training',
    question: 'Which fighting style improves?',
    icon: '🥋',
    options: (state) => {
      const all = [
        { name: state.fightingStyle ?? 'Unknown Style', mastery: state.fightingMastery ?? MASTERY_LEVEL_ORDER[0] },
        ...state.additionalStyles.map((s) => ({ name: s.style, mastery: s.mastery })),
      ]
      const growable = all.filter((s) => MASTERY_LEVEL_ORDER.indexOf(s.mastery) < MASTERY_LEVEL_ORDER.length - 1)
      const pool = growable.length > 0 ? growable : all
      return pool.map((s) => opt(s.name, 1, '#94a3b8', `Currently ${s.mastery}`))
    },
    onSelect: (state, label) => ({ ...state, pendingMasteryStyle: label }),
    next: 'growthMasteryTarget',
  },

  growthMasteryTarget: {
    type: 'wheel',
    id: 'growthMasteryTarget',
    question: 'What level do you reach?',
    icon: '📈',
    options: (state) => higherMasteryOptions(currentMasteryForStyle(state, masteryTargetStyle(state))),
    onSelect: (state, label) => ({
      ...applyMasteryForStyle(state, masteryTargetStyle(state), label),
      pendingMasteryStyle: undefined,
      pendingStatRolls: state.pendingStatRolls - 1,
    }),
    next: growthLoopNext,
  },

  growthDevilFruitMasteryTarget: {
    type: 'wheel',
    id: 'growthDevilFruitMasteryTarget',
    question: 'What level do you reach?',
    icon: '🍈',
    options: (state) => {
      const slot = growableDevilFruitSlot(state)
      const current =
        slot === 'second'
          ? (state.secondDevilFruitMastery ?? DEVIL_FRUIT_MASTERY_LEVELS[0])
          : (state.devilFruitMastery ?? DEVIL_FRUIT_MASTERY_LEVELS[0])
      return higherDevilFruitMasteryOptions(current)
    },
    onSelect: (state, label) => {
      const slot = growableDevilFruitSlot(state)
      return {
        ...state,
        ...(slot === 'second' ? { secondDevilFruitMastery: label } : { devilFruitMastery: label }),
        pendingStatRolls: state.pendingStatRolls - 1,
      }
    },
    next: growthLoopNext,
  },

  // ---- fighting style (learn additional) ---------------------------------
  fightingStyleLearn: {
    type: 'wheel',
    id: 'fightingStyleLearn',
    category: 'Training',
    question: 'What new fighting style do you learn?',
    icon: '🥋',
    options: (state) => {
      const known = new Set([state.fightingStyle, ...state.additionalStyles.map((s) => s.style)])
      const fresh = FIGHTING_STYLES.filter((s) => !known.has(s.label))
      return fresh.length > 0 ? fresh : FIGHTING_STYLES
    },
    onSelect: (state, label) => ({ ...state, pendingNewStyle: label }),
    next: 'fightingStyleLearnMastery',
  },

  fightingStyleLearnMastery: {
    type: 'wheel',
    id: 'fightingStyleLearnMastery',
    category: 'Training',
    question: 'What is your mastery level?',
    icon: '📈',
    options: MASTERY_LEVELS,
    onSelect: (state, label) => ({
      ...state,
      additionalStyles: [...state.additionalStyles, { style: state.pendingNewStyle ?? 'a new style', mastery: label }],
    }),
    next: hubIdFor,
  },

  // ---- devil fruit (found later) -------------------------------------------
  devilFruitEncounter: {
    type: 'wheel',
    id: 'devilFruitEncounter',
    category: 'Devil Fruit',
    question: 'Do you find one?',
    icon: '🍈',
    options: [opt('Yes', 65, '#7c3aed'), opt('No, it slips away', 35, '#374151')],
    next: (state, label) => (label === 'Yes' ? 'devilFruitFoundType' : hubIdFor(state)),
  },

  devilFruitFoundType: {
    type: 'wheel',
    id: 'devilFruitFoundType',
    category: 'Devil Fruit',
    question: 'What type is it?',
    icon: '🍈',
    options: DEVIL_FRUIT_TYPES,
    onSelect: (state, label) => ({ ...state, pendingDevilFruitType: label as CharacterState['pendingDevilFruitType'] }),
    next: 'devilFruitFoundSpecific',
  },

  // A fruit found specifically in ancient ruins skews heavily toward Ancient/Mythical Zoan (see
  // RUINS_DEVIL_FRUIT_TYPES) — otherwise identical to devilFruitFoundType, feeding the same
  // devilFruitFoundSpecific/devilFruitDisposal chain afterward.
  ruinsDevilFruitType: {
    type: 'wheel',
    id: 'ruinsDevilFruitType',
    category: 'Devil Fruit',
    question: 'What type is it?',
    icon: '🍈',
    options: RUINS_DEVIL_FRUIT_TYPES,
    onSelect: (state, label) => ({ ...state, pendingDevilFruitType: label as CharacterState['pendingDevilFruitType'] }),
    next: 'devilFruitFoundSpecific',
  },

  devilFruitFoundSpecific: {
    type: 'wheel',
    id: 'devilFruitFoundSpecific',
    category: 'Devil Fruit',
    question: 'Which one?',
    icon: '🍈',
    options: (state) => {
      // Only one of each fruit exists in the world at a time — you can't find the exact one
      // you (or your second bite) already carry.
      const owned = new Set([state.devilFruit, state.secondDevilFruit].filter((f): f is string => Boolean(f)))
      const pool = fruitListForType(state.pendingDevilFruitType ?? 'Paramecia').filter((o) => !owned.has(o.label))
      return pool.length > 0 ? pool : fruitListForType(state.pendingDevilFruitType ?? 'Paramecia')
    },
    onSelect: (state, label) => ({ ...state, pendingFoundFruit: label }),
    next: 'devilFruitDisposal',
  },

  devilFruitDisposal: {
    type: 'wheel',
    id: 'devilFruitDisposal',
    category: 'Devil Fruit',
    question: 'What do you do with it?',
    icon: '🍈',
    options: devilFruitDisposalOptions,
    onSelect: (state, label) => {
      if (label === 'Eat it') {
        if (state.devilFruit) {
          // Already carrying one fruit's power — whether a second one is survivable at all, and
          // (if so) which slot's mastery the next wheel targets, is decided further down the
          // chain — pendingSecondFruit stays true until devilFruitFoundMastery consumes it.
          return { ...state, pendingSecondFruit: true }
        }
        return {
          ...state,
          devilFruit: state.pendingFoundFruit,
          devilFruitType: state.pendingDevilFruitType,
          pendingSecondFruit: false,
        }
      }
      if (label === 'Feed it to a weapon') {
        return { ...state, weaponHasDevilFruit: true, pendingSecondFruit: false }
      }
      return { ...state, pendingSecondFruit: false }
    },
    next: (state, label) => {
      if (label !== 'Eat it') return hubIdFor(state)
      return state.pendingSecondFruit ? 'secondDevilFruitSurvival' : 'devilFruitFoundMastery'
    },
  },

  secondDevilFruitSurvival: {
    type: 'wheel',
    id: 'secondDevilFruitSurvival',
    category: 'Devil Fruit',
    question: 'Can your body handle two Devil Fruits?',
    icon: '☠️',
    options: secondDevilFruitSurvivalOdds,
    onSelect: (state, label) => {
      if (label === 'Survive') {
        // pendingSecondFruit stays true — devilFruitFoundMastery reads it to know this roll
        // targets secondDevilFruitMastery, not the primary fruit's.
        return {
          ...state,
          secondDevilFruit: state.pendingFoundFruit,
          secondDevilFruitType: state.pendingDevilFruitType,
        }
      }
      return {
        ...state,
        pendingSecondFruit: false,
        causeOfDeath: `You already carried the power of the ${state.devilFruit}. Eating the ${state.pendingFoundFruit} on top of it tore your body apart from the inside — one in a million bodies could have withstood it, and yours wasn't one of them.`,
      }
    },
    next: (state, label) => (label === 'Survive' ? 'devilFruitFoundMastery' : hubIdFor(state)),
  },

  // Shared by a first-time bite (devilFruitDisposal) and a surviving second bite
  // (secondDevilFruitSurvival) — pendingSecondFruit (still true only in the latter case) decides
  // which mastery field this roll writes to.
  devilFruitFoundMastery: {
    type: 'wheel',
    id: 'devilFruitFoundMastery',
    category: 'Devil Fruit',
    question: 'How well do you control it?',
    icon: '🍈',
    options: DEVIL_FRUIT_MASTERY_START_OPTIONS,
    onSelect: (state, label) => ({
      ...state,
      ...(state.pendingSecondFruit ? { secondDevilFruitMastery: label } : { devilFruitMastery: label }),
      pendingSecondFruit: false,
    }),
    next: hubIdFor,
  },

  // ---- rank / bounty jump (guaranteed increase, real rank names) ----------
  rankJump: {
    type: 'wheel',
    id: 'rankJump',
    category: 'Rank',
    question: 'What do you rise to?',
    icon: '📈',
    options: higherRankOptions,
    onSelect: (state, label) => {
      const next = { ...state, rank: label, rankHistory: [...state.rankHistory, label] }
      return next.affiliation === 'Pirate' ? { ...next, pendingBountyReturnNode: hubIdFor(next) } : next
    },
    next: (state) => (state.affiliation === 'Pirate' ? 'bountyRoll' : hubIdFor(state)),
  },

  bountyRoll: {
    type: 'numberRoll',
    id: 'bountyRoll',
    category: 'Rank',
    question: 'What does the world put on your head?',
    icon: '💰',
    range: (state) => bountyRangeFor(state.rank),
    onSelect: (state, value) => ({ ...state, bountyAmount: value }),
    next: (state) => state.pendingBountyReturnNode ?? hubIdFor(state),
  },

  // ---- ending ---------------------------------------------------------------
  ending: {
    type: 'ending',
    id: 'ending',
  },
}

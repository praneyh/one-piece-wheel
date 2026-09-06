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
  DEVIL_FRUIT_DISPOSAL,
  DEVIL_FRUIT_MASTERY_LEVELS,
  DEVIL_FRUIT_TYPES,
  FIGHTING_STYLES,
  GENERIC_EVENT_REACTIONS,
  GROWTH_COUNT_OPTIONS,
  MAJOR_PIRATE_CREWS,
  MASTERY_LEVEL_ORDER,
  MASTERY_LEVELS,
  PIRATE_ROSTER,
  RACES,
  RIVAL_ROSTER,
  STAT_OPTIONS,
  STAT_TIER_OPTIONS,
  TACTIC_OPTIONS,
  WORLD_EVENT_REACTIONS,
  WORLD_EVENT_THREATS,
  bloodlineCheckOdds,
  bloodlineDef,
  bloodlineOptions,
  bumpMasteryLevel,
  crewSizeOptionsFor,
  crewStrengthOptionsFor,
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
  marineRosterOptions,
  meetsHakiFloor,
  npcOptions,
  opt,
  poneglyphFindOdds,
  raceAdjustedStatTierOptions,
  rankIncreaseOdds,
  rankLadderFor,
  rankPressureWeight,
  secondDevilFruitSurvivalOdds,
  survivalOdds,
  tacticBonus,
} from './gameData'

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

function allHakiMaxed(state: CharacterState): boolean {
  return HAKI_TYPES.every((t) => state.haki[t] === 'Advanced')
}

/** Shared "continue the growth batch, celebrate maxed Haki, or return" routing for both
 * growthStatTarget and growthHakiTarget. */
function growthLoopNext(state: CharacterState): string {
  if (state.pendingStatRolls > 0) return 'growthStatPick'
  if (allHakiMaxed(state)) return 'hakiRecapGrowth'
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

// World-event reactions that escalate into a full high-stakes encounter chain.
const RISKY_REACTIONS = new Set([
  'Join the Yonko',
  'Join the Marines',
  'Explore it immediately',
  'Claim it for your flag',
  'Seek it out',
  'Meet them head-on',
  'Set a trap',
  'Try to crash it',
  'Use the distraction to your advantage',
  'Help stranded sailors',
  'Loot the wreckage',
])

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

function applyAftermath(state: CharacterState, label: string): CharacterState {
  const foe = state.lastOpponent ?? 'an opponent'
  const withDefeat = { ...state, defeatedOpponents: [...state.defeatedOpponents, foe] }
  if (label === 'You end the fight permanently') {
    return { ...withDefeat, deceased: new Set(withDefeat.deceased).add(foe) }
  }
  return withDefeat
}

function lossConsequenceOptions(state: CharacterState): WheelOption[] {
  const base = [opt('You barely escape', 6, '#374151'), opt('Word spreads of your defeat', 2, '#7f1d1d')]
  if (state.crew.length > 0) base.splice(1, 0, opt('You lose an ally', 2, '#450a0a'))
  return base
}

function applyLossConsequence(state: CharacterState, label: string): CharacterState {
  if (label === 'You lose an ally' && state.crew.length > 0) {
    const idx = Math.floor(Math.random() * state.crew.length)
    const lost = state.crew[idx]
    const crew = state.crew.filter((_, i) => i !== idx)
    return { ...state, crew, deceased: new Set(state.deceased).add(lost.name) }
  }
  return state
}

const HAKI_PRESET_MAP: Record<string, Partial<Record<HakiType, HakiLevel>>> = {
  None: {},
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
  opt('None', 6, '#374151'),
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

function hakiRecapNode(id: string, next: string | ((state: CharacterState) => string)) {
  return {
    type: 'recap' as const,
    id,
    title: () => 'Haki Mastery!',
    body: () => 'You now have all 3 Haki types on the advanced level.',
    accent: 'pink' as const,
    next,
  }
}

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
      devilFruitMastery: DEVIL_FRUIT_MASTERY_LEVELS[0],
    }),
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
    next: 'haki',
  },

  // ---- haki -----------------------------------------------------------------
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
    next: (_state, label) => (label === 'All 3 Advanced' ? 'hakiRecapIntro' : 'initialRank'),
  },

  hakiRecapIntro: hakiRecapNode('hakiRecapIntro', 'initialRank'),
  hakiRecapGrowth: hakiRecapNode('hakiRecapGrowth', (state) => state.pendingReturnNode ?? hubIdFor(state)),

  // ---- starting rank ----------------------------------------------------
  initialRank: {
    type: 'wheel',
    id: 'initialRank',
    category: 'Rank',
    question: 'Where do you start?',
    icon: '🏴‍☠️',
    options: fullRankOptions,
    onSelect: (state, label) => ({ ...state, rank: label, rankHistory: [label] }),
    next: (state) => (state.affiliation === 'Pirate' ? 'crewOriginCheck' : hubIdFor(state)),
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
        opt('World Event', 1, '#374151'),
        opt('You meet other pirates on the seas', 9, '#dc2626'),
        opt('You gain more crewmates', 5, '#7f1d1d'),
        opt('Search for a Road Poneglyph', 6, '#be185d'),
        opt('Marines come after you', 9, '#2563eb'),
        opt('Train', 4, '#f59e0b'),
        opt('Learn a new fighting style', 3, '#0ea5e9'),
        opt('Find a Devil Fruit', 2, '#7c3aed'),
        opt('You discover ancient ruins', 3, '#78350f'),
        opt('A rival marks you for death', 3, '#450a0a'),
        opt('A legendary master offers to train you', 2, '#facc15'),
        opt('Word of your exploits spreads', 3, '#0d9488'),
      ]
      applyWorldEventBoost(state, options)
      if (state.weapon) options.push(opt('A blacksmith offers to reforge your weapon', 2, '#6b21a8'))
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
      if (label === 'Immortalize') return 'ending'
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
        opt('World Event', 1, '#374151'),
        opt('Pirates attack you', 8, '#dc2626'),
        opt('Hunt down a pirate crew', 6, '#7f1d1d'),
        opt('Recruit new subordinates', 5, '#1d4ed8'),
        opt('Investigate a Road Poneglyph lead', 4, '#be185d'),
        opt('Train', 4, '#f59e0b'),
        opt('Learn a new fighting style', 3, '#0ea5e9'),
        opt('Find a Devil Fruit', 2, '#7c3aed'),
        opt('You discover ancient ruins', 3, '#78350f'),
        opt('An old enemy resurfaces', 3, '#450a0a'),
        opt('A legendary master offers to train you', 2, '#facc15'),
        opt('Your service is recognized', 3, '#0d9488'),
      ]
      applyWorldEventBoost(state, options)
      if (state.weapon) options.push(opt('A blacksmith offers to reforge your weapon', 2, '#6b21a8'))
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
      if (label === 'Immortalize') return 'ending'
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
        opt('World Event', 1, '#374151'),
        opt('Liberate an island', 5, '#166534'),
        opt('Clash with the Marines', 8, '#2563eb'),
        opt('Recruit revolutionaries', 5, '#1d4ed8'),
        opt('Search for a Road Poneglyph', 5, '#be185d'),
        opt('Train', 4, '#f59e0b'),
        opt('Learn a new fighting style', 3, '#0ea5e9'),
        opt('Find a Devil Fruit', 2, '#7c3aed'),
        opt('You discover ancient ruins', 3, '#78350f'),
        opt('A traitor from within challenges you', 3, '#450a0a'),
        opt('A legendary master offers to train you', 2, '#facc15'),
        opt('Your cause gains sympathizers', 3, '#0d9488'),
      ]
      applyWorldEventBoost(state, options)
      if (state.weapon) options.push(opt('A blacksmith offers to reforge your weapon', 2, '#6b21a8'))
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
      if (label === 'Immortalize') return 'ending'
      // How you train is flavor only: either route lands on the same real growth roll.
      if (label === 'Train') return 'growthStronger'
      // A legendary master's teaching always pays off — no separate flavor step needed.
      if (label === 'A legendary master offers to train you') {
        return growableCount(state) > 0 ? 'growthStatCount' : hubIdFor(state)
      }
      const routes: Record<string, string> = {
        'World Event': 'worldEvent',
        // Freeing the island vs. retreating is flavor only — either way you're back at this hub.
        'Liberate an island': 'hubRevolutionary',
        'Clash with the Marines': 'marineEncounter',
        'Recruit revolutionaries': 'gainCrewmates',
        'Search for a Road Poneglyph': 'poneglyphMethod',
        'Learn a new fighting style': 'fightingStyleLearn',
        'Find a Devil Fruit': 'devilFruitEncounter',
        'You discover ancient ruins': 'ruinsExploration',
        'A traitor from within challenges you': 'rivalEncounter',
        'A blacksmith offers to reforge your weapon': 'weaponReforge',
        'Your cause gains sympathizers': 'reputationSpread',
        'Get promoted': 'rankJump',
      }
      return routes[label] ?? 'hubRevolutionary'
    },
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
    next: (state, label) => (RISKY_REACTIONS.has(label) ? 'worldEventDanger' : hubIdFor(state)),
  },

  // World events flagged risky escalate into a full high-stakes encounter: a serious threat,
  // a tactical choice, a win/lose roll, and — on a win — a big one-off reward, or on a loss,
  // a real chance the story ends here.
  worldEventDanger: {
    type: 'wheel',
    id: 'worldEventDanger',
    category: 'World Event',
    question: 'What do you face?',
    icon: '⚡',
    options: (state) => npcOptions(WORLD_EVENT_THREATS, state),
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
    question: 'How does it go?',
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
    next: (state, label) => (label === 'A Devil Fruit' && !state.devilFruit ? 'devilFruitFoundType' : 'rankIncreaseCheck'),
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
    onSelect: (state, label) => ({ ...applyLossConsequence(state, label), pendingReturnNode: hubIdFor(state) }),
    next: 'growthCheck',
  },

  // ---- meeting other pirates --------------------------------------------
  meetPirates: {
    type: 'wheel',
    id: 'meetPirates',
    category: 'Pirate Encounter',
    question: 'Who do you run into?',
    icon: '🏴‍☠️',
    options: (state) => npcOptions(PIRATE_ROSTER, state),
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
    next: (_state, label) => (label === 'Yes' ? 'assignCrewRole' : 'meetPiratesRecruitFail'),
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

  assignCrewRole: {
    type: 'wheel',
    id: 'assignCrewRole',
    question: "What's their specialty?",
    icon: '🧑‍🤝‍🧑',
    options: CREW_ROLES,
    onSelect: (state, label) => ({
      ...state,
      crew: [...state.crew, { name: state.lastMet ?? 'a new ally', role: label }],
    }),
    next: 'assignCrewRoleStrength',
  },

  assignCrewRoleStrength: {
    type: 'wheel',
    id: 'assignCrewRoleStrength',
    question: 'How do they compare to you?',
    icon: '💪',
    options: crewStrengthOptionsFor,
    onSelect: (state, label) => setLastCrewmateStrength(state, label),
    next: hubIdFor,
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
    next: (state) => (state.crew.length > 0 && state.crew.length % 3 === 0 ? 'crewRecap' : hubIdFor(state)),
  },

  crewRecap: {
    type: 'recap',
    id: 'crewRecap',
    title: (state) => `A Crew of ${state.crew.length}!`,
    body: (state) => `Your ranks now include: ${state.crew.map((c) => c.name).join(', ')}.`,
    accent: 'green',
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
      label === 'Steal from other Pirates' ? 'poneglyphTarget' : 'poneglyphSearchResult',
  },

  poneglyphTarget: {
    type: 'wheel',
    id: 'poneglyphTarget',
    category: 'Road Poneglyph',
    question: 'Who do you steal from?',
    icon: '🗿',
    options: (state) => npcOptions(PIRATE_ROSTER.filter((n) => n.minTier >= 3), state),
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
            pendingReturnNode: 'poneglyphRecap',
          }
        : state,
    next: (_state, label) => (label === 'Yes' ? 'rankIncreaseCheck' : 'poneglyphDeathRoll'),
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
    onSelect: (state, label) => ({ ...applyLossConsequence(state, label), pendingReturnNode: hubIdFor(state) }),
    next: 'growthCheck',
  },

  poneglyphSearchResult: {
    type: 'wheel',
    id: 'poneglyphSearchResult',
    category: 'Road Poneglyph',
    question: 'Is it actually there?',
    icon: '🗿',
    options: poneglyphFindOdds,
    onSelect: (state, label) => (label === 'Yes' ? withPoneglyph(state) : state),
    next: (state, label) => (label === 'Yes' ? 'poneglyphRecap' : hubIdFor(state)),
  },

  poneglyphRecap: {
    type: 'recap',
    id: 'poneglyphRecap',
    condition: (state) => state.poneglyphsCollected.size > 0,
    title: (state) =>
      state.poneglyphsCollected.size >= 4
        ? 'All Four Poneglyphs!'
        : `You now have ${state.poneglyphsCollected.size} of the 4 Road Poneglyphs!`,
    body: (state) => {
      const have = ALL_PONEGLYPHS.filter((p) => state.poneglyphsCollected.has(p)).map(
        (p) => PONEGLYPH_LABELS[p],
      )
      const missing = ALL_PONEGLYPHS.filter((p) => !state.poneglyphsCollected.has(p)).map(
        (p) => PONEGLYPH_LABELS[p],
      )
      if (missing.length === 0) {
        return `You have the ones from: ${have.join(', ')}. The road to Laugh Tale is complete.`
      }
      return `You have the ones from: ${have.join(', ')}.\n\nYou're now only missing the one with ${missing.join(', ')}.`
    },
    accent: 'green',
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
    options: (state) => marineRosterOptions(state),
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
    options: [
      opt('They retreat and report back', 5, '#334155'),
      opt('You capture them', 3, '#1d4ed8'),
      opt('You end the fight permanently', 2, '#450a0a'),
    ],
    onSelect: (state, label) => ({ ...applyAftermath(state, label), pendingReturnNode: hubIdFor(state) }),
    next: 'rankIncreaseCheck',
  },

  marineLossConsequence: {
    type: 'wheel',
    id: 'marineLossConsequence',
    question: "What's the cost?",
    icon: '💥',
    options: lossConsequenceOptions,
    onSelect: (state, label) => ({ ...applyLossConsequence(state, label), pendingReturnNode: hubIdFor(state) }),
    next: 'growthCheck',
  },

  // ---- fighting pirates (Marine faction) ---------------------------------
  pirateFightRoster: {
    type: 'wheel',
    id: 'pirateFightRoster',
    category: 'Pirates',
    question: 'Who do you face?',
    icon: '🏴‍☠️',
    options: (state) => npcOptions(PIRATE_ROSTER, state),
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
    options: [
      opt('They scatter and flee', 5, '#334155'),
      opt('You capture their captain', 3, '#1d4ed8'),
      opt('You end the fight permanently', 2, '#450a0a'),
    ],
    onSelect: (state, label) => ({ ...applyAftermath(state, label), pendingReturnNode: hubIdFor(state) }),
    next: 'rankIncreaseCheck',
  },

  pirateFightLossConsequence: {
    type: 'wheel',
    id: 'pirateFightLossConsequence',
    question: "What's the cost?",
    icon: '💥',
    options: lossConsequenceOptions,
    onSelect: (state, label) => ({ ...applyLossConsequence(state, label), pendingReturnNode: hubIdFor(state) }),
    next: 'growthCheck',
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
    onSelect: (state, label) => ({ ...state, rank: label, rankHistory: [...state.rankHistory, label] }),
    next: growthCheckIdFor,
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
        'A hidden Devil Fruit': 'devilFruitFoundType',
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
    options: (state) => npcOptions(RIVAL_ROSTER, state),
    onSelect: (state, label) => ({ ...state, lastOpponent: label }),
    next: 'marineTactic',
  },

  weaponReforge: {
    type: 'wheel',
    id: 'weaponReforge',
    category: 'Gear',
    question: 'A blacksmith offers to reforge your weapon. What do they improve?',
    icon: '🗡️',
    options: [opt('Power', 5, '#dc2626'), opt('Durability', 5, '#f59e0b')],
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
        !picked.has('Fighting Style Mastery') &&
        MASTERY_LEVEL_ORDER.indexOf(state.fightingMastery ?? '') < MASTERY_LEVEL_ORDER.length - 1
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
    next: (_state, label) => {
      if (label.endsWith('Haki')) return 'growthHakiTarget'
      if (label === 'Fighting Style Mastery') return 'growthMasteryTarget'
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

  growthMasteryTarget: {
    type: 'wheel',
    id: 'growthMasteryTarget',
    question: 'What level do you reach?',
    icon: '📈',
    options: (state) => higherMasteryOptions(state.fightingMastery ?? MASTERY_LEVEL_ORDER[0]),
    onSelect: (state, label) => ({
      ...state,
      fightingMastery: label,
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
    options: [opt('Yes', 5, '#7c3aed'), opt('No, it slips away', 5, '#374151')],
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

  devilFruitFoundSpecific: {
    type: 'wheel',
    id: 'devilFruitFoundSpecific',
    category: 'Devil Fruit',
    question: 'Which one?',
    icon: '🍈',
    options: (state) => fruitListForType(state.pendingDevilFruitType ?? 'Paramecia'),
    onSelect: (state, label) => ({ ...state, pendingFoundFruit: label }),
    next: 'devilFruitDisposal',
  },

  devilFruitDisposal: {
    type: 'wheel',
    id: 'devilFruitDisposal',
    category: 'Devil Fruit',
    question: 'What do you do with it?',
    icon: '🍈',
    options: DEVIL_FRUIT_DISPOSAL,
    onSelect: (state, label) => {
      if (label === 'Eat it') {
        if (state.devilFruit) {
          // Already carrying one fruit's power — whether a second one is survivable at all is
          // decided by the wheel next, not here.
          return { ...state, pendingSecondFruit: true }
        }
        return {
          ...state,
          devilFruit: state.pendingFoundFruit,
          devilFruitType: state.pendingDevilFruitType,
          devilFruitMastery: DEVIL_FRUIT_MASTERY_LEVELS[0],
          pendingSecondFruit: false,
        }
      }
      if (label === 'Feed it to a weapon') {
        return { ...state, weaponHasDevilFruit: true, pendingSecondFruit: false }
      }
      return { ...state, pendingSecondFruit: false }
    },
    next: (state, label) => (label === 'Eat it' && state.pendingSecondFruit ? 'secondDevilFruitSurvival' : hubIdFor(state)),
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
        return {
          ...state,
          secondDevilFruit: state.pendingFoundFruit,
          secondDevilFruitType: state.pendingDevilFruitType,
          secondDevilFruitMastery: DEVIL_FRUIT_MASTERY_LEVELS[0],
          pendingSecondFruit: false,
        }
      }
      return {
        ...state,
        pendingSecondFruit: false,
        causeOfDeath: `You already carried the power of the ${state.devilFruit}. Eating the ${state.pendingFoundFruit} on top of it tore your body apart from the inside — one in a million bodies could have withstood it, and yours wasn't one of them.`,
      }
    },
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
    onSelect: (state, label) => ({ ...state, rank: label, rankHistory: [...state.rankHistory, label] }),
    next: hubIdFor,
  },

  // ---- ending ---------------------------------------------------------------
  ending: {
    type: 'ending',
    id: 'ending',
  },
}

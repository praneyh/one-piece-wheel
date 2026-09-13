# One Piece Wheel — Project Reference

A single-page React app that generates a random One Piece character backstory via a
casino-style spinning wheel walked through a long branching story graph — "what kind of
pirate/marine/revolutionary would you become." No backend; deployed statically to GitHub Pages.
The one piece of persistence is `localStorage`-backed: characters who choose the "Immortalize"
ending are saved on-device and can be encountered as opponents in future runs — see
"Immortalized characters" below. Everything else (the current run's `CharacterState`) lives only
in the in-memory Zustand store and resets on refresh/restart.

Page `<title>`: "One Piece Character Generator". Repo/base path: `one-piece-wheel`.

## Tech stack

- **React 19 + TypeScript + Vite 8**, **Tailwind CSS v4** (via `@tailwindcss/vite`), state via
  **Zustand 5**. `framer-motion` is a dependency but the wheel itself is hand-rolled SVG + CSS
  transitions, not framer-motion.
- Linted with `oxlint` (`.oxlintrc.json`). `npm run build` = `tsc -b && vite build`.
- `vite.config.ts` sets `base: '/one-piece-wheel/'` — required for the GitHub Pages subpath;
  changing the repo name means updating this.
- **Deploy**: `.github/workflows/deploy.yml` builds and publishes `dist/` to GitHub Pages on
  every push to `main` (via `actions/deploy-pages`). No manual deploy step needed — merging to
  main ships it.
- Font: Cinzel (Google Fonts, loaded in `index.html`) — used as the "display" font
  (`font-display` Tailwind utility class) for headings/results throughout.

## Repo oddity

`SnapTik-dot-Kim-f2218bfa6a93c77d88078da139ff508a.mp4` (~25MB) sits tracked in the repo root,
named after a TikTok-downloader site. Nothing in the app references it — it appears to be an
accidental commit bloating the repo. Flag before removing (destructive git history edit needed
to actually shrink the repo, not just delete-going-forward).

## Architecture

Five source files carry the app: `types.ts` (data model), `store.ts` (Zustand state + the two
ways to advance it), `data/gameData.ts` (rules/odds/rosters), `data/storyGraph.ts` (the node
graph), `data/immortals.ts` (the one persistence layer — see "Immortalized characters" below).

### Data flow
`src/store.ts` (Zustand) is the only source of mutable app state: `currentNodeId`, `character`
(a `CharacterState`), and `visitId`. `visitId` increments on **every** navigation, including a
node routing back to itself — `App.tsx` keys each screen component on
`` `${currentNodeId}:${visitId}` `` rather than `currentNodeId` alone, specifically so React
always mounts a fresh instance. Without this, revisiting the same node id back-to-back (e.g. a
hub option that's flavor-only and returns to the same hub) would reuse the old component
instance with its "already resolved" local state still set, freezing the UI.

`applySelection(nodeId, label, option)` in the store: appends to `eventLog`, runs the node's
`onSelect` if present, then checks `nextState.causeOfDeath` — if set, routes straight to
`'ending'` regardless of what the node's own `next` would say (death always overrides).
Otherwise resolves `next` (string or function of state+label).

### Node types (`src/types.ts`)
`StoryGraph = Record<string, StoryNode>`, where `StoryNode` is a union:
- **`wheel`** — the main type. `options` is either a static `WheelOption[]` or a function of
  `CharacterState` (most interesting ones are functions, since they need to reweight/filter
  based on race, bloodline, rank, alive/dead NPCs, etc.). `onSelect` mutates state on landing.
  `next` resolves the following node id.
- **`ending`** — terminal screen, no further navigation except the restart button.
- **`nameInput`** — the app's one free-text screen, used only to name a character being
  immortalized (`immortalizeNamePrompt`; see "Immortalized characters" below). No `options`/
  `onSelect` — advances via a dedicated store action (`submitImmortalName`), not
  `applySelection`, since there's no wheel option being picked.

There used to be a third node type, `recap` — a full-screen "achievement" interstitial (crew
size milestones, all-Haki-maxed, Poneglyph count) that auto-advanced after 3.2s or on tap. It
was deliberately removed (along with `RecapNode`, `RecapScreen.tsx`, and the recap-handling
branches in `App.tsx`) — the game no longer shows any popup/interstitial screens between wheel
spins. **Don't reintroduce a recap-style interstitial** without an explicit ask.

`resolveOptions(node, state)` is the one place that calls `node.options` whether it's static or
a function — always go through this helper rather than accessing `node.options` directly.

### Components (`src/components/`)
- **`WeightedWheel.tsx`** — the actual wheel, an SVG pie chart in a `0 0 200 200` viewBox.
  - `weightedPick(options)`: standard cumulative-weight random pick.
  - `wedgeGeometry(options)`: turns weights into `start`/`end`/`mid` degree angles.
  - The spin **does not land dead-center** on the winning wedge — `spin()` computes a random
    `landingAngle` within the wedge (inset slightly from the boundaries) so it looks like a real
    physical spin, not a rigged teleport.
  - `extraSpins = 5 + random(0,1)` full rotations layered on top before landing, for visual
    suspense; duration is `SPIN_DURATION_MS = 2600`ms with a custom cubic-bezier easing.
  - Font sizing is the trickiest part: each label's font size is
    `min(spanFontSize(wedgeAngle), lengthFontSize(labelLength))`, clamped to `[MIN_FONT=3,
    MAX_FONT=8]`. `spanFontSize` keeps text from bleeding into neighboring wedges;
    `lengthFontSize` keeps a long label from bleeding past the wheel's radial safe zone
    (`LABEL_R=55`, between `HUB_KEEPOUT_R=24` and `OUTER_KEEPOUT_R=90`). If a label is still too
    wide at the font floor, `textLength`/`lengthAdjust="spacing"` compresses letter-spacing as a
    last resort — glyphs are never stretched/squished.
  - `onLand` fires from `handleTransitionEnd` (i.e. actual CSS transition completion, not a
    timer) — keep it that way; a timer-based approach would drift from the visual landing.
- **`QuestionScreen.tsx`** — thin wrapper: shows question text + `node.icon`, delays calling
  `onResolved` by 1300ms after landing so the player can read the result and `flavorText` before
  advancing.
- **`NameInputScreen.tsx`** — the one free-text screen (`node.type === 'nameInput'`). Controlled
  `<input>`, trimmed + non-empty validation, `maxLength` from the node (24 for
  `immortalizeNamePrompt` — comfortably inside `WeightedWheel`'s ~37-char font floor, since this
  name will later render as a wedge label). Calls `onSubmit(name)`, wired in `App.tsx` to the
  store's `submitImmortalName`, not `applySelection`.
- **`EndingScreen.tsx`** — three "win" states keyed by `character.affiliation` (Pirate → "King of
  the Pirates", Marine → "Fleet Admiral", Revolutionary → "Commander-in-Chief"), plus a death
  screen (`causeOfDeath` set) and an "Immortalized" screen (`immortalized` set) — checked in that
  priority order (death > immortalized > win). The immortalized branch personalizes its flavor
  text with `character.immortalName` when set. Shows a full stat recap + restart button.
- **`StatsPanel.tsx`** — slide-out drawer (📊 button, top-right, present on every non-ending
  screen), viewable at any time mid-run. Stat bars use `statTierIndex(key, value) / (ladder
  length - 1)` for the fill percentage.
- **`ImmortalsPanel.tsx`** — same slide-out-drawer shell as `StatsPanel` (🗿 button, sits next to
  it), but shows every persisted `ImmortalizedRecord` (`loadImmortals()`, called fresh in the
  render body — no caching, cheap enough, and re-renders naturally whenever `App.tsx` does)
  rather than the live character. Each card shows name, race/bloodline/rank, the four core
  stats, Haki, mastery, and an accent bar in the record's own `color`.

## `src/types.ts` — the data model

`CharacterState` is one big mutable-in-spirit-but-actually-always-copied object. Notable fields
and *why* they exist (most are self-explanatory from the name):
- `raceComponents?: [string, string]` — only set for a Hybrid character; both component races'
  stat mods apply (see `raceModFor` in gameData.ts). A non-Hybrid character's mods come from
  looking up `race` directly.
- `recruited: Set<string>` vs `deceased: Set<string>` — both exclude an NPC from future opponent
  pools (`isAvailable()` in gameData.ts checks both), but for different reasons: you can't fight
  someone who already sails with you, same as you can't fight someone already dead.
- `hubSpinCount` — counts "What's next?" hub-wheel spins specifically (not every wheel spin in
  the game). Gates and grows the odds of the `Immortalize` ending option appearing (see
  `immortalizeOption`, min 10 spins, then +0.5 weight per spin after).
- `pendingReturnNode` — where a shared post-fight sequence (rank check → growth check) should
  route back to once it resolves, since those two nodes are reused by every combat branch across
  all three affiliations rather than duplicated per-branch.
- `pendingMasteryStyle` — set by `growthMasteryStylePick` when a "Fighting Style Mastery" growth
  pick has more than one known style to choose between (primary `fightingStyle` +
  `additionalStyles`); `growthMasteryTarget` reads it (falling back to the primary style when
  unset) to know which style's mastery to roll and update.
- `pendingEventRarityWeight` — carries the *triggering hub option's own wheel weight* into a
  non-combat growth check, so a rarer-to-land-on experience produces better growth odds
  (`growthOddsGeneric`) than a routine one.
- `pendingSecondFruit` — true only while resolving the "eat a second Devil Fruit" survival wheel.
  Needed because `onSelect` sets `devilFruit` for *both* a first-time bite and a second-fruit
  bite by the time `next` inspects post-`onSelect` state, so this flag is the only way to tell
  which case is active.
- `immortalName` — permanent (not "pending"), set once by `submitImmortalName` when a character
  is immortalized; read by `EndingScreen` to personalize the ending.
- `pendingImmortalReplaceName` — only set while resolving the "hall is full" gauntlet fight (see
  "Immortalized characters" below); carries the name of the existing legend who'll be deleted and
  replaced if the gauntlet is won.
- Four core stats live on separate tier ladders in `types.ts`:
  - `POWER_TIERS` / `DURABILITY_TIERS` (same 14-rung ladder, Normal Human → Universal Level)
  - `SPEED_TIERS` (13 rungs, Normal Human → Infinite Speed, includes FTL)
  - `ENDURANCE_TIERS` (10 rungs, Below Average → Absolute)
  - `bumpStatTier(key, currentLabel, amount)` shifts by N tiers, clamped at both ends — this is
    how race/bloodline stat mods are applied as guaranteed floors on the wheel itself (see below)
    rather than as an after-the-fact adjustment.

## `src/data/gameData.ts` — rules, odds, and rosters (~2100 lines)

`opt(label, weight, color, flavorText?)` is the universal `WheelOption` builder used everywhere.

### Races (14, `RACES` array)
Each has a `weight` (rarity on the race wheel) and `mods: Partial<Record<StatKey, number>>`
(tier shift, can be negative). Human is the 40-weight baseline with no mods. Standouts:
Fish-Man (+2 Power/+1 Endurance), Mink (+2 Speed/+1 Power), Giant (+3 Power/+3 Durability/-2
Speed), Cyborg (+3 Durability/+1 Power), Seraphim (+3 Power/+2 Durability/+2 Speed, rarest
non-Hybrid at weight 3), Tontatta (+3 Speed/-2 Power), Celestial Dragon (+1 to everything, rarest
at weight 1). **Hybrid** (weight 4) has no mods of its own — picking it routes to two extra
spins (`raceHybrid1` → `raceHybrid2`, excluding Hybrid itself from those two sub-wheels) whose
combined mods both apply via `raceComponents`.

**Important mechanic**: `raceAdjustedStatTierOptions(state, key)` pre-shifts every wedge label
on the stat-tier wheel by the race+bloodline mod *before* the wheel is ever shown, merging wedges
that land on the same resulting tier (e.g. two wedges that both shift onto the ladder's top rung
merge their weights into one slice) rather than rolling unshifted and adjusting after. This means
a positive race bonus is a true guaranteed floor — the wheel can never visually land on a result
below what the bonus should guarantee, and the on-screen spin always matches the final value.

### Bloodlines (12, `BLOODLINES` array — ~7-20% chance via `bloodlineCheckOdds()` fixed 20/80)
Each grants one qualitatively distinct mechanical edge (never just "more stats"):
| Bloodline | Weight | Effect |
|---|---|---|
| Monkey D. Family | 3 | +1 Power tier; World Event hub-option weight ×3 |
| Gol D. Roger's Bloodline | 1 (rarest) | Guaranteed Conqueror's Haki (Basic floor); +6 growth-odds bonus |
| Kozuki Family | 3 | Guaranteed Armament Haki (Basic floor); starting fighting mastery +1 tier |
| Vinsmoke Family (Germa 66) | 2 | +1 Power, +1 Durability |
| Charlotte Family | 3 | Crew size bias +2, crew strength bias +1 |
| Nico Family | 3 | +4 Poneglyph-find-odds bonus |
| Donquixote Family | 2 | +3 to starting-Devil-Fruit "Yes" chance |
| Shimotsuki Family | 2 | Swordsmanship heavily favored; starting mastery +1 tier |
| Kuja Tribe | 3 | +2 Speed tiers |
| Fisher Tiger's Legacy | 3 | +1 Durability, +1 Endurance |
| Rocks D. Xebec's Bloodline | 1 (rarest) | +10 growth-odds bonus (largest in the game) |
| Nefertari Family | 3 | +5 rank/bounty-increase-odds bonus |

`bloodlineDef(state)` is the lookup used everywhere else to pull these bonuses in. A bloodline's
`statMods` stack on top of race mods in the same guaranteed-floor stat-wheel mechanism above
(`bloodlineModFor` adds into the same `mod` as `raceModFor`).

### Overall strength score (`overallStrengthFromProfile`, 1-100)
Used for growth/rank/crew-strength math (not combat — see below). Weighted blend:
**stats 45%, Haki 25%, fighting mastery 15%, Devil Fruit mastery 15%** (second-fruit mastery
stacks additively on top of the first, capped at the same ceiling a single maxed fruit would
hit — surviving a second bite is supposed to make you stronger, not dilute the first). Each axis
is normalized 0-1 by its own ladder position first. `playerOverallStrength(state)` builds this
from live character state.

### Combat math (`combatEdge`, `fightOddsOptions`, etc.) — the core simulation
**Deliberately does not use the 1-100 blended score.** Averaging stats would hide exactly the
kind of mismatch that should decide a fight (e.g. Universal-Level durability vs. a Town-Level
attacker should be a non-fight, no matter how the attacker's other stats average out). Instead:

1. `combatProfileFrom(profile)` extracts raw tier *indices* (not the 1-100 score) for
   power/speed/durability/endurance, plus `hakiSum` (0-6), `masteryIdx` (0-5), `dfMasteryIdx`
   (0-5, both fruits summed).
2. `expTier(idx) = 1.35^idx` — each successive tier is worth more than the last (a gap near the
   top of a ladder, e.g. Planet vs. Star Level, swings a fight far more than the same 1-tier gap
   near the bottom, e.g. Wall vs. Building Level — matching how canon power gaps actually play
   out).
3. `combatEdge(state, opponentName)` = signed score, positive favors the player:
   - `physicalEdge` = (my Power vs their Durability) − (their Power vs my Durability), i.e. "can
     I hurt them" minus "can they hurt me" — **this is the dominant term**, not a symmetric
     power-vs-power comparison.
   - `+ speedEdge` (weight 0.5) `+ enduranceEdge` (weight 0.3) `+ hakiEdge + masteryEdge +
     dfEdge + crewEdge`.
   - `crewEdge` = my total crew-backup bonus (capped `MAX_CREW_EDGE=25`, built from recruited
     crewmates capped 2 each, an own starting crew scaled by size×strength-tier, and/or an
     existing canon crew's rated strength) minus the opponent's flat `hasCrew` bonus (3, if
     they're a known captain/leader).
4. `logisticWeight(edge, FIGHT_EDGE_SCALE=8)` maps the signed edge through a logistic curve to a
   1-99% weight for the "Yes I win" wheel option — steep enough that a genuinely decisive tier
   gap lands in the 90s+, near-even matchups stay close to 50/50.
5. A pre-fight **tactic** (`TACTIC_OPTIONS`: Frontal assault +0, Ambush +6, Use Devil Fruit +10,
   Call for backup +4) adds a flat `pendingTacticBonus` into the edge before the win/lose roll.

This same `combatEdge`/profile machinery also drives `growthOdds` (harder fights teach you
more — `difficulty = -combatEdge`, scaled ×1.5 into the "Yes, you grew" weight) and
`survivalOdds` after a loss (driven by `difficulty×2 + lethality×12 + extraRisk×8`, where
`lethality` is a fixed 0-3 rating per NPC). **`rankIncreaseOdds` deliberately does NOT use
`combatEdge`** — see "Rank/bounty increase odds" below.

### Rank/bounty increase odds (`rankIncreaseOdds`) — driven by opponent *importance relative to your own rank*, not difficulty
Every `NpcDef` carries a `notoriety: number` field (0-10) alongside its `StrengthProfile` —
how significant/famous that character is in the wider One Piece world (an Emperor, a Fleet
Admiral, a Five Elder vs. an anonymous mook), entirely independent of how strong they actually
are to fight. `npcNotoriety(name)` looks it up (defaulting to 1 for an unrecognized name). This
is the one piece of post-fight math that intentionally ignores `combatEdge` — the world reacts
to *who* you beat, not how close the fight secretly was.

Absolute notoriety alone isn't enough, though: beating a moderately-famous name (say, Foxy,
notoriety 3) should matter a lot for a brand-new Ensign but barely register for someone already
Yonko-tier — so `rankIncreaseOdds` compares the opponent's notoriety to what's already
*expected* at the player's current rank:
- `expectedNotoriety = (tierIndex(state) / 7) × 10` — linearly maps the player's rank tier
  (`tierIndex`, 0-7) onto the same 0-10 notoriety scale. A brand-new character is expected to be
  fighting nobodies (~0); a max-rank character is expected to already be trading blows with
  Yonko-caliber names (~10).
- `relativeGap = notoriety − expectedNotoriety`.
- `yesWeight = clamp(1, 99, logisticWeight(relativeGap, RANK_NOTORIETY_EDGE_SCALE=4) + bloodlineBonus)`,
  reusing the same `logisticWeight` curve the combat math uses elsewhere. `relativeGap = 0` (an
  opponent exactly as famous as expected for your rank) is a 50/50 coinflip; positive swings
  quickly toward "Yes", negative quickly toward "No".

Worked examples (matching the design intent): an Ensign (tierIndex 2, expected ≈2.9) who beats
Big Mom (notoriety 10, gap ≈7.1) lands ~98%. A brand-new pirate (tierIndex 0, expected 0) who
beats Foxy (notoriety 3, gap 3) still lands ~85% — a genuinely big deal at that rank, even
though Foxy is nowhere near Emperor-tier fame. A Yonko-tier legend (tierIndex 7, expected 10)
stomping that same Foxy (gap −7) lands ~2% — beneath what's already expected of them.

Notoriety values are hand-assigned per NPC across all 8 rosters (Marine tiers 1-5, Pirate
roster, World Event threats, Rival roster) — see the NPC roster section below for the rough
rubric used.

Growth outside combat (`growthOddsGeneric`) instead scales off `rarityWeight` — the *triggering
hub option's own wheel weight* — so a rare event (small weight) produces better odds than a
common one (large weight): `85 - rarityWeight×8`, floored at 15%, ceiling 95%.

### Devil Fruits
5 types on `DEVIL_FRUIT_TYPES` (Paramecia 50, Zoan 25, Logia 15, Ancient Zoan 7, Mythical Zoan 3
— realistic canon rarity ordering). Each type has its own real-name fruit pool
(`PARAMECIA_FRUITS`, `LOGIA_FRUITS`, etc.) — canon fruits like Gomu Gomu, Mera Mera, Ope Ope,
Gura Gura, Hito Hito no Mi (Nika/Onyudo), Uo Uo no Mi (Seiryu), Tori Tori no Mi (Phoenix). Rarest
canon fruits (Gomu Gomu, Nikyu Nikyu, Ope Ope, Gura Gura, all Mythical Zoans) are weighted 1
inside their pool.

Mastery ladder: `Untrained → Basic Understanding → Practical Use → Skilled Control → Mastered →
Awakened` (6 rungs). Disposal options if you find a fruit you don't want: Eat it (6, or reduced
to 1 if you already have a fruit — a second bite is nearly always fatal), Throw it away (2), Sell
it (3), Feed it to a weapon (1) — the last one sets `weaponHasDevilFruit`.

`devilFruitEncounter` (a mid-run hub side-quest, not the starting-fruit roll) is a fixed 65%
Yes / 35% "No, it slips away" — finding one at all is common, but not guaranteed.

**Second Devil Fruit**: `secondDevilFruitSurvivalOdds()` is a hardcoded 2% Survive / 98% Die,
independent of the character's own stats — canon has never shown a survivor, so this isn't
modeled as "beatable with high enough Endurance," it's a fixed fluke chance. The rare survivor's
second fruit stacks additively with the first in both the strength score and combat math (see
above), and `growableDevilFruitSlot(state)` always targets whichever of the two fruits currently
lags in mastery for future growth picks, so neither one is permanently neglected.

### Fighting styles & mastery
16 styles on `FIGHTING_STYLES` (Swordsmanship, Rokushiki, Fish-Man Karate, Electro Combat, etc.).
Mastery ladder: `Novice → Competent → Skilled → Expert → Master → Grandmaster` (6 rungs, same
shape/weighting curve as stat tiers — common at the bottom, rare at the top).

### Rank ladders (affiliation-specific, `RANK_LADDERS`)
- **Pirate** = `BOUNTY_TIERS`, 8 bands from `100-99,999` to `1B-2B`... note the array actually
  tops out at `2B-5B` (8 entries) — bounty, not literal rank titles.
- **Marine** = `MARINE_RANKS`, 13 titles, Chore Boy → Fleet Admiral.
- **Revolutionary** = `REVOLUTIONARY_RANKS`, 7 titles, Sympathizer → Army Commander-in-Chief.

`rankPressureWeight(state, baseWeight)` is what makes rank progression feel earned rather than
random: it maps the player's `playerOverallStrength` (1-100) onto an "expected" position on their
own rank ladder, compares it to their `actual` position, and inflates/deflates the "Get a new
bounty"/"Get promoted" hub-option weight by the gap ×1.2, **plus** a flat
`poneglyphsCollected.size × PONEGLYPH_RANK_PRESSURE_BONUS_PER (1.5)` bonus — carrying Road
Poneglyphs raises your profile regardless of how your stats compare to your rank — all clamped
to 1-15. A character whose stats have outpaced their official rank, or who's been quietly
stacking Poneglyphs, sees that option much more often.

`marineTierForRank(state)` partitions the player's rank position into hard fifths (1-5) — this is
what selects *which* of the 5 Marine rosters below shows up as an opponent pool; there's no
separate "difficulty" spin, the rank itself gates it, and only a maxed-out bounty ever draws from
tier 5.

### NPC rosters (`ALL_NPCS` = Marine tiers 1-5 + Pirate roster + World Event threats + Rival
roster), ~60 hand-assessed canon characters
Built via the compact `profile(power, speed, durability, endurance, haki, masteryIdx,
dfMasteryIdx?)` helper — tier *indices* into the shared ladders, not labels, with commentary
explaining canon reasoning inline for the less obvious placements. NPC power/speed/endurance are
deliberately capped below the ladders' true top rungs (`NPC_POWER_DURABILITY_MAX_IDX` = ladder
length −1−4, `NPC_SPEED_MAX_IDX` = −1−2, `NPC_ENDURANCE_MAX_IDX` = −1−1) — the very top tiers
(Moon Level+, FTL+, Absolute) are reachable **only** by the player's own stat rolls, so no canon
NPC can ever out-cap what the player could theoretically become. Max any NPC could reach if every
axis sat at its cap is ~90/100 overall strength.
- **Marine tiers 1-5** (`MARINE_ROSTERS`), selected purely by `marineTierForRank` (no separate
  spin): Tier 1 = Helmeppo/Fullbody/Jango-level fodder; Tier 5 = Garp, Kuzan, Issho, Borsalino
  (the one NPC who reaches the Speed-of-light-ish ceiling — matches his own canon gimmick),
  Sakazuki (ties for the overall power ceiling alongside Kaido/Big Mom/Blackbeard/Shanks).
- **Pirate roster** (`PIRATE_ROSTER`) — gated by `npcOptions()`'s continuous tier-distance
  reweighting (`ENCOUNTER_TIER_DECAY = 0.45` per tier of distance from the player's own tier;
  nobody's ever fully excluded, just steadily rarer the further the mismatch). Top end: Kaido and
  Charlotte Linlin tied at the power ceiling.
- **World Event threats** (`WORLD_EVENT_THREATS`) — includes the Five Elders (Saturn, Mars,
  Warcury, Nusjuro, Ju Peng), the Knights of God (Figarland Shamrock, Manmayer Gunko, Shepherd
  Sommers, Rimoshifu Killingham — all immortal), and Imu / Garling Figarland at the very top
  (deliberately given no confirmed Devil Fruit mastery, matching how canon has kept their combat
  feats off-screen).
- **Rival roster** (`RIVAL_ROSTER`) — recurring "a rival marks you for death" antagonists:
  Arlong, Bellamy, Caesar Clown, Capone Bege, Crocodile, Gecko Moria, Doflamingo, Blackbeard
  (ties the power ceiling), Shanks (top tier despite no Devil Fruit — leans entirely on
  stats/Haki/mastery), plus at least one Elbaf Giant antagonist.

**Every opponent lookup (`npcCombatProfile`, `npcStrength`, `npcLethality`, `npcNotoriety`) goes
through a shared `findNpc(name)`**: `ALL_NPCS.find(...)` first, falling back to
`findImmortalNpcDef(name)` from `src/data/immortals.ts` — this is what lets a persisted
immortalized character flow through every existing combat/growth/rank formula with zero changes
to that math. See "Immortalized characters" below for the full system.

`isAvailable(state, name)` excludes `deceased` and `recruited` names from every roster, and —
via `CREW_ORIGIN_SELF_ENTRIES` — also excludes any roster entry that represents the player's own
starting crew (`crewOrigin`, set from `MAJOR_PIRATE_CREWS`) when they began the run as part of
an existing named crew: you can't be sent to hunt down, get marked for death by, or otherwise
run into your own captain/crew as a threat. Only crews with a matching named NPC entry in the
rosters need an entry in that map (e.g. `'Beast Pirates' → ['A Beast Pirates Commander',
'Kaido']`, `'Blackbeard Pirates' → ["Blackbeard's Crew", 'Marshall D. Teach "Blackbeard"']`) —
crews with no roster presence (Straw Hat Pirates, Roger Pirates, Whitebeard Pirates, etc.) need
nothing added. An
NPC's `hasCrew: true` flag adds a flat `+3` combat-edge bonus for the opponent (`OPPONENT_CREW_
EDGE_BONUS`) representing their own backup — set on captains/leaders, not lone individuals.

Every NPC also carries `notoriety: 0-10` (see "Rank/bounty increase odds" above) — rough rubric
used when hand-assigning it: 0-1 = anonymous mook/generic group/impersonal threat (a storm, a
Sea King), 2-3 = minor named character with local-only reputation, 4-5 = recognizable
officer/rookie-tier name, 6-7 = famous Vice Admiral/Admiral/Supernova/former-Warlord-adjacent
figure, 8-9 = legendary named individual (Garp, Sengoku, Crocodile, Doflamingo) or a Five Elder,
10 = Yonko-tier/Fleet-Admiral-tier/absolute-world-authority (Kaido, Big Mom, Blackbeard, Shanks,
Sakazuki, Imu, Garling Figarland). This is a *separate* rating from combat strength — e.g. Shanks
and an anonymous "Big Mom Pirates Commander" can be worlds apart in notoriety despite being
closer in raw fight difficulty.

### Crew mechanics (Pirate-relevant, but structurally shared)
`MAJOR_PIRATE_CREWS` — 18 canon crews you can start already part of (`crewOriginType`), each
weighted for rarity. `EXISTING_CREW_STRENGTH` hand-rates each 1-88 (Alvida Pirates weakest at 8,
Rocks Pirates strongest at 88, Straw Hats mid-pack at 60) — deliberately never near 100, since no
individual character (and therefore no crew built from them) reaches the true ladder ceiling. Or
you can start with **your own** crew (`crewOriginCheck` → size 1-10 via `CREW_SIZE_OPTIONS`,
average strength via `CREW_STRENGTH_OPTIONS` relative to you, peaking one notch below "Equal"
since a captain is typically the strongest aboard). A bloodline's `crewSizeBias`/`crewStrengthBias`
nudge both wheels toward the higher end via `biasLadderOptions` (shifts the whole weight curve by
N positions rather than just adding a flat bonus, preserving its shape). The same crew-strength
wheel is reused for every individually recruited crewmate later in the run.

### Road Poneglyph search locations
A passive "Search for them" (as opposed to stealing one off another pirate) first rolls a
`poneglyphSearchLocation` wheel (`PONEGLYPH_SEARCH_LOCATIONS`, gameData.ts) — 8 flavor locations
from a dockside rumor to a Celestial Dragon's private vault — before the actual find roll.
Each location has a hand-tuned `PONEGLYPH_LOCATION_MODIFIER` (looked up via
`poneglyphLocationModifier(label)`) added directly into `poneglyphFindOdds`'s base "Yes" weight
(out of 10): promising-but-dangerous/restricted leads (Celestial Dragon's vault, World
Government archives) are both rarer to land on *and* carry the biggest positive modifier (+4);
cheap talk (a dockside tavern rumor, "a local legend") is common to land on but carries a
negative modifier. The chosen location is stashed in `pendingPoneglyphLocation` between the two
wheels and cleared again in `poneglyphSearchResult`'s `onSelect`.

### Immortalized characters — local persistence (`src/data/immortals.ts`)
Choosing `Immortalize` on a hub wheel used to just be a flavor ending. Now it permanently saves
the character to `localStorage` on that device (key `one-piece-wheel:immortals`) as an
`ImmortalizedRecord`, so it survives refreshes and can be encountered as an opponent in *future*
runs — a Marine shows up in Marine-facing pools, a Pirate in Pirate-facing pools, a Revolutionary
via a dedicated new encounter plus the shared rival pool. This is the **only** persistence in the
app — everything else lives in the in-memory Zustand store and resets on `restart()`.

**`ImmortalizedRecord`** freezes everything the fight-math system needs at the moment of
immortalization: `profile: StrengthProfile` (picked directly off the live character's
`stats`/`haki`/`fightingMastery`/`devilFruitMastery`/`secondDevilFruitMastery` — same shape, no
conversion), `minTier` (`tierIndex(state)`, 0-7, feeds `npcOptions`' continuous decay for the
Pirate/Rival/Revolutionary pools), `marineTier` (`marineTierForRank(state)`, 1-5 — Marine
encounters use a *hard bucket* rather than continuous decay, so this needs its own frozen value,
separate from `minTier`), `notoriety` (`clamp(0,10, round(5 + (minTier/7)*5))` — floor of 5 since
reaching Immortalize is inherently legendary, up to 10 at max rank), `lethality`
(`clamp(0,3, round(overallStrengthFromProfile(profile)/100*3))`), `hasCrew`
(`crew.length > 0 || Boolean(crewOrigin)`), and a `color` cycled from a small fixed palette
(`immortalColorForIndex`) since immortalized characters don't have a hand-authored one like canon
NPCs do.

**Wiring into existing pools** (`gameData.ts`): `pirateRosterWithImmortals()` and
`rivalRosterWithImmortals()` return a merged `NpcDef[]` (`[...PIRATE_ROSTER/RIVAL_ROSTER,
...immortalsOfAffiliation(...).map(toNpcDef)]`) fed through the existing `npcOptions` — note
**only immortalized Revolutionaries** get folded into the rival pool; immortalized Pirates/
Marines already have their own dedicated pools and aren't double-injected there.
`marineRosterOptionsWithImmortals(state)` reimplements `marineRosterOptions`'s body, merging in
`immortalsOfAffiliation('Marine').filter(r => r.marineTier === marineTierForRank(state))` before
the existing "fall back to the full pool if everyone's dead" quirk — preserved faithfully, not
"fixed" as a drive-by change. `revolutionaryRosterOptions(state)` has no static base roster at
all (no canon Revolutionary NPCs exist) — it's immortalized Revolutionaries only.

**New hub option "Revolutionaries confront you"** — added to `hubPirate` and `hubMarine` only
(not `hubRevolutionary`), conditionally pushed only when
`immortalsOfAffiliation('Revolutionary').length > 0` (mirrors the existing `if (state.weapon)
options.push(...)` conditional pattern), routing to the new `revolutionaryEncounter` node, which
reuses the exact same shared `marineTactic → marineOutcome → marineAftermath`/`marineDeathRoll`
chain already shared by `marineEncounter`, `liberateIsland`, and `rivalEncounter` — zero new
tactic/outcome/aftermath nodes needed.

**The Immortalize flow itself**: each hub's `next` for `label === 'Immortalize'` is now
`isAtCap() ? 'immortalizeGauntletOpponent' : 'immortalizeNamePrompt'` (cap = `IMMORTALS_CAP = 25`,
in `immortals.ts`).
- **Under the cap**: routes straight to `immortalizeNamePrompt` (the `nameInput` node) —
  `submitImmortalName` builds the record, calls `addImmortal`, sets `immortalized: true` +
  `immortalName`, and jumps `currentNodeId` to `'ending'` directly (bypassing `applySelection`
  entirely, since no wheel option is being picked).
- **At the cap**: `immortalizeGauntletOpponent` (equal-weight wheel of every stored immortal) →
  `immortalizeGauntletTactic` (standard `TACTIC_OPTIONS`) → `immortalizeGauntletOutcome`
  (`fightOddsOptions`). **This fight is deliberately all-or-nothing — no `survivalOdds` roll,
  unlike every other fight in the game**: losing sets `causeOfDeath` directly (fatal, full stop);
  winning sets `pendingImmortalReplaceName` and routes to `immortalizeNamePrompt`, where
  `submitImmortalName` calls `replaceImmortal(oldName, record)` instead of `addImmortal` —
  deleting the defeated legend and inserting the new one in the same slot. This is an
  intentional, explicit divergence from the "every fight routes through the shared
  rank/growth-check and loss-consequence chains" convention elsewhere in this file — don't
  "fix" it back toward consistency without asking.

**Permanent removal**: killing an immortalized opponent (`'You kill them'` in `applyAftermath`)
calls `removeImmortalByName` — see the `applyAftermath` note above. This is genuinely permanent
(deletes from `localStorage`), unlike the per-run `deceased` set which resets every `restart()`.

**Name collisions**: `WeightedWheel`'s `spin()` resolves the landed option by
`wedges.find(w => w.label === option.label)` — a duplicate label in the same pool would silently
corrupt which outcome fires. `submitImmortalName` (in `store.ts`) dedupes a player-typed name
against both `allNpcNames()` (every canon NPC, exported from `gameData.ts`) and other stored
immortals, silently appending a Roman-numeral suffix (`uniqueImmortalName`, " II", " III", ...)
on collision rather than blocking submission.

### World events
`WORLD_EVENT_REACTIONS` is a per-event reaction map (6 named events: Yonko-vs-Marines clash, new
island rises, Ancient Weapon stirs, rival crew declares war, Reverie, storm wrecks the Grand
Line) with `GENERIC_EVENT_REACTIONS` as a fallback for anything else. `RISKY_REACTIONS` (in
storyGraph.ts) is a fixed set of specific reaction labels that escalate into a full high-stakes
encounter chain rather than resolving as flavor-only.

## `src/data/storyGraph.ts` — the ~95-node story graph (~1800 lines)

`START_NODE_ID = 'affiliation'`. Helper functions worth knowing before editing nodes:
- `hubIdFor(state)` → `` `hub${state.affiliation}` `` — the return address for most side-quest
  chains.
- `growthCheckIdFor(state)` — routes to `'growthCheck'` if `lastOpponent` is set (a real fight
  just happened) vs `'growthCheckGeneric'` otherwise, so the follow-up question is never worded
  like a fight that didn't happen. `rankIncreaseCheck`/`rankIncreaseTarget` are shared by both
  paths the same way.
- `growthLoopNext(state)` / `growthCheckNext(state, label)` — shared routing for the growth-pick
  batch loop (continue picking while `pendingStatRolls > 0`, otherwise return to
  `pendingReturnNode ?? hubIdFor`).
- `applyWorldEventBoost(state, options)` — mutates a hub options array in place to multiply the
  'World Event' option's weight by a bloodline's `worldEventWeightMultiplier` (only Monkey D.
  Family has one, ×3). Mutating in place matches the pattern the other conditional hub-option
  pushes already use in the hub node definitions.
- `applyAftermath(state, label)` — appends the defeated foe to `defeatedOpponents`, and if the
  player chose "You kill them," also adds them to `deceased`. **This is the one deliberate
  exception to every aftermath/`onSelect` function in this file being a pure state transform**:
  the kill branch also calls `removeImmortalByName(foe)` (a `localStorage` side effect) — see
  "Immortalized characters" below. Don't "purify" this away; it's the single shared choke point
  both `marineAftermath` and `pirateFightAftermath` call, and `'You kill them'` appears nowhere
  else in the file (so `revolutionaryEncounter`/`rivalEncounter`, which route through the shared
  `marineAftermath`, inherit the same permanent-removal behavior for free).
- `lossConsequenceOptions`/`applyLossConsequence` — on a lost-but-survived fight, "You lose an
  ally" only appears as an option if `state.crew.length > 0`, and randomly drops one crewmate
  into `deceased` if chosen.

### Flow overview
1. **Character creation** (linear-ish): `affiliation` → `race` (→ `raceHybrid1`/`raceHybrid2` if
   Hybrid) → `bloodlineCheck` (20%) → `bloodlineType` if hit → Devil Fruit start check → type →
   specific fruit → starting mastery → `fightingStyle` → `weapon` → `fightingMastery` → 4 stat
   rolls (`statStartPower/Speed/Durability/Endurance`, each using
   `raceAdjustedStatTierOptions`) → `hakiStartCheck` → `haki` preset if hit → `initialRank` →
   `crewOriginCheck` → (existing crew / own crew size+strength / none) → lands on the matching
   hub.
2. **Hub loop** — `hubPirate` / `hubMarine` / `hubRevolutionary`, structurally parallel "What's
   next?" wheels (same shape, different flavor text and slightly different option weights per
   affiliation — e.g. Pirates get "Marines come after you" at weight 9, Marines get "Pirates
   attack you" at weight 8). `'World Event'` is weighted 3 on all three (bumped from an original
   1 — deliberately a small-but-not-negligible slice, further multiplied by a bloodline's
   `worldEventWeightMultiplier` via `applyWorldEventBoost` if present, e.g. Monkey D. Family's
   ×3 stacks to an effective 9). Each spin increments `hubSpinCount`, conditionally appends
   "reforge your weapon" (if armed), the rank/promotion option (`rankPressureWeight`-driven, only
   if not already at max rank), and the `Immortalize` option (only past `hubSpinCount ≥ 10`,
   growing weight after).
3. **Combat branches** all follow the same shape: pick a target from a reweighted roster →
   pick a tactic → resolve fight odds (`fightOddsOptions`) → on loss, roll `survivalOdds`; a
   `No` there sets `causeOfDeath` and the store's `applySelection` immediately overrides
   routing to `'ending'` regardless of the node's own `next`. On survival either way, route into
   the shared `rankIncreaseCheck`/`growthCheck` sequence, which returns to `pendingReturnNode ??
   hubIdFor(state)`.
4. **Devil Fruit encounter mid-run** can lead to eating a second fruit
   (`secondDevilFruitSurvival`, 2%/98%) — `pendingSecondFruit` disambiguates this from a
   first-time bite in `next` routing (see `types.ts` notes above).
5. **Road Poneglyphs** (`poneglyphMethod` → either `poneglyphTarget` → tactic/fight chain to
   steal one, or `poneglyphSearchLocation` → `poneglyphSearchResult` for a passive search) — low
   find odds (`poneglyphFindOdds`, 1-9 out of 10), better at higher rank tier, with the Nico
   Family bloodline bonus, and modified by which location was chosen (see "Road Poneglyph search
   locations" above); capped at 4 total (`ALL_PONEGLYPHS`: Wano, Zou, Totto Land, "the Man Marked
   by Flames"). Collecting more of them also raises `rankPressureWeight` (see above).
6. **Growth picks & multi-style mastery** — `growthStatCount` → `growthStatPick` (shared wheel:
   4 stats, 3 Haki types, `'Fighting Style Mastery'`, `'Devil Fruit Mastery'` if applicable) →
   the matching `*Target` node. Landing on `'Fighting Style Mastery'` routes to
   `growthMasteryTarget` directly **only if** `additionalStyles.length === 0`; otherwise it first
   detours through `growthMasteryStylePick`, a wheel of every known style (primary +
   `additionalStyles`, each weighted 1, already-Grandmaster ones dropped unless all are maxed)
   that sets `pendingMasteryStyle` before `growthMasteryTarget` rolls how far *that* style
   climbs. `masteryGrowable(state)` (gameData.ts) is what gates whether `'Fighting Style
   Mastery'` appears on the wheel at all — true if *any* known style (not just the primary) has
   room to grow, so `growableCount`'s batch-size wheel stays accurate for a multi-style
   character too.
7. **Immortalize** (see "Immortalized characters" above for the full system) — picking it on a
   hub wheel routes to `immortalizeNamePrompt` (a `nameInput` node) directly, or first through a
   `immortalizeGauntletOpponent → …Tactic → …Outcome` fight against an existing legend if the
   local 25-character cap is full. `submitImmortalName` (a dedicated store action, not
   `applySelection`) persists the record and jumps straight to `'ending'`.
8. **Ending** (`ending` node, `type: 'ending'`) is reached three ways: death
   (`causeOfDeath` set, overrides everything — including a lost Immortalize gauntlet fight),
   `Immortalize` successfully completed (`immortalized: true`, set by `submitImmortalName`), or —
   implicitly — there's no explicit "win" trigger node; the `EndingScreen` component's
   non-death/non-immortalized branch is the default "you made it" state whenever the ending node
   is reached any other way.

## Working conventions for this codebase

- Every wheel option pool goes through `opt(label, weight, color, flavorText?)` — don't hand-roll
  `WheelOption` object literals.
- A stat/rank/mastery/Haki wheel that should respect a race or bloodline bonus must use the
  pre-shift-then-merge pattern (`raceAdjustedStatTierOptions`, `biasLadderOptions`), not an
  after-the-roll adjustment — the whole point is that what's visually on the wheel already
  reflects the guaranteed floor.
- Combat/growth/survival odds should route through the existing `combatEdge`/profile machinery
  rather than ad hoc math, so a stat change or new bloodline bonus automatically propagates
  everywhere odds are computed. `rankIncreaseOdds` is the deliberate exception — it's driven by
  opponent `notoriety`, not `combatEdge` (see "Rank/bounty increase odds" above); don't fold it
  back into the difficulty-based formula.
- A new NPC roster entry needs both a `profile(...)` (combat strength) and a hand-picked
  `notoriety` value (world fame) — they are independent axes; don't default one from the other.
- New hub side-quests should follow the existing chain shape (`hubX` → encounter/target →
  tactic → outcome → death-roll-if-lost → shared growth/rank check → back to `pendingReturnNode
  ?? hubIdFor(state)`) for consistency, and reuse the shared growth/rank nodes rather than
  duplicating them per-affiliation.
- Any node whose `next` can route to `'ending'` outside of the death-override path should be
  double-checked against `applySelection`'s override in `store.ts` — death always wins regardless
  of what a node's own `next` computes.
- A new roster entry that should be encounterable needs to flow through `findNpc` (canon NPC or
  persisted immortalized character) — don't add a new independent lookup path that only checks
  `ALL_NPCS` directly, or immortalized opponents will silently fall back to
  `FALLBACK_COMBAT_PROFILE`/default notoriety instead of their real stats.
- `localStorage` access belongs in `src/data/immortals.ts` only — don't call `localStorage`
  directly from `gameData.ts`/`storyGraph.ts`/`store.ts`; go through its exported functions so
  the try/catch-wrapped read/write behavior (Safari private mode, quota errors, etc.) stays in
  one place.

---
*This file is maintained by Claude across sessions — after any non-trivial change to
`gameData.ts`, `storyGraph.ts`, `types.ts`, `store.ts`, or the component structure, it should be
updated to match rather than left stale.*

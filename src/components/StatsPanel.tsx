import {
  ALL_PONEGLYPHS,
  PONEGLYPH_LABELS,
  STAT_LABELS,
  STAT_TIER_LADDERS,
  statTierIndex,
  type CharacterState,
  type StatKey,
} from '../types'

type Props = {
  character: CharacterState
  open: boolean
  onClose: () => void
}

const STAT_KEYS: StatKey[] = ['power', 'speed', 'durability', 'endurance']

export default function StatsPanel({ character, open, onClose }: Props) {
  const poneglyphs = ALL_PONEGLYPHS.filter((p) => character.poneglyphsCollected.has(p)).map(
    (p) => PONEGLYPH_LABELS[p],
  )

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed right-0 top-0 z-40 h-dvh w-[85%] max-w-sm overflow-y-auto border-l border-amber-700/25 bg-neutral-950 p-5 text-sm text-neutral-200 shadow-2xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold uppercase tracking-wide text-amber-300">
            <span className="text-base">📜</span> Character Sheet
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-700 px-2.5 py-1 text-xs text-neutral-400 transition hover:border-amber-700/50 hover:text-amber-200"
          >
            ✕
          </button>
        </div>

        <Section title="Identity" icon="🧭">
          <Row label="Affiliation" value={character.affiliation} />
          <Row label="Race" value={character.race} />
          <Row label="Rank" value={character.rank} />
        </Section>

        <Section title="Stats" icon="💪">
          {STAT_KEYS.map((key) => (
            <StatBar key={key} label={STAT_LABELS[key]} statKey={key} value={character.stats[key]} />
          ))}
        </Section>

        <Section title="Haki" icon="🥊">
          {(Object.keys(character.haki) as (keyof CharacterState['haki'])[]).map((type) => (
            <Row key={type} label={type} value={character.haki[type]} />
          ))}
        </Section>

        <Section title="Combat" icon="⚔️">
          <Row label="Fighting Style" value={character.fightingStyle} />
          <Row label="Mastery" value={character.fightingMastery} />
          <Row label="Weapon" value={character.weapon} />
          {character.additionalStyles.length > 0 && (
            <Row
              label="Other Styles"
              value={character.additionalStyles.map((s) => `${s.style} (${s.mastery})`).join(', ')}
            />
          )}
        </Section>

        <Section title="Devil Fruit" icon="🍈">
          <Row label="Fruit" value={character.devilFruit ?? 'None'} />
          {character.devilFruit && <Row label="Type" value={character.devilFruitType} />}
          {character.devilFruit && <Row label="Mastery" value={character.devilFruitMastery} />}
          {character.weaponHasDevilFruit && <Row label="Weapon" value="Devil Fruit infused" />}
        </Section>

        <Section title="Crew" icon="🧑‍🤝‍🧑">
          {character.crewOrigin && <Row label="Started With" value={character.crewOrigin} />}
          <Row label="Size" value={String(character.crew.length)} />
          {character.crew.length > 0 && (
            <Row label="Members" value={character.crew.map((c) => c.name).join(', ')} />
          )}
        </Section>

        <Section title="Progress" icon="🏆">
          <Row label="Road Poneglyphs" value={`${poneglyphs.length}/4`} />
          {poneglyphs.length > 0 && <Row label="Locations" value={poneglyphs.join(', ')} />}
          <Row label="Defeated Opponents" value={String(character.defeatedOpponents.length)} />
          <Row label="Casualties" value={String(character.deceased.size)} />
        </Section>
      </aside>
    </>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">
        <span className="text-sm not-italic">{icon}</span> {title}
      </h3>
      <div className="space-y-1.5 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
        {children}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-neutral-800/70 pb-1 text-xs last:border-none last:pb-0">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-medium text-neutral-100">{value || '—'}</span>
    </div>
  )
}

function StatBar({ label, statKey, value }: { label: string; statKey: StatKey; value: string }) {
  const idx = statTierIndex(statKey, value)
  const max = STAT_TIER_LADDERS[statKey].length - 1
  const pct = Math.min(100, (idx / max) * 100)
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-neutral-500">{label}</span>
        <span className="font-semibold text-neutral-100">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

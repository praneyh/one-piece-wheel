import { STAT_LABELS, type Affiliation, type StatKey } from '../types'
import { IMMORTALS_CAP, loadImmortals, type ImmortalizedRecord } from '../data/immortals'

type Props = {
  open: boolean
  onClose: () => void
}

const STAT_KEYS: StatKey[] = ['power', 'speed', 'durability', 'endurance']

const AFFILIATION_ICON: Record<Affiliation, string> = {
  Pirate: '🏴‍☠️',
  Marine: '⚓',
  Revolutionary: '✊',
}

export default function ImmortalsPanel({ open, onClose }: Props) {
  // Cheap synchronous read, re-run on every render while open — no need to cache, since the
  // list only ever changes between story-graph navigations (a new Immortalize, or a kill),
  // both of which re-render App.tsx anyway.
  const immortals = open ? loadImmortals() : []

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
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold uppercase tracking-wide text-amber-300">
            <span className="text-base">🗿</span> Hall of Legends
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-700 px-2.5 py-1 text-xs text-neutral-400 transition hover:border-amber-700/50 hover:text-amber-200"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-xs uppercase tracking-[0.15em] text-neutral-500">
          {immortals.length}/{IMMORTALS_CAP} immortalized
        </p>

        {immortals.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No one has been immortalized yet. Reach the wheel's rarest ending to leave a legend
            behind — they'll be waiting for a future character to meet.
          </p>
        ) : (
          <div className="space-y-3">
            {immortals.map((record) => (
              <LegendCard key={record.id} record={record} />
            ))}
          </div>
        )}
      </aside>
    </>
  )
}

function LegendCard({ record }: { record: ImmortalizedRecord }) {
  return (
    <div
      className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3"
      style={{ boxShadow: `inset 3px 0 0 0 ${record.color}` }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-display font-bold text-neutral-100">{record.name}</span>
        <span className="text-base leading-none" title={record.affiliation}>
          {AFFILIATION_ICON[record.affiliation]}
        </span>
      </div>
      <div className="mb-2 text-xs text-neutral-500">
        {[
          record.race,
          record.bloodline,
          record.affiliation === 'Pirate' ? record.bountyAmount?.toLocaleString('en-US') : record.rank,
        ]
          .filter(Boolean)
          .join(' · ')}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {STAT_KEYS.map((key) => (
          <div key={key} className="flex justify-between gap-2">
            <span className="text-neutral-500">{STAT_LABELS[key]}</span>
            <span className="font-medium text-neutral-200">{record.profile.stats[key]}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-400">
        <span>Haki: {hakiSummary(record)}</span>
        <span>{record.profile.fightingMastery}</span>
        {record.profile.devilFruitMastery && <span>DF: {record.profile.devilFruitMastery}</span>}
        {record.hasCrew && <span>👥 Has backup</span>}
        <span title="How often they killed a defeated foe during their own run">
          {moralityLabel(record.morality)}
        </span>
      </div>
    </div>
  )
}

/** Mirrors the same 0/1/2/3 buckets lethalityFromMorality (store.ts) derives from this number —
 * a quick read on whether this legend will actually finish you off if you lose to them. */
function moralityLabel(morality: number): string {
  if (morality >= 75) return '💀 Merciless'
  if (morality >= 50) return '⚔️ Ruthless'
  if (morality >= 20) return '🔗 Pragmatic'
  return '🕊️ Merciful'
}

function hakiSummary(record: ImmortalizedRecord): string {
  const entries = Object.entries(record.profile.haki).filter(([, level]) => level !== 'None')
  if (entries.length === 0) return 'None'
  return entries.map(([type, level]) => `${type} (${level})`).join(', ')
}

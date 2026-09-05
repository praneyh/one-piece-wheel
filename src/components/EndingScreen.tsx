import {
  ALL_PONEGLYPHS,
  PONEGLYPH_LABELS,
  STAT_LABELS,
  type CharacterState,
  type StatKey,
} from '../types'

type Props = {
  character: CharacterState
  onRestart: () => void
}

const STAT_KEYS: StatKey[] = ['power', 'speed', 'durability', 'endurance']

const WIN_COPY: Record<string, { title: string; subtitle: string; icon: string }> = {
  Pirate: {
    title: 'You are now the\nKing of the Pirates.',
    subtitle: "Wealth, Fame, Power, you've attained them all.",
    icon: '🏴‍☠️',
  },
  Marine: {
    title: 'You are now\nFleet Admiral.',
    subtitle: 'Absolute Justice has been served.',
    icon: '⚓',
  },
  Revolutionary: {
    title: 'You are now\nCommander-in-Chief.',
    subtitle: 'The seed of revolution has taken root across the world.',
    icon: '✊',
  },
}

export default function EndingScreen({ character, onRestart }: Props) {
  const poneglyphs = ALL_PONEGLYPHS.filter((p) => character.poneglyphsCollected.has(p)).map(
    (p) => PONEGLYPH_LABELS[p],
  )

  const isDeath = Boolean(character.causeOfDeath)
  const isImmortalized = Boolean(character.immortalized)
  const win = WIN_COPY[character.affiliation ?? 'Pirate']

  return (
    <div
      className={`flex min-h-full w-full flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center ${
        isDeath
          ? 'bg-gradient-to-b from-red-950 via-neutral-950 to-black'
          : isImmortalized
            ? 'bg-gradient-to-b from-indigo-950 via-neutral-950 to-black'
            : 'bg-gradient-to-b from-amber-950 via-neutral-950 to-black'
      }`}
    >
      {isDeath ? (
        <>
          <div className="text-4xl opacity-90">💀</div>
          <h1 className="font-display whitespace-pre-line text-3xl font-bold uppercase leading-tight tracking-tight text-red-400 [text-shadow:0_0_20px_rgba(248,113,113,0.6)]">
            Game Over
          </h1>
          <p className="max-w-xs text-base font-semibold text-red-300">{character.causeOfDeath}</p>
        </>
      ) : isImmortalized ? (
        <>
          <div className="text-4xl opacity-90">🗿</div>
          <h1 className="font-display whitespace-pre-line text-3xl font-bold uppercase leading-tight tracking-tight text-indigo-300 [text-shadow:0_0_20px_rgba(165,180,252,0.6)]">
            Immortalized
          </h1>
          <p className="max-w-xs text-base font-semibold text-indigo-200/90">
            Your legend has been etched into the wheel forever.
          </p>
        </>
      ) : (
        <>
          <div className="text-4xl opacity-90">{win.icon}</div>
          <h1 className="font-display whitespace-pre-line text-3xl font-bold uppercase leading-tight tracking-tight text-amber-300 [text-shadow:0_0_20px_rgba(252,211,77,0.6)]">
            {win.title}
          </h1>
          <p className="text-lg font-semibold text-amber-200/90">{win.subtitle}</p>
        </>
      )}

      <div className="mt-2 w-full max-w-sm space-y-2 rounded-2xl border border-amber-700/25 bg-neutral-900/80 p-5 text-left text-sm text-neutral-200 shadow-[0_0_0_1px_rgba(232,193,104,0.05)] backdrop-blur">
        <Row label="Affiliation" value={character.affiliation} />
        <Row label="Race" value={character.race} />
        <Row label="Final Rank" value={character.rank} />
        {STAT_KEYS.map((key) => (
          <Row key={key} label={STAT_LABELS[key]} value={String(character.stats[key])} />
        ))}
        <Row label="Haki" value={hakiSummary(character)} />
        <Row label="Fighting Style" value={character.fightingStyle} />
        {character.additionalStyles.length > 0 && (
          <Row
            label="Other Styles"
            value={character.additionalStyles.map((s) => `${s.style} (${s.mastery})`).join(', ')}
          />
        )}
        <Row label="Weapon" value={character.weapon} />
        <Row label="Devil Fruit" value={character.devilFruit ?? 'None'} />
        {character.devilFruit && <Row label="Devil Fruit Mastery" value={character.devilFruitMastery} />}
        {character.crewOrigin && <Row label="Started With" value={character.crewOrigin} />}
        <Row label="Crew Size" value={String(character.crew.length)} />
        <Row label="Road Poneglyphs" value={poneglyphs.join(', ') || 'None'} />
        <Row label="Defeated Opponents" value={String(character.defeatedOpponents.length)} />
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="mt-4 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-3 font-bold uppercase tracking-wide text-black shadow-[0_2px_10px_rgba(232,193,104,0.35)] transition hover:from-amber-200 hover:to-amber-400 active:scale-95"
      >
        Build another character
      </button>
    </div>
  )
}

function hakiSummary(character: CharacterState): string {
  const entries = Object.entries(character.haki).filter(([, level]) => level !== 'None')
  if (entries.length === 0) return 'None'
  return entries.map(([type, level]) => `${type} (${level})`).join(', ')
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-neutral-800 pb-1.5 last:border-none">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-medium text-neutral-100">{value || '—'}</span>
    </div>
  )
}

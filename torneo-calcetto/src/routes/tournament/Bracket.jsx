import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { TrophyIcon, UndoIcon } from '../../components/icons'
import Alert from '../../components/ui/Alert'
import { useTournament } from '../../context/TournamentContext'
import { matchLoser, matchWinner, SLOTS } from '../../lib/tournament/bracket'
import { recordMatchResult, resetMatchResult } from '../../lib/tournament/actions'
import { isStaff } from '../../lib/tournament/permissions'

// Il tabellone è disegnato come un grafo: ogni squadra è un nodo, ogni
// accoppiamento è l'arco che unisce i due nodi, e gli archi tratteggiati
// mostrano dove finirà chi passa il turno.
const ROUNDS = [
  { title: 'Turno preliminare', ties: ['A', 'B'] },
  { title: 'Semifinali', ties: ['SF1', 'SF2'] },
  { title: 'Finali', ties: ['F34', 'F12'] },
]

// Etichette usate finché close_phase() non ha ancora popolato lo slot.
const PENDING_LABELS = {
  A: ['3ª del girone', '6ª del girone'],
  B: ['4ª del girone', '5ª del girone'],
  SF1: ['Vincente prelim. A', '2ª del girone'],
  SF2: ['Vincente prelim. B', '1ª del girone'],
  F34: ['Perdente semifinale 1', 'Perdente semifinale 2'],
  F12: ['Vincente semifinale 1', 'Vincente semifinale 2'],
}

// Archi di avanzamento: dal centro di un accoppiamento al nodo che ne accoglie
// l'esito nel turno successivo.
const FEEDS = [
  { from: 'A', to: 'SF1-home' },
  { from: 'B', to: 'SF2-home' },
  { from: 'SF1', to: 'F12-home' },
  { from: 'SF1', to: 'F34-home' },
  { from: 'SF2', to: 'F12-away' },
  { from: 'SF2', to: 'F34-away' },
]

// Curva di Bézier orientata secondo l'asse dominante: orizzontale quando le
// colonne sono affiancate, verticale quando su mobile si impilano.
function edgePath(a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (Math.abs(dx) >= Math.abs(dy)) {
    return `M ${a.x} ${a.y} C ${a.x + dx * 0.45} ${a.y}, ${b.x - dx * 0.45} ${b.y}, ${b.x} ${b.y}`
  }
  return `M ${a.x} ${a.y} C ${a.x} ${a.y + dy * 0.45}, ${b.x} ${b.y - dy * 0.45}, ${b.x} ${b.y}`
}

function TeamNode({ nodeRef, label, pending, seed, state }) {
  return (
    <div className={`bracket-node ${pending ? 'is-pending' : ''} ${state}`} ref={nodeRef}>
      <span className="bracket-node-dot" aria-hidden="true" />
      <span className="bracket-node-name">{label}</span>
      {seed ? <span className="bracket-node-seed">{seed}ª</span> : null}
    </div>
  )
}

function ScoreEditor({ match, label, teamName, busy, onSave, onReset, onClose }) {
  const [home, setHome] = useState(match.home_goals ?? '')
  const [away, setAway] = useState(match.away_goals ?? '')
  const [winner, setWinner] = useState(match.winner_team_id ?? '')

  const tied = home !== '' && away !== '' && Number(home) === Number(away)

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <form
        className="panel modal"
        aria-labelledby="bracket-editor-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          onSave(match.id, Number(home), Number(away), tied ? winner : null)
        }}
      >
        <h3 id="bracket-editor-title">{label}</h3>
        <div className="bracket-editor-rows">
          <label className="field">
            <span>{teamName(match.home_team_id)}</span>
            <input
              type="number"
              min="0"
              required
              value={home}
              onChange={(e) => setHome(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{teamName(match.away_team_id)}</span>
            <input
              type="number"
              min="0"
              required
              value={away}
              onChange={(e) => setAway(e.target.value)}
            />
          </label>
        </div>
        {tied && (
          <label className="field">
            <span>Pareggio: squadra che passa il turno</span>
            <select value={winner} onChange={(e) => setWinner(e.target.value)} required>
              <option value="">Seleziona…</option>
              <option value={match.home_team_id}>{teamName(match.home_team_id)}</option>
              <option value={match.away_team_id}>{teamName(match.away_team_id)}</option>
            </select>
          </label>
        )}
        <div className="modal-actions">
          {match.status === 'played' && (
            <button
              type="button"
              className="btn btn-ghost btn-danger-text modal-actions-reset"
              disabled={busy}
              onClick={() => onReset(match.id)}
            >
              <UndoIcon size={15} /> Segna come da giocare
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annulla
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Salvataggio…' : match.status === 'played' ? 'Aggiorna' : 'Registra'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function Bracket() {
  const { teams, matches, myRole, tournament, refresh } = useTournament()
  const staff = isStaff(myRole)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [editingSlot, setEditingSlot] = useState(null)

  const containerRef = useRef(null)
  const nodeRefs = useRef(new Map())
  const [edges, setEdges] = useState([])

  const setNodeRef = useCallback(
    (key) => (el) => {
      if (el) nodeRefs.current.set(key, el)
      else nodeRefs.current.delete(key)
    },
    [],
  )

  function teamName(id) {
    return teams.find((t) => t.id === id)?.name ?? '—'
  }
  function teamSeed(id) {
    return teams.find((t) => t.id === id)?.group_seed ?? null
  }
  function findMatch(slot) {
    return matches.find((m) => m.slot === slot) ?? null
  }

  // Le coordinate degli archi si misurano dal DOM: così il grafo resta
  // corretto con qualunque lunghezza dei nomi e su qualunque viewport.
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    function measure() {
      const box = container.getBoundingClientRect()
      const center = (key) => {
        const el = nodeRefs.current.get(key)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 }
      }

      const next = []
      for (const round of ROUNDS) {
        for (const slot of round.ties) {
          const a = center(`${slot}-home`)
          const b = center(`${slot}-away`)
          const match = matches.find((m) => m.slot === slot) ?? null
          if (a && b) {
            next.push({
              id: `tie-${slot}`,
              kind: 'tie',
              live: Boolean(match),
              d: edgePath(a, b),
            })
          }
        }
      }
      for (const feed of FEEDS) {
        const a = center(`${feed.from}-chip`)
        const b = center(feed.to)
        const source = matches.find((m) => m.slot === feed.from) ?? null
        if (a && b) {
          next.push({
            id: `feed-${feed.from}-${feed.to}`,
            kind: 'feed',
            live: Boolean(source && source.status === 'played'),
            d: edgePath(a, b),
          })
        }
      }
      setEdges(next)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    nodeRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [matches, teams, staff])

  async function handleSave(matchId, home, away, winnerTeamId) {
    setBusy(true)
    setError(null)
    try {
      await recordMatchResult(matchId, home, away, winnerTeamId)
      await refresh()
      setEditingSlot(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleReset(matchId) {
    setBusy(true)
    setError(null)
    try {
      await resetMatchResult(matchId)
      await refresh()
      setEditingSlot(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const f34 = findMatch('F34')
  const f12 = findMatch('F12')
  const podium =
    tournament.phase === 'completed' && f34 && f12
      ? [
          { place: 1, teamId: matchWinner(f12) },
          { place: 2, teamId: matchLoser(f12) },
          { place: 3, teamId: matchWinner(f34) },
          { place: 4, teamId: matchLoser(f34) },
        ]
      : null

  const editingMatch = editingSlot ? findMatch(editingSlot) : null

  return (
    <div className="stack">
      <div className="section-head">
        <h2>Tabellone a eliminazione diretta</h2>
        <p>
          Ogni squadra è un nodo, le linee mostrano chi affronta chi. Dopo il girone il tabellone
          avanza da solo: appena tutti i risultati di un turno sono registrati, il turno successivo
          viene generato.
        </p>
      </div>

      <Alert>{error}</Alert>

      {podium && (
        <div className="panel podium">
          <span className="eyebrow">
            <TrophyIcon size={16} />
            Podio finale
          </span>
          <ol>
            {podium.map((p) => (
              <li key={p.place}>
                <strong>{p.place}°</strong> {teamName(p.teamId)}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="panel bracket-graph" ref={containerRef}>
        <svg className="bracket-edges" aria-hidden="true">
          {edges.map((edge) => (
            <path
              key={edge.id}
              d={edge.d}
              className={`bracket-edge bracket-edge-${edge.kind} ${edge.live ? 'is-live' : ''}`}
            />
          ))}
        </svg>

        {ROUNDS.map((round) => (
          <div className="bracket-round" key={round.title}>
            <h3 className="bracket-round-title">{round.title}</h3>
            {round.ties.map((slot) => {
              const match = findMatch(slot)
              const [pendingHome, pendingAway] = PENDING_LABELS[slot]
              const played = match?.status === 'played'
              const winnerId = match ? matchWinner(match) : null
              const nodeState = (teamId) => {
                if (!played || !winnerId) return ''
                return teamId === winnerId ? 'is-winner' : 'is-out'
              }

              return (
                <div className="bracket-tie" key={slot}>
                  <TeamNode
                    nodeRef={setNodeRef(`${slot}-home`)}
                    label={match ? teamName(match.home_team_id) : pendingHome}
                    pending={!match}
                    seed={match ? teamSeed(match.home_team_id) : null}
                    state={match ? nodeState(match.home_team_id) : ''}
                  />

                  {staff && match ? (
                    <button
                      type="button"
                      ref={setNodeRef(`${slot}-chip`)}
                      className={`bracket-chip ${played ? 'is-played' : ''}`}
                      onClick={() => setEditingSlot(slot)}
                      aria-label={`${SLOTS[slot].label}: registra il risultato`}
                    >
                      {played ? `${match.home_goals} – ${match.away_goals}` : 'vs'}
                    </button>
                  ) : (
                    <span
                      ref={setNodeRef(`${slot}-chip`)}
                      className={`bracket-chip ${played ? 'is-played' : ''}`}
                    >
                      {played ? `${match.home_goals} – ${match.away_goals}` : 'vs'}
                    </span>
                  )}

                  <TeamNode
                    nodeRef={setNodeRef(`${slot}-away`)}
                    label={match ? teamName(match.away_team_id) : pendingAway}
                    pending={!match}
                    seed={match ? teamSeed(match.away_team_id) : null}
                    state={match ? nodeState(match.away_team_id) : ''}
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="bracket-legend">
        <span>
          <i aria-hidden="true" /> accoppiamento da giocare
        </span>
        <span>
          <i className="is-live" aria-hidden="true" /> accoppiamento definito
        </span>
        <span className="bracket-legend-feed">
          <i className="dashed" aria-hidden="true" /> chi passa il turno finisce qui
        </span>
      </div>

      {editingMatch && (
        <ScoreEditor
          key={editingMatch.id}
          match={editingMatch}
          label={SLOTS[editingSlot].label}
          teamName={teamName}
          busy={busy}
          onSave={handleSave}
          onReset={handleReset}
          onClose={() => setEditingSlot(null)}
        />
      )}
    </div>
  )
}

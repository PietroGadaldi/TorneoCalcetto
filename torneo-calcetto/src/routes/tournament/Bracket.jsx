import { useState } from 'react'
import { TrophyIcon } from '../../components/icons'
import Alert from '../../components/ui/Alert'
import { useTournament } from '../../context/TournamentContext'
import { matchLoser, matchWinner, SLOTS } from '../../lib/tournament/bracket'
import { recordMatchResult } from '../../lib/tournament/actions'
import { isStaff } from '../../lib/tournament/permissions'

const COLUMNS = [
  { title: 'Turno preliminare', slots: ['A', 'B'] },
  { title: 'Semifinali', slots: ['SF1', 'SF2'] },
  { title: 'Finali', slots: ['F34', 'F12'] },
]

function MatchCard({ match, teamName, staff, onSave, busy }) {
  const label = SLOTS[match?.slot ?? '']?.label
  const [home, setHome] = useState(match?.home_goals ?? '')
  const [away, setAway] = useState(match?.away_goals ?? '')
  const [winner, setWinner] = useState(match?.winner_team_id ?? '')

  if (!match) {
    return (
      <div className="panel bracket-card bracket-card-empty">
        <span className="text-dim">In attesa della fase precedente</span>
      </div>
    )
  }

  const tied = home !== '' && away !== '' && Number(home) === Number(away)

  return (
    <div className="panel bracket-card">
      <span className="eyebrow">{label}</span>
      {staff ? (
        <form
          className="bracket-form"
          onSubmit={(e) => {
            e.preventDefault()
            onSave(match.id, Number(home), Number(away), tied ? winner : null)
          }}
        >
          <div className="bracket-row">
            <span>{teamName(match.home_team_id)}</span>
            <input type="number" min="0" required value={home} onChange={(e) => setHome(e.target.value)} />
          </div>
          <div className="bracket-row">
            <span>{teamName(match.away_team_id)}</span>
            <input type="number" min="0" required value={away} onChange={(e) => setAway(e.target.value)} />
          </div>
          {tied && (
            <label className="field">
              <span>Pareggio: squadra vincitrice</span>
              <select value={winner} onChange={(e) => setWinner(e.target.value)} required>
                <option value="">Seleziona…</option>
                <option value={match.home_team_id}>{teamName(match.home_team_id)}</option>
                <option value={match.away_team_id}>{teamName(match.away_team_id)}</option>
              </select>
            </label>
          )}
          <button type="submit" className="btn btn-secondary btn-sm" disabled={busy}>
            {match.status === 'played' ? 'Aggiorna' : 'Registra'}
          </button>
        </form>
      ) : (
        <div className="bracket-form">
          <div className="bracket-row">
            <span>{teamName(match.home_team_id)}</span>
            <strong>{match.status === 'played' ? match.home_goals : '–'}</strong>
          </div>
          <div className="bracket-row">
            <span>{teamName(match.away_team_id)}</span>
            <strong>{match.status === 'played' ? match.away_goals : '–'}</strong>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Bracket() {
  const { teams, matches, myRole, tournament, refresh } = useTournament()
  const staff = isStaff(myRole)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  function teamName(id) {
    return teams.find((t) => t.id === id)?.name ?? '—'
  }
  function findMatch(slot) {
    return matches.find((m) => m.slot === slot) ?? null
  }

  async function handleSave(matchId, home, away, winnerTeamId) {
    setBusy(true)
    setError(null)
    try {
      await recordMatchResult(matchId, home, away, winnerTeamId)
      await refresh()
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

  return (
    <div className="stack">
      <div className="section-head">
        <h2>Tabellone a eliminazione diretta</h2>
        <p>Gli accoppiamenti si generano automaticamente alla chiusura di ogni fase, dalla Panoramica.</p>
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

      <div className="bracket-grid">
        {COLUMNS.map((col) => (
          <div className="bracket-column" key={col.title}>
            <h3>{col.title}</h3>
            {col.slots.map((slot) => (
              <MatchCard
                key={slot}
                match={findMatch(slot)}
                teamName={teamName}
                staff={staff}
                busy={busy}
                onSave={handleSave}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

import { useState } from 'react'
import Alert from '../../components/ui/Alert'
import { useTournament } from '../../context/TournamentContext'
import { createMatch, recordMatchResult } from '../../lib/tournament/actions'
import { isStaff } from '../../lib/tournament/permissions'
import { GROUP_MATCH_COUNT } from '../../lib/tournament/standings'

function ResultForm({ match, teamName, onSave, busy }) {
  const [home, setHome] = useState(match.home_goals ?? '')
  const [away, setAway] = useState(match.away_goals ?? '')

  return (
    <form
      className="score-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSave(Number(home), Number(away))
      }}
    >
      <span>{teamName(match.home_team_id)}</span>
      <input
        type="number"
        min="0"
        required
        value={home}
        onChange={(e) => setHome(e.target.value)}
      />
      <span>–</span>
      <input
        type="number"
        min="0"
        required
        value={away}
        onChange={(e) => setAway(e.target.value)}
      />
      <span>{teamName(match.away_team_id)}</span>
      <button type="submit" className="btn btn-secondary btn-sm" disabled={busy}>
        {match.status === 'played' ? 'Aggiorna' : 'Registra'}
      </button>
    </form>
  )
}

export default function Matches() {
  const { teams, matches, myRole, tournament, refresh } = useTournament()
  const staff = isStaff(myRole)
  const canCreate = staff && tournament.phase === 'group'

  const [homeId, setHomeId] = useState('')
  const [awayId, setAwayId] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const groupMatches = matches
    .filter((m) => m.phase === 'group')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  function teamName(id) {
    return teams.find((t) => t.id === id)?.name ?? '—'
  }

  async function run(fn) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateMatch(e) {
    e.preventDefault()
    if (!homeId || !awayId || homeId === awayId) {
      setError('Seleziona due squadre diverse')
      return
    }
    const exists = groupMatches.some(
      (m) =>
        (m.home_team_id === homeId && m.away_team_id === awayId) ||
        (m.home_team_id === awayId && m.away_team_id === homeId),
    )
    if (exists) {
      setError('Questa coppia di squadre si è già affrontata nel girone')
      return
    }
    await run(async () => {
      await createMatch(tournament.id, homeId, awayId)
      setHomeId('')
      setAwayId('')
    })
  }

  return (
    <div className="stack">
      <div className="section-head">
        <h2>Girone all&rsquo;italiana</h2>
        <p>
          {groupMatches.length}/{GROUP_MATCH_COUNT} partite create &middot;{' '}
          {groupMatches.filter((m) => m.status === 'played').length} giocate
        </p>
      </div>

      <Alert>{error}</Alert>

      {canCreate && (
        <form className="panel inline-form" onSubmit={handleCreateMatch}>
          <label className="field">
            <span>Squadra 1</span>
            <select value={homeId} onChange={(e) => setHomeId(e.target.value)} required>
              <option value="">Seleziona…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Squadra 2</span>
            <select value={awayId} onChange={(e) => setAwayId(e.target.value)} required>
              <option value="">Seleziona…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-secondary btn-sm" disabled={busy}>
            Crea partita
          </button>
        </form>
      )}

      <div className="panel">
        {groupMatches.length === 0 && <p className="text-dim">Nessuna partita creata.</p>}
        <ul className="match-list">
          {groupMatches.map((m) => (
            <li key={m.id} className="match-row">
              {staff ? (
                <ResultForm
                  match={m}
                  teamName={teamName}
                  busy={busy}
                  onSave={(h, a) => run(() => recordMatchResult(m.id, h, a))}
                />
              ) : (
                <div className="score-form">
                  <span>{teamName(m.home_team_id)}</span>
                  <strong>{m.status === 'played' ? m.home_goals : '–'}</strong>
                  <span>–</span>
                  <strong>{m.status === 'played' ? m.away_goals : '–'}</strong>
                  <span>{teamName(m.away_team_id)}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { MinusIcon, PlusIcon } from '../../components/icons'
import Alert from '../../components/ui/Alert'
import { useTournament } from '../../context/TournamentContext'
import { setPlayerGoals } from '../../lib/tournament/actions'
import { isStaff } from '../../lib/tournament/permissions'

function playerName(player) {
  return player.guest_name ?? player.member?.profiles?.username ?? '—'
}

export default function Scorers() {
  const { teams, players, myRole, refresh, tournament } = useTournament()
  const staff = isStaff(myRole)
  const canEdit = staff && tournament.phase !== 'completed'

  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null) // playerId in corso di salvataggio

  function teamName(id) {
    return teams.find((t) => t.id === id)?.name ?? '—'
  }

  async function updateGoals(player, goals) {
    if (goals < 0) return
    setBusy(player.id)
    setError(null)
    try {
      await setPlayerGoals(player.id, goals)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  const sorted = players
    .slice()
    .sort((a, b) => b.goals - a.goals || playerName(a).localeCompare(playerName(b)))

  return (
    <div className="stack">
      <div className="section-head">
        <h2>Marcatori</h2>
        <p>Classifica cannonieri del torneo, aggiornabile dallo staff dopo ogni partita.</p>
      </div>

      <Alert>{error}</Alert>

      <div className="panel table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Giocatore</th>
              <th>Squadra</th>
              <th>Gol</th>
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id}>
                <td className="team">{playerName(p)}</td>
                <td>{p.team_id ? teamName(p.team_id) : <span className="text-dim">—</span>}</td>
                <td className="pts">{p.goals}</td>
                {canEdit && (
                  <td className="row-actions">
                    <div className="goal-stepper">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm score-action"
                        disabled={busy === p.id || p.goals <= 0}
                        aria-label="Togli un gol"
                        onClick={() => updateGoals(p, p.goals - 1)}
                      >
                        <MinusIcon size={14} />
                      </button>
                      <input
                        type="number"
                        min="0"
                        className="goal-input"
                        value={p.goals}
                        disabled={busy === p.id}
                        onChange={(e) => {
                          const value = Number(e.target.value)
                          if (Number.isInteger(value) && value >= 0) updateGoals(p, value)
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm score-action"
                        disabled={busy === p.id}
                        aria-label="Aggiungi un gol"
                        onClick={() => updateGoals(p, p.goals + 1)}
                      >
                        <PlusIcon size={14} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 4 : 3} className="text-dim">
                  Nessun giocatore ancora iscritto.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

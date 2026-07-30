import { useState } from 'react'
import Alert from '../../components/ui/Alert'
import EditableText from '../../components/ui/EditableText'
import { useTournament } from '../../context/TournamentContext'
import {
  addGuestPlayer,
  assignPlayerToTeam,
  createTeam,
  renameGuestPlayer,
  renameTeam,
} from '../../lib/tournament/actions'
import { isStaff } from '../../lib/tournament/permissions'

function playerName(player) {
  return player.guest_name ?? player.member?.profiles?.username ?? '—'
}

export default function Teams() {
  const { teams, players, myRole, refresh, tournament } = useTournament()
  const staff = isStaff(myRole)
  const canEdit = staff && tournament.phase === 'setup'
  const canRename = staff && tournament.phase !== 'completed'

  const [teamName, setTeamName] = useState('')
  const [guestName, setGuestName] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const lobbyPlayers = players.filter((p) => !p.team_id)
  const rosterByTeam = new Map(teams.map((t) => [t.id, players.filter((p) => p.team_id === t.id)]))

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

  async function handleCreateTeam(e) {
    e.preventDefault()
    const name = teamName.trim()
    if (!name) return
    await run(async () => {
      await createTeam(tournament.id, name)
      setTeamName('')
    })
  }

  async function handleAddGuest(e) {
    e.preventDefault()
    const name = guestName.trim()
    if (!name) return
    await run(async () => {
      await addGuestPlayer(tournament.id, name)
      setGuestName('')
    })
  }

  return (
    <div className="stack">
      <div className="section-head">
        <h2>Squadre e rose</h2>
        <p>
          {tournament.phase === 'setup'
            ? 'Crea le 6 squadre e assegna i giocatori dalla lobby, poi avvia il girone dalla Panoramica.'
            : 'Le squadre sono definite: la composizione non è più modificabile dopo l’avvio del girone.'}
        </p>
      </div>

      <Alert>{error}</Alert>

      {canEdit && (
        <div className="panel two-col-forms">
          <form onSubmit={handleCreateTeam} className="inline-form">
            <label className="field">
              <span>Nuova squadra ({teams.length}/6)</span>
              <input
                type="text"
                value={teamName}
                disabled={teams.length >= 6}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Nome squadra"
              />
            </label>
            <button type="submit" className="btn btn-secondary btn-sm" disabled={busy || teams.length >= 6}>
              Aggiungi
            </button>
          </form>

          <form onSubmit={handleAddGuest} className="inline-form">
            <label className="field">
              <span>Giocatore ospite</span>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Nome e cognome"
              />
            </label>
            <button type="submit" className="btn btn-secondary btn-sm" disabled={busy}>
              Aggiungi
            </button>
          </form>
        </div>
      )}

      <div className="teams-grid">
        <div className="panel roster-card">
          <h3>Lobby ({lobbyPlayers.length})</h3>
          <ul className="roster-list">
            {lobbyPlayers.map((p) => (
              <li key={p.id}>
                {p.guest_name != null ? (
                  <EditableText
                    value={playerName(p)}
                    onSave={(name) => run(() => renameGuestPlayer(p.id, name))}
                    disabled={!canRename}
                    ariaLabel="Rinomina ospite"
                  />
                ) : (
                  <span>{playerName(p)}</span>
                )}
                {canEdit && teams.length > 0 && (
                  <select
                    defaultValue=""
                    disabled={busy}
                    onChange={(e) => e.target.value && run(() => assignPlayerToTeam(p.id, e.target.value))}
                  >
                    <option value="" disabled>
                      Sposta in…
                    </option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            ))}
            {lobbyPlayers.length === 0 && <li className="text-dim">Nessuno in lobby.</li>}
          </ul>
        </div>

        {teams.map((team) => (
          <div className="panel roster-card" key={team.id}>
            <EditableText
              value={team.name}
              onSave={(name) => run(() => renameTeam(team.id, name))}
              disabled={!canRename}
              ariaLabel="Rinomina squadra"
              as="h3"
            />
            <ul className="roster-list">
              {(rosterByTeam.get(team.id) ?? []).map((p) => (
                <li key={p.id}>
                  {p.guest_name != null ? (
                    <EditableText
                      value={playerName(p)}
                      onSave={(name) => run(() => renameGuestPlayer(p.id, name))}
                      disabled={!canRename}
                      ariaLabel="Rinomina ospite"
                    />
                  ) : (
                    <span>{playerName(p)}</span>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy}
                      onClick={() => run(() => assignPlayerToTeam(p.id, null))}
                    >
                      Rimuovi
                    </button>
                  )}
                </li>
              ))}
              {(rosterByTeam.get(team.id) ?? []).length === 0 && (
                <li className="text-dim">Nessun giocatore assegnato.</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

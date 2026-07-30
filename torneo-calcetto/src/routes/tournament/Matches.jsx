import { useState } from 'react'
import { CheckIcon, UndoIcon } from '../../components/icons'
import Alert from '../../components/ui/Alert'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useTournament } from '../../context/TournamentContext'
import { recordMatchResult, resetMatchResult } from '../../lib/tournament/actions'
import { isStaff } from '../../lib/tournament/permissions'
import { GROUP_MATCH_COUNT } from '../../lib/tournament/standings'

function ResultForm({ match, teamName, onSave, onReset, busy }) {
  const [home, setHome] = useState(match.home_goals ?? '')
  const [away, setAway] = useState(match.away_goals ?? '')

  // la conferma si attiva solo quando c'è davvero qualcosa da salvare:
  // così una sola icona basta al posto del bottone con etichetta
  const dirty =
    String(match.home_goals ?? '') !== String(home) || String(match.away_goals ?? '') !== String(away)
  const complete = home !== '' && away !== ''

  return (
    <form
      className="score-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSave(Number(home), Number(away))
      }}
    >
      <span className="score-team">{teamName(match.home_team_id)}</span>
      <input
        className="score-input"
        type="number"
        min="0"
        required
        value={home}
        onChange={(e) => setHome(e.target.value)}
      />
      <input
        className="score-input score-input-away"
        type="number"
        min="0"
        required
        value={away}
        onChange={(e) => setAway(e.target.value)}
      />
      <span className="score-team score-team-away">{teamName(match.away_team_id)}</span>
      <div className="score-actions">
        {match.status === 'played' && (
          <button
            type="button"
            className="btn btn-ghost btn-sm score-action"
            disabled={busy}
            title="Annulla il risultato"
            aria-label="Annulla il risultato"
            onClick={onReset}
          >
            <UndoIcon size={16} />
          </button>
        )}
        <button
          type="submit"
          className="btn btn-secondary btn-sm score-action"
          disabled={busy || !dirty || !complete}
          title={match.status === 'played' ? 'Aggiorna il risultato' : 'Registra il risultato'}
          aria-label={match.status === 'played' ? 'Aggiorna il risultato' : 'Registra il risultato'}
        >
          <CheckIcon size={16} />
        </button>
      </div>
    </form>
  )
}

export default function Matches() {
  const { teams, matches, myRole, refresh } = useTournament()
  const staff = isStaff(myRole)

  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmReset, setConfirmReset] = useState(null)

  const groupMatches = matches
    .filter((m) => m.phase === 'group')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  function teamName(id) {
    return teams.find((t) => t.id === id)?.name ?? '—'
  }

  async function run(fn, onSuccess) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await refresh()
      onSuccess?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <div className="section-head">
        <h2>Girone all&rsquo;italiana</h2>
        <p>
          Ogni squadra affronta tutte le altre &middot; {groupMatches.filter((m) => m.status === 'played').length}/
          {GROUP_MATCH_COUNT} giocate
        </p>
      </div>

      <Alert>{error}</Alert>

      <div className="panel list-panel">
        {groupMatches.length === 0 && (
          <p className="text-dim">Le partite verranno generate automaticamente all&rsquo;avvio del girone.</p>
        )}
        <ul className="match-list">
          {groupMatches.map((m) => (
            <li key={m.id} className={`match-row ${m.status === 'played' ? 'is-played' : ''}`}>
              {staff ? (
                <ResultForm
                  match={m}
                  teamName={teamName}
                  busy={busy}
                  onSave={(h, a) => run(() => recordMatchResult(m.id, h, a))}
                  onReset={() => setConfirmReset(m.id)}
                />
              ) : (
                <div className="score-form">
                  <span className="score-team">{teamName(m.home_team_id)}</span>
                  <strong className="score-input">{m.status === 'played' ? m.home_goals : '–'}</strong>
                  <strong className="score-input score-input-away">
                    {m.status === 'played' ? m.away_goals : '–'}
                  </strong>
                  <span className="score-team score-team-away">{teamName(m.away_team_id)}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <ConfirmDialog
        open={confirmReset != null}
        title="Annullare il risultato?"
        description="La partita tornerà da giocare, come se il risultato non fosse mai stato inserito."
        confirmLabel="Annulla risultato"
        danger
        onConfirm={() => run(() => resetMatchResult(confirmReset), () => setConfirmReset(null))}
        onCancel={() => setConfirmReset(null)}
      />
    </div>
  )
}

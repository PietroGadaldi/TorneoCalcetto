import { useState } from 'react'
import { KeyIcon, WhistleIcon } from '../../components/icons'
import Alert from '../../components/ui/Alert'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useTournament } from '../../context/TournamentContext'
import { closePhase, getTournamentCodes } from '../../lib/tournament/actions'
import { isStaff } from '../../lib/tournament/permissions'
import { GROUP_MATCH_COUNT } from '../../lib/tournament/standings'

const PHASE_LABELS = {
  setup: 'In allestimento',
  group: 'Girone all’italiana',
  playoff: 'Turno preliminare',
  semifinal: 'Semifinali',
  final: 'Finali',
  completed: 'Concluso',
}

const NEXT_PHASE_ACTION = {
  setup: 'Avvia il girone',
  group: 'Chiudi il girone e genera il tabellone',
  playoff: 'Avanza alle semifinali',
  semifinal: 'Avanza alle finali',
  final: 'Concludi il torneo',
}

export default function Overview() {
  const { tournament, teams, players, matches, myRole } = useTournament()
  const staff = isStaff(myRole)

  const [codes, setCodes] = useState(null)
  const [codesError, setCodesError] = useState(null)
  const [loadingCodes, setLoadingCodes] = useState(false)

  const [confirmClose, setConfirmClose] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closeError, setCloseError] = useState(null)

  const groupMatches = matches.filter((m) => m.phase === 'group')
  const playedGroupMatches = groupMatches.filter((m) => m.status === 'played').length

  async function revealCodes() {
    setLoadingCodes(true)
    setCodesError(null)
    try {
      setCodes(await getTournamentCodes(tournament.id))
    } catch (err) {
      setCodesError(err.message)
    } finally {
      setLoadingCodes(false)
    }
  }

  async function handleClosePhase() {
    setClosing(true)
    setCloseError(null)
    try {
      await closePhase(tournament.id)
      setConfirmClose(false)
    } catch (err) {
      setCloseError(err.message)
    } finally {
      setClosing(false)
    }
  }

  return (
    <div className="stack">
      <div className="panel overview-hero">
        <span className="eyebrow">{PHASE_LABELS[tournament.phase]}</span>
        <h1>{tournament.name}</h1>
        <div className="overview-stats">
          <div>
            <strong>{teams.length}</strong>
            <span>squadre</span>
          </div>
          <div>
            <strong>{players.length}</strong>
            <span>iscritti in rosa</span>
          </div>
          <div>
            <strong>
              {playedGroupMatches}/{GROUP_MATCH_COUNT}
            </strong>
            <span>partite del girone</span>
          </div>
        </div>
      </div>

      {staff && (
        <div className="panel">
          <h2>Strumenti Host / Admin</h2>

          <div className="overview-tool">
            <div>
              <h3>Codici di invito</h3>
              <p className="text-dim">
                Condividi il codice segreto con i Giocatori e quello pubblico con gli Spettatori.
              </p>
            </div>
            {!codes ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={revealCodes}
                disabled={loadingCodes}
              >
                {loadingCodes ? 'Caricamento…' : 'Mostra codici'}
              </button>
            ) : (
              <div className="code-chips">
                <span className="code-chip">
                  <WhistleIcon size={14} /> {codes.secret_code}
                </span>
                <span className="code-chip code-chip-public">
                  <KeyIcon size={14} /> {codes.public_code}
                </span>
              </div>
            )}
          </div>
          <Alert>{codesError}</Alert>

          {tournament.phase !== 'completed' && (
            <div className="overview-tool">
              <div>
                <h3>Avanzamento fase</h3>
                <p className="text-dim">
                  Verifica lato server che tutto sia pronto prima di passare alla fase successiva.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setConfirmClose(true)}
              >
                {NEXT_PHASE_ACTION[tournament.phase]}
              </button>
            </div>
          )}
          <Alert>{closeError}</Alert>
        </div>
      )}

      <ConfirmDialog
        open={confirmClose}
        title="Confermi l'avanzamento di fase?"
        description="L'operazione verrà rifiutata se mancano risultati o requisiti del regolamento."
        confirmLabel={closing ? 'In corso…' : 'Conferma'}
        onConfirm={handleClosePhase}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  )
}

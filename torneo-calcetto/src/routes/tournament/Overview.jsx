import { useEffect, useState } from 'react'
import { CopyIcon, EyeIcon, EyeOffIcon, KeyIcon, WhistleIcon } from '../../components/icons'
import Alert from '../../components/ui/Alert'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EditableText from '../../components/ui/EditableText'
import { useTournament } from '../../context/TournamentContext'
import { closePhase, getTournamentCodes, renameTournament } from '../../lib/tournament/actions'
import { isHost, isStaff } from '../../lib/tournament/permissions'
import { GROUP_MATCH_COUNT } from '../../lib/tournament/standings'

const PHASE_LABELS = {
  setup: 'In allestimento',
  group: 'Girone all’italiana',
  playoff: 'Turno preliminare',
  semifinal: 'Semifinali',
  final: 'Finali',
  completed: 'Concluso',
}

// fasi in cui l'avanzamento è automatico (vedi TournamentContext)
const AUTO_PHASES = ['playoff', 'semifinal', 'final']

const NEXT_PHASE_ACTION = {
  setup: 'Avvia il girone',
  group: 'Chiudi il girone e genera il tabellone',
  playoff: 'Avanza alle semifinali',
  semifinal: 'Avanza alle finali',
  final: 'Concludi il torneo',
}

export default function Overview() {
  const { tournament, teams, players, matches, myRole, refresh } = useTournament()
  const staff = isStaff(myRole)
  const host = isHost(myRole)

  const [codes, setCodes] = useState(null)
  const [codesError, setCodesError] = useState(null)
  const [loadingCodes, setLoadingCodes] = useState(false)
  const [secretVisible, setSecretVisible] = useState(false)
  const [copiedCode, setCopiedCode] = useState(null)

  const [confirmClose, setConfirmClose] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closeError, setCloseError] = useState(null)

  const [renameError, setRenameError] = useState(null)

  async function handleRename(name) {
    setRenameError(null)
    try {
      await renameTournament(tournament.id, name)
      await refresh()
    } catch (err) {
      setRenameError(err.message)
    }
  }

  const groupMatches = matches.filter((m) => m.phase === 'group')
  const playedGroupMatches = groupMatches.filter((m) => m.status === 'played').length

  useEffect(() => {
    if (!staff) return
    let cancelled = false
    setLoadingCodes(true)
    setCodesError(null)
    getTournamentCodes(tournament.id)
      .then((result) => {
        if (!cancelled) setCodes(result)
      })
      .catch((err) => {
        if (!cancelled) setCodesError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoadingCodes(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament.id, staff])

  async function copyCode(code, key) {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(key)
      setTimeout(() => setCopiedCode((current) => (current === key ? null : current)), 1800)
    } catch {
      setCodesError('Impossibile copiare il codice.')
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
        <h1>
          <EditableText
            value={tournament.name}
            onSave={handleRename}
            disabled={!host}
            ariaLabel="Rinomina torneo"
            as="span"
          />
        </h1>
        <Alert>{renameError}</Alert>
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
        <div className="panel tool-panel">
          <h2>Strumenti Host / Admin</h2>

          <div className="overview-tool">
            <div>
              <h3>Codici di invito</h3>
              <p className="text-dim">
                Condividi il codice segreto con i Giocatori e quello pubblico con gli Spettatori.
              </p>
            </div>
            {loadingCodes ? (
              <span className="text-dim">Caricamento…</span>
            ) : (
              codes && (
                <div className="code-chips">
                  <span className="code-chip">
                    <WhistleIcon size={14} />
                    <span className="code-chip-value">
                      {secretVisible ? codes.secret_code : '•'.repeat(codes.secret_code.length)}
                    </span>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setSecretVisible((v) => !v)}
                      aria-label={secretVisible ? 'Nascondi codice segreto' : 'Mostra codice segreto'}
                      title={secretVisible ? 'Nascondi codice' : 'Mostra codice'}
                    >
                      {secretVisible ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                    </button>
                    <span className="copy-wrap">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => copyCode(codes.secret_code, 'secret')}
                        aria-label="Copia codice segreto"
                        title="Copia codice"
                      >
                        <CopyIcon size={14} />
                      </button>
                      {copiedCode === 'secret' && <span className="copy-toast">Copiato!</span>}
                    </span>
                  </span>
                  <span className="code-chip code-chip-public">
                    <KeyIcon size={14} />
                    <span className="code-chip-value">{codes.public_code}</span>
                    <span className="copy-wrap">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => copyCode(codes.public_code, 'public')}
                        aria-label="Copia codice pubblico"
                        title="Copia codice"
                      >
                        <CopyIcon size={14} />
                      </button>
                      {copiedCode === 'public' && <span className="copy-toast">Copiato!</span>}
                    </span>
                  </span>
                </div>
              )
            )}
          </div>
          <Alert>{codesError}</Alert>

          {tournament.phase !== 'completed' && (
            <div className="overview-tool">
              <div>
                <h3>Avanzamento fase</h3>
                <p className="text-dim">
                  {AUTO_PHASES.includes(tournament.phase)
                    ? 'Dopo il girone il tabellone avanza da solo appena i risultati del turno sono registrati: questo pulsante serve solo come ripiego.'
                    : 'Verifica lato server che tutto sia pronto prima di passare alla fase successiva.'}
                </p>
              </div>
              <button
                type="button"
                className={`btn btn-sm ${
                  AUTO_PHASES.includes(tournament.phase) ? 'btn-secondary' : 'btn-primary'
                }`}
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

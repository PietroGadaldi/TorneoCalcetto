import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckIcon, GripIcon, SwapIcon, UndoIcon } from '../../components/icons'
import Alert from '../../components/ui/Alert'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useTournament } from '../../context/TournamentContext'
import { recordMatchResult, resetMatchResult, setMatchesOrder } from '../../lib/tournament/actions'
import { isStaff } from '../../lib/tournament/permissions'
import { GROUP_MATCH_COUNT } from '../../lib/tournament/standings'

// Le partite nascono con un sort_order assegnato da close_phase; created_at
// resta come spareggio per i tornei creati prima della colonna (tutti a 0).
function byOrder(a, b) {
  return a.sort_order - b.sort_order || new Date(a.created_at) - new Date(b.created_at)
}

function moveBefore(ids, dragId, targetId) {
  const from = ids.indexOf(dragId)
  const to = ids.indexOf(targetId)
  if (from < 0 || to < 0 || from === to) return ids
  const next = ids.slice()
  next.splice(from, 1)
  next.splice(to, 0, dragId)
  return next
}

function ResultForm({ match, teamName, reversed, onSave, onReset, busy }) {
  const [home, setHome] = useState(match.home_goals ?? '')
  const [away, setAway] = useState(match.away_goals ?? '')

  // la conferma si attiva solo quando c'è davvero qualcosa da salvare:
  // così una sola icona basta al posto del bottone con etichetta
  const dirty =
    String(match.home_goals ?? '') !== String(home) || String(match.away_goals ?? '') !== String(away)
  const complete = home !== '' && away !== ''

  // l'inversione è solo di visualizzazione: gli input restano legati a
  // casa/trasferta, si scambia solo l'ordine con cui compaiono in tessera
  const top = reversed
    ? { team: match.away_team_id, value: away, onChange: setAway }
    : { team: match.home_team_id, value: home, onChange: setHome }
  const bottom = reversed
    ? { team: match.home_team_id, value: home, onChange: setHome }
    : { team: match.away_team_id, value: away, onChange: setAway }

  return (
    <form
      className="score-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSave(Number(home), Number(away))
      }}
    >
      <span className="score-team">{teamName(top.team)}</span>
      <input
        className="score-input"
        type="number"
        min="0"
        required
        value={top.value}
        onChange={(e) => top.onChange(e.target.value)}
      />
      <input
        className="score-input score-input-away"
        type="number"
        min="0"
        required
        value={bottom.value}
        onChange={(e) => bottom.onChange(e.target.value)}
      />
      <span className="score-team score-team-away">{teamName(bottom.team)}</span>
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
  // solo di visualizzazione, per tessera: non tocca casa/trasferta nel DB
  const [reversed, setReversed] = useState(() => new Set())

  function toggleReversed(id) {
    setReversed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const groupMatches = useMemo(
    () => matches.filter((m) => m.phase === 'group').sort(byOrder),
    [matches],
  )

  // Ordine mostrato: parte dal server, ma durante e subito dopo un
  // trascinamento comanda il client, altrimenti il refetch realtime scatenato
  // dalle prime update rimetterebbe le tessere nella posizione vecchia.
  const serverOrder = useMemo(() => groupMatches.map((m) => m.id), [groupMatches])
  const serverKey = serverOrder.join(',')
  const [order, setOrder] = useState(serverOrder)
  const [savingOrder, setSavingOrder] = useState(false)
  const orderRef = useRef(order)
  orderRef.current = order

  useEffect(() => {
    if (savingOrder) return
    setOrder(serverKey ? serverKey.split(',') : [])
  }, [serverKey, savingOrder])

  const ordered = useMemo(() => {
    const byId = new Map(groupMatches.map((m) => [m.id, m]))
    const list = order.map((id) => byId.get(id)).filter(Boolean)
    const seen = new Set(order)
    groupMatches.forEach((m) => {
      if (!seen.has(m.id)) list.push(m)
    })
    return list
  }, [groupMatches, order])

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

  const persistOrder = useCallback(async () => {
    const next = orderRef.current
    const current = new Map(groupMatches.map((m) => [m.id, m.sort_order]))
    const updates = next
      .map((id, i) => ({ id, sortOrder: i + 1 }))
      .filter((u) => current.get(u.id) !== u.sortOrder)
    if (updates.length === 0) return

    setSavingOrder(true)
    setError(null)
    try {
      await setMatchesOrder(updates)
      await refresh()
    } catch (err) {
      setError(err.message)
      setOrder(serverOrder) // ordine non salvato: si torna a quello del server
    } finally {
      setSavingOrder(false)
    }
  }, [groupMatches, refresh, serverOrder])

  // Trascinamento con pointer events invece dell'HTML5 drag and drop: quello
  // nativo non esiste su touch, e l'app si usa a bordo campo dal telefono.
  const dragId = useRef(null)
  const [draggingId, setDraggingId] = useState(null)

  function startDrag(e, id) {
    if (!staff) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragId.current = id
    setDraggingId(id)
  }

  function onDragMove(e) {
    if (!dragId.current) return
    // il pointer è catturato dalla presa: la tessera sotto al dito si trova
    // solo interrogando il documento nel punto in cui si trova il puntatore
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-match-id]')
    const overId = over?.dataset.matchId
    if (!overId || overId === dragId.current) return
    setOrder((prev) => moveBefore(prev, dragId.current, overId))
  }

  function endDrag() {
    if (!dragId.current) return
    dragId.current = null
    setDraggingId(null)
    persistOrder()
  }

  function nudge(e, id) {
    const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
    if (!step) return
    e.preventDefault()
    const from = orderRef.current.indexOf(id)
    const target = orderRef.current[from + step]
    if (!target) return
    setOrder((prev) => moveBefore(prev, id, target))
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
        {staff && groupMatches.length > 0 && (
          <p className="text-dim match-list-hint">
            Trascina la presa in basso a sinistra di una tessera per cambiare l&rsquo;ordine delle partite.
          </p>
        )}
        <ul
          className={`match-list ${draggingId ? 'is-reordering' : ''}`}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {ordered.map((m) => (
            <li
              key={m.id}
              data-match-id={m.id}
              className={`match-row ${m.status === 'played' ? 'is-played' : ''} ${
                draggingId === m.id ? 'is-dragging' : ''
              }`}
            >
              {staff ? (
                <>
                  <ResultForm
                    match={m}
                    teamName={teamName}
                    reversed={reversed.has(m.id)}
                    busy={busy}
                    onSave={(h, a) => run(() => recordMatchResult(m.id, h, a))}
                    onReset={() => setConfirmReset(m.id)}
                  />
                  <button
                    type="button"
                    className="match-grip"
                    title="Trascina per riordinare"
                    aria-label={`Riordina ${teamName(m.home_team_id)} contro ${teamName(m.away_team_id)}`}
                    onPointerDown={(e) => startDrag(e, m.id)}
                    onKeyDown={(e) => nudge(e, m.id)}
                    onBlur={persistOrder}
                  >
                    <GripIcon size={16} />
                  </button>
                </>
              ) : (
                <div className="score-form">
                  <span className="score-team">
                    {teamName(reversed.has(m.id) ? m.away_team_id : m.home_team_id)}
                  </span>
                  <strong className="score-input">
                    {m.status === 'played' ? (reversed.has(m.id) ? m.away_goals : m.home_goals) : '–'}
                  </strong>
                  <strong className="score-input score-input-away">
                    {m.status === 'played' ? (reversed.has(m.id) ? m.home_goals : m.away_goals) : '–'}
                  </strong>
                  <span className="score-team score-team-away">
                    {teamName(reversed.has(m.id) ? m.home_team_id : m.away_team_id)}
                  </span>
                </div>
              )}
              <button
                type="button"
                className="match-swap"
                title="Inverti l'ordine delle squadre"
                aria-label={`Inverti l'ordine di ${teamName(m.home_team_id)} contro ${teamName(m.away_team_id)}`}
                onClick={() => toggleReversed(m.id)}
              >
                <SwapIcon size={14} />
              </button>
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

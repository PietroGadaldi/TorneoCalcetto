import { useState } from 'react'
import { CrownIcon, EyeIcon, ShieldIcon, UserIcon } from '../../components/icons'
import Alert from '../../components/ui/Alert'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useAuth } from '../../context/AuthContext'
import { useTournament } from '../../context/TournamentContext'
import { removeMember, setMemberRole, setMemberStatus } from '../../lib/tournament/actions'
import { ROLE_LABELS, canManage, canPromoteToAdmin } from '../../lib/tournament/permissions'

const ROLE_ICONS = { host: CrownIcon, admin: ShieldIcon, player: UserIcon, spectator: EyeIcon }

export default function Lobby() {
  const { user } = useAuth()
  const { members, myRole, refresh, tournament } = useTournament()
  const [error, setError] = useState(null)
  const [pendingAction, setPendingAction] = useState(null) // { type, member }
  const [busy, setBusy] = useState(false)

  const sorted = members
    .slice()
    .sort((a, b) => a.profiles?.username?.localeCompare(b.profiles?.username ?? '') ?? 0)

  async function run(fn) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await refresh()
      setPendingAction(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function askExpel(member) {
    setPendingAction({ type: 'expel', member })
  }
  function askBan(member) {
    setPendingAction({ type: 'ban', member })
  }

  return (
    <div className="stack">
      <div className="section-head">
        <h2>Lobby del torneo</h2>
        <p>Gli iscritti con il codice segreto entrano come Giocatori, quelli col codice pubblico come Spettatori.</p>
      </div>

      <Alert>{error}</Alert>

      <div className="panel table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Utente</th>
              <th>Ruolo</th>
              <th>Stato</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map((member) => {
              const Icon = ROLE_ICONS[member.role]
              const isSelf = member.user_id === user.id
              const manageable = !isSelf && canManage(myRole, member.role)
              return (
                <tr key={member.id}>
                  <td className="team">
                    {member.profiles?.username ?? '—'}
                    {isSelf && <span className="text-dim"> (tu)</span>}
                  </td>
                  <td>
                    <span className={`badge badge-${member.role}`}>
                      <Icon size={13} />
                      {ROLE_LABELS[member.role]}
                    </span>
                  </td>
                  <td>
                    {member.status === 'banned' ? (
                      <span className="badge badge-danger">Bandito</span>
                    ) : (
                      <span className="text-dim">Attivo</span>
                    )}
                  </td>
                  <td className="row-actions">
                    {manageable && (
                      <>
                        {member.role === 'player' && canPromoteToAdmin(myRole) && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={busy}
                            onClick={() => run(() => setMemberRole(tournament.id, member.user_id, 'admin'))}
                          >
                            Rendi Admin
                          </button>
                        )}
                        {member.role === 'admin' && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={busy}
                            onClick={() => run(() => setMemberRole(tournament.id, member.user_id, 'player'))}
                          >
                            Rimuovi da Admin
                          </button>
                        )}
                        {member.status === 'active' ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={busy}
                            onClick={() => askBan(member)}
                          >
                            Banna
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={busy}
                            onClick={() => run(() => setMemberStatus(tournament.id, member.user_id, 'active'))}
                          >
                            Riammetti
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-danger-text"
                          disabled={busy}
                          onClick={() => askExpel(member)}
                        >
                          Espelli
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={pendingAction?.type === 'expel'}
        title={`Espellere ${pendingAction?.member.profiles?.username}?`}
        description="Potrà rientrare nel torneo usando di nuovo il codice."
        confirmLabel="Espelli"
        danger
        onConfirm={() => run(() => removeMember(tournament.id, pendingAction.member.user_id))}
        onCancel={() => setPendingAction(null)}
      />
      <ConfirmDialog
        open={pendingAction?.type === 'ban'}
        title={`Bandire ${pendingAction?.member.profiles?.username}?`}
        description="Non potrà più rientrare nel torneo con nessun codice, finché non viene riammesso."
        confirmLabel="Banna"
        danger
        onConfirm={() => run(() => setMemberStatus(tournament.id, pendingAction.member.user_id, 'banned'))}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  )
}

import { NavLink, Outlet, useParams } from 'react-router-dom'
import { BallIcon } from '../../components/icons'
import { useAuth } from '../../context/AuthContext'
import { TournamentProvider, useTournament } from '../../context/TournamentContext'
import { ROLE_LABELS } from '../../lib/tournament/permissions'

const TABS = [
  { to: '', end: true, label: 'Panoramica' },
  { to: 'lobby', label: 'Lobby' },
  { to: 'teams', label: 'Squadre' },
  { to: 'matches', label: 'Girone' },
  { to: 'standings', label: 'Classifica' },
  { to: 'bracket', label: 'Tabellone' },
]

function TournamentShell() {
  const { profile, signOut } = useAuth()
  const { tournament, myRole, loading, error } = useTournament()

  if (loading) {
    return (
      <div className="page">
        <p className="text-dim center-pad">Caricamento torneo…</p>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="page">
        <div className="panel empty-state center-pad">
          <p>{error ?? 'Torneo non trovato.'}</p>
        </div>
      </div>
    )
  }

  if (!myRole) {
    return (
      <div className="page">
        <div className="panel empty-state center-pad">
          <p>Non fai parte di questo torneo, o il tuo accesso è stato revocato.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <BallIcon size={18} />
          </span>
          {tournament.name}
        </div>
        <div className="topbar-user">
          <span className={`badge badge-${myRole}`}>{ROLE_LABELS[myRole]}</span>
          <span>{profile?.username}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={signOut}>
            Esci
          </button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `tab${isActive ? ' tab-active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="tournament-content">
        <Outlet />
      </div>
    </div>
  )
}

export default function TournamentLayout() {
  const { tournamentId } = useParams()
  return (
    <TournamentProvider tournamentId={tournamentId}>
      <TournamentShell />
    </TournamentProvider>
  )
}

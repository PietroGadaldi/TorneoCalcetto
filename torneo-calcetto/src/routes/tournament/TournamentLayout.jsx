import { NavLink, Outlet, useParams } from 'react-router-dom'
import BrandMenu from '../../components/ui/BrandMenu'
import { useAuth } from '../../context/AuthContext'
import { TournamentProvider, useTournament } from '../../context/TournamentContext'
import { resetAndGoHome } from '../../lib/recovery'
import { ROLE_LABELS } from '../../lib/tournament/permissions'

const TABS = [
  { to: '', end: true, label: 'Panoramica' },
  { to: 'lobby', label: 'Lobby' },
  { to: 'teams', label: 'Squadre' },
  { to: 'matches', label: 'Girone' },
  { to: 'standings', label: 'Classifica' },
  { to: 'scorers', label: 'Marcatori' },
  { to: 'bracket', label: 'Tabellone' },
]

function TournamentShell() {
  const { profile } = useAuth()
  const { tournament, myRole, loading, error } = useTournament()

  if (loading) {
    return (
      <div className="page">
        <p className="text-dim center-pad">Caricamento torneo…</p>
      </div>
    )
  }

  // Vicolo cieco: il torneo non si carica e da qui non si va da nessuna parte.
  // Stessa via d'uscita del boundary — si riparte puliti dalla home.
  if (error || !tournament) {
    return (
      <div className="page">
        <div className="panel empty-state center-pad stack recovery">
          <p>{error ?? 'Torneo non trovato.'}</p>
          <button type="button" className="btn btn-secondary" onClick={() => resetAndGoHome()}>
            Torna alla home
          </button>
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
          <BrandMenu />
          {tournament.name}
        </div>
        <div className="topbar-user">
          <span className={`badge badge-${myRole}`}>{ROLE_LABELS[myRole]}</span>
          <span>{profile?.username}</span>
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

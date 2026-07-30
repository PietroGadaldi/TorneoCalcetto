import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRightIcon, KeyIcon, WhistleIcon } from '../components/icons'
import Alert from '../components/ui/Alert'
import BrandMenu from '../components/ui/BrandMenu'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { createTournament, joinTournament } from '../lib/tournament/actions'
import { ROLE_LABELS } from '../lib/tournament/permissions'

const PHASE_LABELS = {
  setup: 'In allestimento',
  group: 'Girone',
  playoff: 'Turno preliminare',
  semifinal: 'Semifinali',
  final: 'Finali',
  completed: 'Concluso',
}

export default function Dashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [memberships, setMemberships] = useState(null)
  const [listError, setListError] = useState(null)

  const [tournamentName, setTournamentName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState(null)

  async function loadMemberships() {
    const { data, error } = await supabase
      .from('tournament_members')
      .select('role, status, tournaments(id, name, phase)')
      .eq('user_id', user.id)
      .eq('status', 'active')
    if (error) {
      setListError(error.message)
      return
    }
    setListError(null)
    setMemberships(data)
  }

  useEffect(() => {
    loadMemberships()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  async function handleCreate(e) {
    e.preventDefault()
    setCreateError(null)
    setCreating(true)
    try {
      const id = await createTournament(tournamentName.trim())
      navigate(`/t/${id}`)
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    setJoinError(null)
    setJoining(true)
    try {
      const id = await joinTournament(code.trim())
      navigate(`/t/${id}`)
    } catch (err) {
      setJoinError(err.message)
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <BrandMenu />
          Torneo Calcetto
        </div>
        <div className="topbar-user">
          <span>{profile?.username ?? user.email}</span>
        </div>
      </header>

      <section className="section dashboard">
        <div className="section-head">
          <h2>I tuoi tornei</h2>
          <p>Riprendi un torneo a cui partecipi o iniziane uno nuovo.</p>
        </div>

        <Alert>{listError}</Alert>

        {memberships === null && <p className="text-dim">Caricamento…</p>}

        {memberships?.length === 0 && (
          <div className="panel empty-state">
            <p>Non fai ancora parte di nessun torneo.</p>
          </div>
        )}

        {memberships && memberships.length > 0 && (
          <ul className="tournament-list">
            {memberships.map((m) => (
              <li key={m.tournaments.id}>
                <Link to={`/t/${m.tournaments.id}`} className="panel tournament-list-item">
                  <div>
                    <strong>{m.tournaments.name}</strong>
                    <span className="text-dim">
                      {PHASE_LABELS[m.tournaments.phase]} &middot; {ROLE_LABELS[m.role]}
                    </span>
                  </div>
                  <ChevronRightIcon size={18} />
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="dashboard-actions">
          <form className="panel dashboard-action-card" onSubmit={handleCreate}>
            <span className="eyebrow">
              <WhistleIcon size={16} />
              Nuovo torneo
            </span>
            <h3>Crea un torneo</h3>
            <p>Diventi automaticamente l&rsquo;Host: sei tu a generare i codici di invito.</p>
            <Alert>{createError}</Alert>
            <label className="field">
              <span>Nome del torneo</span>
              <input
                type="text"
                required
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="Es. Torneo d'estate"
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creazione…' : 'Crea torneo'}
            </button>
          </form>

          <form className="panel dashboard-action-card" onSubmit={handleJoin}>
            <span className="eyebrow">
              <KeyIcon size={16} />
              Hai un codice?
            </span>
            <h3>Entra con un codice</h3>
            <p>Il codice segreto ti fa entrare come Giocatore, quello pubblico come Spettatore.</p>
            <Alert>{joinError}</Alert>
            <label className="field">
              <span>Codice</span>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Es. LUPI4821"
              />
            </label>
            <button type="submit" className="btn btn-secondary" disabled={joining}>
              {joining ? 'Ingresso…' : 'Entra nel torneo'}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}

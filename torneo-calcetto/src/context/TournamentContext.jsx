import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { closePhase } from '../lib/tournament/actions'
import { isStaff } from '../lib/tournament/permissions'
import { useAuth } from './AuthContext'

const TournamentContext = createContext(null)

const EMPTY = { tournament: null, members: [], teams: [], players: [], matches: [] }

// Dopo il girone il tabellone avanza da solo nelle fasi KO intermedie: hanno
// sempre due partite per turno e non richiedono decisioni umane oltre al
// risultato. La finale è esclusa apposta: la conclusione del torneo resta
// un'azione manuale dello staff (pulsante "Concludi il torneo" in Panoramica).
const AUTO_PHASES = ['playoff', 'semifinal']

export function TournamentProvider({ tournamentId, children }) {
  const { user } = useAuth()
  const [state, setState] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    const [tournamentRes, membersRes, teamsRes, playersRes, matchesRes] = await Promise.all([
      supabase.from('tournaments').select('id, name, host_id, phase, created_at').eq('id', tournamentId).single(),
      supabase
        .from('tournament_members')
        .select('id, user_id, role, status, created_at, profiles(username)')
        .eq('tournament_id', tournamentId),
      supabase.from('teams').select('id, name, group_seed').eq('tournament_id', tournamentId),
      supabase
        .from('players')
        .select('id, team_id, guest_name, goals, member:tournament_members(id, user_id, role, profiles(username))')
        .eq('tournament_id', tournamentId),
      supabase.from('matches').select('*').eq('tournament_id', tournamentId),
    ])

    const firstError = [tournamentRes, membersRes, teamsRes, playersRes, matchesRes].find(
      (r) => r.error,
    )?.error
    if (firstError) {
      setError(firstError.message)
      return
    }

    setError(null)
    setState({
      tournament: tournamentRes.data,
      members: membersRes.data ?? [],
      teams: (teamsRes.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
      players: playersRes.data ?? [],
      matches: matchesRes.data ?? [],
    })
  }, [tournamentId])

  useEffect(() => {
    setLoading(true)
    fetchAll().finally(() => setLoading(false))
  }, [fetchAll])

  useEffect(() => {
    const channel = supabase
      .channel(`tournament:${tournamentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournaments', filter: `id=eq.${tournamentId}` },
        fetchAll,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_members', filter: `tournament_id=eq.${tournamentId}` },
        fetchAll,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `tournament_id=eq.${tournamentId}` },
        fetchAll,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `tournament_id=eq.${tournamentId}` },
        fetchAll,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${tournamentId}` },
        fetchAll,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tournamentId, fetchAll])

  const myMembership = state.members.find((m) => m.user_id === user?.id) ?? null
  const myRole = myMembership?.status === 'active' ? myMembership.role : null

  // Avanzamento automatico delle fasi a eliminazione diretta: appena i due
  // match del turno hanno un vincitore, il client dello staff chiude la fase
  // (close_phase resta comunque l'unica autorità: rivalida tutto lato server).
  // Il ref evita di richiamarla più volte per la stessa fase, anche in caso di
  // errore — resta il pulsante manuale in Panoramica come ripiego.
  const autoClosedPhase = useRef(null)
  useEffect(() => {
    const t = state.tournament
    if (!t || !isStaff(myRole)) return
    if (!AUTO_PHASES.includes(t.phase)) return
    if (autoClosedPhase.current === t.phase) return

    const phaseMatches = state.matches.filter((m) => m.phase === t.phase)
    if (phaseMatches.length < 2) return
    if (phaseMatches.some((m) => m.status !== 'played' || !m.winner_team_id)) return

    autoClosedPhase.current = t.phase
    closePhase(t.id)
      .then(fetchAll)
      .catch((err) => {
        console.warn('Avanzamento automatico non riuscito:', err.message)
      })
  }, [state.tournament, state.matches, myRole, fetchAll])

  const value = {
    ...state,
    myMembership,
    myRole,
    loading,
    error,
    refresh: fetchAll,
  }

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>
}

export function useTournament() {
  const ctx = useContext(TournamentContext)
  if (!ctx) throw new Error('useTournament deve essere usato dentro <TournamentProvider>')
  return ctx
}

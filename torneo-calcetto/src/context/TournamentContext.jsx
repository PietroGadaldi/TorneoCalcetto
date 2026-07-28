import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const TournamentContext = createContext(null)

const EMPTY = { tournament: null, members: [], teams: [], players: [], matches: [] }

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
        .select('id, team_id, guest_name, member:tournament_members(id, user_id, role, profiles(username))')
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

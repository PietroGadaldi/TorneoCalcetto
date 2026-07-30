// Wrapper delle scritture verso Supabase (RPC e insert/update diretti sulle
// tabelle aperte allo staff). Ogni funzione normalizza l'errore in
// un'eccezione JS con messaggio leggibile, così i componenti possono
// limitarsi a un try/catch.

import { supabase } from '../supabase'

async function call(promise) {
  const { data, error } = await promise
  if (error) throw new Error(error.message)
  return data
}

export function createTournament(name) {
  return call(supabase.rpc('create_tournament', { p_name: name }))
}

export function joinTournament(code) {
  return call(supabase.rpc('join_tournament', { p_code: code }))
}

export async function getTournamentCodes(tournamentId) {
  const rows = await call(
    supabase.rpc('get_tournament_codes', { p_tournament: tournamentId }),
  )
  return rows?.[0] ?? null
}

export function regenerateSecretCode(tournamentId) {
  return call(supabase.rpc('regenerate_secret_code', { p_tournament: tournamentId }))
}

export function setMemberRole(tournamentId, targetUserId, newRole) {
  return call(
    supabase.rpc('set_member_role', {
      p_tournament: tournamentId,
      p_target_user: targetUserId,
      p_new_role: newRole,
    }),
  )
}

export function removeMember(tournamentId, targetUserId) {
  return call(
    supabase.rpc('remove_member', {
      p_tournament: tournamentId,
      p_target_user: targetUserId,
    }),
  )
}

export function setMemberStatus(tournamentId, targetUserId, status) {
  return call(
    supabase.rpc('set_member_status', {
      p_tournament: tournamentId,
      p_target_user: targetUserId,
      p_status: status,
    }),
  )
}

export function closePhase(tournamentId) {
  return call(supabase.rpc('close_phase', { p_tournament: tournamentId }))
}

export function createTeam(tournamentId, name) {
  return call(
    supabase.from('teams').insert({ tournament_id: tournamentId, name }).select().single(),
  )
}

export function renameTeam(teamId, name) {
  return call(supabase.from('teams').update({ name }).eq('id', teamId))
}

export function addGuestPlayer(tournamentId, guestName) {
  return call(
    supabase
      .from('players')
      .insert({ tournament_id: tournamentId, guest_name: guestName })
      .select()
      .single(),
  )
}

export function renameGuestPlayer(playerId, guestName) {
  return call(supabase.from('players').update({ guest_name: guestName }).eq('id', playerId))
}

export function assignPlayerToTeam(playerId, teamId) {
  return call(supabase.from('players').update({ team_id: teamId }).eq('id', playerId))
}

export function setPlayerGoals(playerId, goals) {
  return call(supabase.from('players').update({ goals }).eq('id', playerId))
}

export function renameTournament(tournamentId, name) {
  return call(supabase.from('tournaments').update({ name }).eq('id', tournamentId))
}

export function recordMatchResult(matchId, homeGoals, awayGoals, winnerTeamId = null) {
  return call(
    supabase
      .from('matches')
      .update({
        status: 'played',
        home_goals: homeGoals,
        away_goals: awayGoals,
        winner_team_id: winnerTeamId,
      })
      .eq('id', matchId),
  )
}

// Riordino manuale delle tessere del girone: si scrivono solo le partite che
// hanno davvero cambiato posizione, così un trascinamento breve non genera 15
// update (e 15 eventi realtime) inutili.
export function setMatchesOrder(updates) {
  return Promise.all(
    updates.map(({ id, sortOrder }) =>
      call(supabase.from('matches').update({ sort_order: sortOrder }).eq('id', id)),
    ),
  )
}

export function resetMatchResult(matchId) {
  return call(supabase.from('matches').update({ status: 'scheduled' }).eq('id', matchId))
}

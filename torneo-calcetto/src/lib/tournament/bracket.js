// Risoluzione pura degli slot del tabellone a eliminazione diretta.
// Rispecchia lato client la logica di close_phase() in docs/schema.sql,
// usata per l'anteprima del tabellone prima che lo staff chiuda la fase.

export const SLOTS = {
  A: { phase: 'playoff', label: 'Turno preliminare A' },
  B: { phase: 'playoff', label: 'Turno preliminare B' },
  SF1: { phase: 'semifinal', label: 'Semifinale 1' },
  SF2: { phase: 'semifinal', label: 'Semifinale 2' },
  F34: { phase: 'final', label: 'Finale 3°/4° posto' },
  F12: { phase: 'final', label: 'Finale 1°/2° posto' },
}

// ranked: squadre ordinate 1a..6a secondo la classifica finale del girone.
export function resolvePlayoff(ranked) {
  const [, , third, fourth, fifth, sixth] = ranked
  return {
    A: [third, sixth],
    B: [fourth, fifth],
  }
}

export function resolveSemifinal(ranked, winnerA, winnerB) {
  const [first, second] = ranked
  return {
    SF1: [winnerA, second],
    SF2: [winnerB, first],
  }
}

export function resolveFinal({ sf1Winner, sf1Loser, sf2Winner, sf2Loser }) {
  return {
    F34: [sf1Loser, sf2Loser],
    F12: [sf1Winner, sf2Winner],
  }
}

export function matchWinner(match) {
  if (!match || match.status !== 'played') return null
  if (match.winner_team_id) return match.winner_team_id
  if (match.home_goals > match.away_goals) return match.home_team_id
  if (match.away_goals > match.home_goals) return match.away_team_id
  return null
}

export function matchLoser(match) {
  const winner = matchWinner(match)
  if (!winner) return null
  return winner === match.home_team_id ? match.away_team_id : match.home_team_id
}

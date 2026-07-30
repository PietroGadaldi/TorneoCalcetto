// Calcolo puro della classifica del girone all'italiana.
// Nessuna dipendenza da React/Supabase: prende array di squadre/partite e
// restituisce un array ordinato. È qui che vive il regolamento (3/1/0 punti,
// differenza reti come spareggio), testato da standings.test.js.

function pairKey(idA, idB) {
  return [idA, idB].sort().join('_')
}

export function computeStandings(teams, matches) {
  const stats = new Map(
    teams.map((t) => [
      t.id,
      { team: t, g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0 },
    ]),
  )

  const directMatch = new Map()

  for (const m of matches) {
    if (m.status !== 'played' || m.home_goals == null || m.away_goals == null) continue

    const home = stats.get(m.home_team_id)
    const away = stats.get(m.away_team_id)
    if (!home || !away) continue

    directMatch.set(pairKey(m.home_team_id, m.away_team_id), m)

    home.g += 1
    away.g += 1
    home.gf += m.home_goals
    home.gs += m.away_goals
    away.gf += m.away_goals
    away.gs += m.home_goals

    if (m.home_goals > m.away_goals) {
      home.v += 1
      away.p += 1
    } else if (m.home_goals < m.away_goals) {
      away.v += 1
      home.p += 1
    } else {
      home.n += 1
      away.n += 1
    }
  }

  // Spareggio a parità di punti: 1) risultato dello scontro diretto nel
  // girone, 2) se pareggiato o mai giocato, differenza reti generale.
  function compareRows(a, b) {
    if (a.pt !== b.pt) return b.pt - a.pt

    const direct = directMatch.get(pairKey(a.team.id, b.team.id))
    if (direct && direct.home_goals !== direct.away_goals) {
      const winnerId = direct.home_goals > direct.away_goals ? direct.home_team_id : direct.away_team_id
      if (winnerId === a.team.id) return -1
      if (winnerId === b.team.id) return 1
    }

    if (a.dr !== b.dr) return b.dr - a.dr
    if (a.gf !== b.gf) return b.gf - a.gf
    return a.team.name.localeCompare(b.team.name)
  }

  return [...stats.values()]
    .map((row) => ({
      ...row,
      dr: row.gf - row.gs,
      pt: row.v * 3 + row.n,
    }))
    .sort(compareRows)
}

// Segnala i confini di classifica (posizioni 1-6) dove punti/DR/GF non
// bastano a distinguere due squadre: la chiusura del girone li rifiuta.
export function findAmbiguousRankings(standings) {
  const ambiguous = []
  for (let i = 0; i < standings.length - 1; i++) {
    const a = standings[i]
    const b = standings[i + 1]
    if (a.pt === b.pt && a.dr === b.dr && a.gf === b.gf) {
      ambiguous.push([a.team.name, b.team.name])
    }
  }
  return ambiguous
}

export const GROUP_MATCH_COUNT = 15 // 6 squadre, girone all'italiana: C(6,2)

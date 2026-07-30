import Alert from '../../components/ui/Alert'
import { useTournament } from '../../context/TournamentContext'
import { computeStandings, findAmbiguousRankings } from '../../lib/tournament/standings'

export default function Standings() {
  const { teams, matches } = useTournament()
  const groupMatches = matches.filter((m) => m.phase === 'group')
  const standings = computeStandings(teams, groupMatches)
  const ambiguous = findAmbiguousRankings(standings)

  return (
    <div className="stack">
      <div className="section-head">
        <h2>Classifica del girone</h2>
        <p>Le prime due si qualificano direttamente alle semifinali.</p>
      </div>

      {ambiguous.length > 0 && (
        <Alert tone="warn">
          Parità non risolta tra: {ambiguous.map(([a, b]) => `${a} / ${b}`).join(', ')}. La
          chiusura del girone verrà rifiutata finché la parità coinvolge le prime 6 posizioni.
        </Alert>
      )}

      <div className="panel standings">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Squadra</th>
              <th>G</th>
              <th>V</th>
              <th>N</th>
              <th>P</th>
              <th>GF</th>
              <th>GS</th>
              <th>DR</th>
              <th>Pt</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => (
              <tr key={row.team.id} className={i < 2 ? 'qualified' : ''}>
                <td className="rank">{i + 1}</td>
                <td className="team">{row.team.name}</td>
                <td>{row.g}</td>
                <td>{row.v}</td>
                <td>{row.n}</td>
                <td>{row.p}</td>
                <td>{row.gf}</td>
                <td>{row.gs}</td>
                <td>{row.dr > 0 ? `+${row.dr}` : row.dr}</td>
                <td className="pts">{row.pt}</td>
              </tr>
            ))}
            {standings.length === 0 && (
              <tr>
                <td colSpan={10} className="text-dim">
                  Nessuna squadra ancora creata.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import {
  BallIcon,
  CrownIcon,
  EyeIcon,
  ShieldIcon,
  TrophyIcon,
  UserIcon,
} from '../components/icons'

const ROLES = [
  {
    icon: CrownIcon,
    badgeClass: 'badge-host',
    label: 'Host',
    text: 'Crea il torneo e ha il controllo assoluto: nomina gli Admin e gestisce ogni iscritto.',
  },
  {
    icon: ShieldIcon,
    badgeClass: 'badge-admin',
    label: 'Admin',
    text: 'Gestisce squadre e risultati. Non può toccare l’Host né altri Admin.',
  },
  {
    icon: UserIcon,
    badgeClass: 'badge-player',
    label: 'Giocatore',
    text: 'Entra con il codice segreto, viene assegnato a una squadra e gioca il torneo.',
  },
  {
    icon: EyeIcon,
    badgeClass: 'badge-spectator',
    label: 'Spettatore',
    text: 'Entra con il codice pubblico: segue squadre, risultati e classifica in sola lettura.',
  },
]

const STANDINGS = [
  { team: 'I Leoni', g: 5, v: 4, n: 1, p: 0, dr: 9, pt: 13 },
  { team: 'Real Garage', g: 5, v: 3, n: 1, p: 1, dr: 5, pt: 10 },
  { team: 'Atletico Bar', g: 5, v: 2, n: 2, p: 1, dr: 3, pt: 8 },
  { team: 'FC Notturni', g: 5, v: 2, n: 1, p: 2, dr: 0, pt: 7 },
  { team: 'Vecchia Guardia', g: 5, v: 1, n: 1, p: 3, dr: -4, pt: 4 },
  { team: 'Nuovi Arrivi', g: 5, v: 0, n: 0, p: 5, dr: -13, pt: 0 },
]

export default function Landing() {
  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <BallIcon size={18} />
          </span>
          Torneo Calcetto
        </div>
        <div className="topbar-user">
          <Link to="/login" className="btn btn-ghost btn-sm">
            Accedi
          </Link>
        </div>
      </header>

      <section className="hero">
        <span className="eyebrow">Calcio a 3 &middot; 6 squadre</span>
        <h1>Il tuo torneo, dalla lobby al podio</h1>
        <p className="lede">
          Crea un torneo e diventa Host, oppure entra in uno esistente con un
          codice: girone all&rsquo;italiana, play-off, semifinali e finali,
          con classifica aggiornata in tempo reale.
        </p>
        <div className="actions">
          <Link to="/register" className="btn btn-primary">
            Crea un account
          </Link>
          <Link to="/login" className="btn btn-secondary">
            Accedi
          </Link>
        </div>
      </section>

      <div className="pitch-scene" aria-hidden="true">
        <span className="spot" />
        <BallIcon size={30} className="ball" />
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Quattro ruoli, un solo torneo</h2>
          <p>Ogni codice di invito assegna automaticamente il ruolo giusto.</p>
        </div>
        <div className="roles-grid">
          {ROLES.map(({ icon: Icon, badgeClass, label, text }) => (
            <div className="panel role-card" key={label}>
              <span className={`badge ${badgeClass}`}>
                <Icon size={14} />
                {label}
              </span>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>
            <TrophyIcon
              size={20}
              style={{ verticalAlign: '-3px', marginRight: 8, color: 'var(--gold)' }}
            />
            Classifica del girone
          </h2>
          <p>Le prime due si qualificano direttamente alle semifinali.</p>
        </div>
        <div className="panel standings">
          <table>
            <thead>
              <tr>
                <th>Squadra</th>
                <th>G</th>
                <th>V</th>
                <th>N</th>
                <th>P</th>
                <th>DR</th>
                <th>Pt</th>
              </tr>
            </thead>
            <tbody>
              {STANDINGS.map((row, i) => (
                <tr key={row.team} className={i < 2 ? 'qualified' : ''}>
                  <td className="team">{row.team}</td>
                  <td>{row.g}</td>
                  <td>{row.v}</td>
                  <td>{row.n}</td>
                  <td>{row.p}</td>
                  <td>{row.dr > 0 ? `+${row.dr}` : row.dr}</td>
                  <td className="pts">{row.pt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

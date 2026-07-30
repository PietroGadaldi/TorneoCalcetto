import { Component } from 'react'
import { resetAndGoHome } from '../lib/recovery'

// Errori tipici di una PWA rimasta su una versione vecchia dei file: non sono
// bug dell'interfaccia, si risolvono solo svuotando cache e service worker.
const STALE_BUILD = /chunk|dynamically imported module|Unexpected token '<'|importScripts/i

function isStaleBuild(err) {
  return STALE_BUILD.test(String(err?.message ?? err))
}

// Rete di sicurezza sopra tutta l'app: qualunque errore in fase di render
// finisce qui invece di lasciare una pagina bianca. Lo stato locale è sempre
// ricostruibile da Supabase, quindi la via d'uscita è sempre la stessa —
// pulisci e riparti dalla home.
export default class ErrorBoundary extends Component {
  state = { error: null, resetting: false }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Errore non gestito:', error, info?.componentStack)
    // build vecchia servita dalla cache: non c'è niente da decidere per
    // l'utente, si ripulisce e si ricarica da soli
    if (isStaleBuild(error)) this.reset()
  }

  componentDidMount() {
    // il boundary vede solo il render: errori asincroni (fetch, listener,
    // caricamento di un file mancante) arrivano da questi due eventi
    window.addEventListener('error', this.onGlobalError)
    window.addEventListener('unhandledrejection', this.onGlobalRejection)
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.onGlobalError)
    window.removeEventListener('unhandledrejection', this.onGlobalRejection)
  }

  // Fuori dal render si interviene solo sugli errori da build vecchia: una
  // promise rifiutata (una query Supabase andata male, la rete che cade) è
  // già gestita dai singoli schermi con un Alert, e buttare via la pagina
  // sarebbe peggio del problema.
  onGlobalError = (e) => {
    if (isStaleBuild(e.error ?? e.message)) this.reset()
  }

  onGlobalRejection = (e) => {
    if (isStaleBuild(e.reason)) this.reset()
  }

  reset = () => {
    if (this.state.resetting) return
    this.setState({ resetting: true })
    resetAndGoHome()
  }

  render() {
    const { error, resetting } = this.state
    if (!error) return this.props.children

    return (
      <div className="page">
        <div className="panel empty-state center-pad stack recovery">
          <h2>Qualcosa è andato storto</h2>
          <p className="text-dim">
            La pagina si è bloccata per un errore imprevisto. I dati del torneo sono al sicuro sul
            server: si riparte dalla home svuotando i dati salvati sul dispositivo.
          </p>
          <button type="button" className="btn btn-primary" disabled={resetting} onClick={this.reset}>
            {resetting ? 'Pulizia in corso…' : 'Torna alla home'}
          </button>
          <p className="text-dim recovery-detail">{String(error?.message ?? error)}</p>
        </div>
      </div>
    )
  }
}

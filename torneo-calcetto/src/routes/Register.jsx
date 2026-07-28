import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BallIcon } from '../components/icons'
import Alert from '../components/ui/Alert'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { signUp } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (username.trim().length < 3) {
      setError('Il nome utente deve avere almeno 3 caratteri')
      return
    }
    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri')
      return
    }

    setSubmitting(true)
    try {
      await signUp({ email, password, username: username.trim() })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="auth-shell">
        <div className="panel auth-card">
          <h1>Controlla la tua email</h1>
          <p className="auth-lede">
            Ti abbiamo inviato un link di conferma. Dopo aver confermato l&rsquo;account
            potrai <Link to="/login">accedere</Link>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      <Link to="/" className="brand auth-brand">
        <span className="brand-mark">
          <BallIcon size={18} />
        </span>
        Torneo Calcetto
      </Link>

      <form className="panel auth-card" onSubmit={handleSubmit}>
        <h1>Crea un account</h1>
        <p className="auth-lede">Registrati per creare o partecipare a un torneo.</p>

        <Alert>{error}</Alert>

        <label className="field">
          <span>Nome utente</span>
          <input
            type="text"
            required
            minLength={3}
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Creazione in corso…' : 'Registrati'}
        </button>

        <p className="auth-switch">
          Hai già un account? <Link to="/login">Accedi</Link>
        </p>
      </form>
    </div>
  )
}

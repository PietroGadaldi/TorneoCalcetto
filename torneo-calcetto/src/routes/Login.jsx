import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BallIcon } from '../components/icons'
import Alert from '../components/ui/Alert'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn({ email, password })
      navigate(location.state?.from ?? '/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
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
        <h1>Accedi</h1>
        <p className="auth-lede">Entra per creare o raggiungere un torneo.</p>

        <Alert>{error}</Alert>

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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Accesso in corso…' : 'Accedi'}
        </button>

        <p className="auth-switch">
          Non hai un account? <Link to="/register">Registrati</Link>
        </p>
      </form>
    </div>
  )
}

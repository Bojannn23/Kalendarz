import { useState } from 'react'
import { FiCalendar, FiLogIn } from 'react-icons/fi'
import { signIn } from './eventsApi.js'
import { isSupabaseConfigured } from '../../shared/lib/supabase.js'

function AuthPanel() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFormError('')

    try {
      await signIn(email.trim(), password)
    } catch (requestError) {
      setFormError(requestError.message || 'Nie udało się zalogować.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="container py-5">
      <div className="card mx-auto auth-card">
        <div className="card-body p-4 p-md-5">
          <div className="d-flex align-items-center gap-2 mb-4">
            <span className="brand__icon"><FiCalendar /></span>
            <strong>Szkolny plan</strong>
          </div>
          <h1 className="h3 mb-2">Zaloguj się</h1>
          <p className="text-secondary mb-4">Zaloguj się, aby przeglądać kalendarz swojej szkoły.</p>

          {!isSupabaseConfigured ? (
            <div className="alert alert-warning mb-0" role="alert">
              Brak konfiguracji Supabase. Skopiuj `.env.example` do `.env.local`, uzupełnij dane projektu i uruchom ponownie aplikację.
            </div>
          ) : (
            <>
              <form className="d-grid gap-3" onSubmit={submit}>
                <label className="form-label">
                  Adres e-mail
                  <input
                    className="form-control mt-1"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </label>
                <label className="form-label">
                  Hasło
                  <input
                    className="form-control mt-1"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </label>
                {formError && <p className="text-danger small mb-0" role="alert">{formError}</p>}
                <button className="btn btn-success" type="submit" disabled={submitting}>
                  <FiLogIn className="me-2" />
                  {submitting ? 'Logowanie…' : 'Zaloguj się'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default AuthPanel

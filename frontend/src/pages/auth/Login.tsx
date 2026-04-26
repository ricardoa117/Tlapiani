import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import './login.css'

function Login() {
    const navigate = useNavigate()
    const [usuario, setUsuario] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        await new Promise(r => setTimeout(r, 800))
        if (usuario === 'admin' && password === '1234') {
            navigate('/admin')
        } else {
            setError('Usuario o contraseña incorrectos.')
        }
        setLoading(false)
    }

    return (
        <div className="login-wrapper">
            <div className="login-overlay" />
            <div className="login-grid">

                <div className="login-card">
                    <svg className="login-avatar" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>

                    <h1 className="login-title">LOGIN</h1>

                    <form className="login-form" onSubmit={handleSubmit}>
                        <div>
                            <label className="login-label" htmlFor="usuario">usuario:</label>
                            <input
                                id="usuario"
                                className="login-input"
                                type="text"
                                value={usuario}
                                onChange={e => { setUsuario(e.target.value); setError('') }}
                                required
                            />
                        </div>
                        <div>
                            <label className="login-label" htmlFor="password">Contraseña:</label>
                            <input
                                id="password"
                                className="login-input"
                                type="password"
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError('') }}
                                required
                            />
                        </div>

                        {error && <p className="login-error">{error}</p>}

                        <div className="login-buttons">
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? 'Cargando...' : 'Iniciar sesión'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={() => navigate('/registro')}>
                                Registrar
                            </button>
                        </div>
                    </form>
                </div>

                <div className="login-right">
                    <div className="login-brand">
                        <div className="login-brand-logo">x</div>
                        <span className="login-brand-name">HACKGRICULTORES</span>
                    </div>
                    <div className="login-info-card">
                        <h3 className="login-info-title">Tlapiani: Guardián de la Tierra en tu propia lengua.</h3>
                        <p className="login-info-text">
                            Conectamos la sabiduría del campo con la precisión del espacio.
                            A través de datos satelitales de la NASA y modelos climáticos avanzados,
                            protegemos tus cultivos contra plagas y optimizamos el riego.
                            Todo en tiempo real, directo a tu WhatsApp y en tu idioma:
                            Náhuatl o Español.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default Login
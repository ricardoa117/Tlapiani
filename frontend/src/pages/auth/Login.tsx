import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { actualizarDatosProductor } from '../../lib/nasaUpdater'
import './login.css'

function Login() {
    const navigate = useNavigate()
    const [folio, setFolio] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const { data, error: err } = await supabase
            .from('productores')
            .select('id, folio, nombre, idioma_preferido, tipo_acceso, rol, municipio_id')
            .eq('folio', folio)
            .eq('password', password)
            .eq('activo', true)
            .single()

        setLoading(false)

        if (err || !data) {
            setError('Folio o contraseña incorrectos.')
            return
        }

        localStorage.setItem('usuario', JSON.stringify(data))

        if (data.rol === 'productor') {
            actualizarDatosProductor(data.id).catch(console.error)
        }

        if (data.rol === 'admin') {
            navigate('/admin/dashboard')
        } else {
            navigate('/productor/dashboard')
        }
    }

    return (
        <div className="login-wrapper">
            <div className="login-overlay" />
            <div className="login-grid">

                {/* ── TARJETA FORMULARIO ── */}
                <div className="login-card">
                    <svg className="login-avatar" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>

                    <h1 className="login-title">LOGIN</h1>

                    <form className="login-form" onSubmit={handleSubmit}>
                        <div>
                            <label className="login-label" htmlFor="folio">Folio</label>
                            <input
                                id="folio"
                                className="login-input"
                                type="text"
                                value={folio}
                                placeholder="Tu folio asignado"
                                onChange={e => { setFolio(e.target.value); setError('') }}
                                required
                            />
                        </div>
                        <div>
                            <label className="login-label" htmlFor="password">Contraseña</label>
                            <input
                                id="password"
                                className="login-input"
                                type="password"
                                value={password}
                                placeholder="••••••••"
                                onChange={e => { setPassword(e.target.value); setError('') }}
                                required
                            />
                        </div>

                        {error && <p className="login-error">⚠ {error}</p>}

                        <div className="login-buttons">
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? '⏳ Cargando...' : 'Iniciar sesión'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={() => navigate('/registro')}>
                                Registrar
                            </button>
                        </div>
                    </form>
                </div>

                {/* ── COLUMNA DERECHA ── */}
                <div className="login-right">
                    <div className="login-brand">
                        <div className="login-brand-logo" />
                        <span className="login-brand-name">HACKGRICULTORES</span>
                    </div>

                    <div className="login-info-card">
                        <h3 className="login-info-title">
                            Tlapiani: Guardián de la Tierra en tu propia lengua.
                        </h3>
                        <p className="login-info-text">
                            Conectamos la sabiduría del campo con la precisión del espacio.
                            Datos satelitales NASA, modelos climáticos avanzados y alertas
                            de plagas en tiempo real — directo a tu WhatsApp, en Náhuatl o Español.
                        </p>
                        <div className="login-features">
                            <span className="login-feature-chip">🛰 NASA / MODIS</span>
                            <span className="login-feature-chip">🌾 NDVI Real-time</span>
                            <span className="login-feature-chip">📱 WhatsApp</span>
                            <span className="login-feature-chip">🗣 Náhuatl</span>
                            <span className="login-feature-chip">🐛 Alertas Plagas</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default Login

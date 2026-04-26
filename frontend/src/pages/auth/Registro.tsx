import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './Registro.css'

type Paso = 1 | 2 | 3 | 4

interface DatosProductor {
    nombre: string
    apellidos: string
    folio: string
    password: string
    confirmPassword: string
    telefono: string
    idioma_preferido: 'es' | 'nah'
    tipo_acceso: 'whatsapp' | 'web' | 'ambos'
    estado: string
    municipio: string
    comunidad: string
    latitud: string
    longitud: string
}

function Registro() {
    const navigate = useNavigate()
    const [paso, setPaso] = useState<Paso>(1)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const [datos, setDatos] = useState<DatosProductor>({
        nombre: '',
        apellidos: '',
        folio: '',
        password: '',
        confirmPassword: '',
        telefono: '',
        idioma_preferido: 'es',
        tipo_acceso: 'web',
        estado: '',
        municipio: '',
        comunidad: '',
        latitud: '',
        longitud: '',
    })

    const actualizar = (campo: keyof DatosProductor, valor: string) => {
        setDatos(prev => ({ ...prev, [campo]: valor }))
        setError('')
    }

    const siguientePaso = () => {
        if (paso === 1) {
            if (!datos.nombre || !datos.apellidos || !datos.folio) {
                setError('Por favor completa todos los campos.')
                return
            }
        }
        if (paso === 2) {
            if (!datos.password || !datos.confirmPassword) {
                setError('Por favor ingresa y confirma tu contraseña.')
                return
            }
            if (datos.password !== datos.confirmPassword) {
                setError('Las contraseñas no coinciden.')
                return
            }
            if (datos.password.length < 6) {
                setError('La contraseña debe tener al menos 6 caracteres.')
                return
            }
        }
        if (paso === 3) {
            if (!datos.estado || !datos.municipio) {
                setError('Por favor ingresa tu estado y municipio.')
                return
            }
        }
        setError('')
        setPaso((prev) => (prev + 1) as Paso)
    }

    const anteriorPaso = () => {
        setError('')
        setPaso((prev) => (prev - 1) as Paso)
    }

    const obtenerUbicacion = () => {
        if (!navigator.geolocation) {
            setError('Tu navegador no soporta geolocalización.')
            return
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                actualizar('latitud', pos.coords.latitude.toFixed(6))
                actualizar('longitud', pos.coords.longitude.toFixed(6))
            },
            () => setError('No se pudo obtener la ubicación.')
        )
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Verificar que el folio no exista
        const { data: existing } = await supabase
            .from('productores')
            .select('id')
            .eq('folio', datos.folio)
            .single()

        if (existing) {
            setError('Este folio ya está registrado.')
            setLoading(false)
            return
        }

        const { error: insertErr } = await supabase
            .from('productores')
            .insert([{
                nombre: datos.nombre,
                apellidos: datos.apellidos,
                folio: datos.folio,
                password: datos.password,
                telefono: datos.telefono,
                idioma_preferido: datos.idioma_preferido,
                tipo_acceso: datos.tipo_acceso,
                estado: datos.estado,
                municipio: datos.municipio,
                comunidad: datos.comunidad,
                latitud: datos.latitud ? parseFloat(datos.latitud) : null,
                longitud: datos.longitud ? parseFloat(datos.longitud) : null,
                rol: 'productor',
                activo: true,
            }])

        setLoading(false)

        if (insertErr) {
            setError('Error al registrar: ' + insertErr.message)
            return
        }

        navigate('/')
    }

    const pasos = [1, 2, 3, 4]

    return (
        <div className="registro-wrapper">
            <div className="registro-overlay" />
            <div className="registro-content">

                {/* Barra superior */}
                <div className="registro-topbar">
                    <div className="topbar-logo" />
                    <div className="topbar-brand">
                        <span className="topbar-brand-name">TLAPIANI</span>
                    </div>
                    <div className="topbar-divider" />
                    <div className="topbar-stepper">
                        {pasos.map((p, i) => (
                            <div key={p} style={{ display: 'flex', alignItems: 'center' }}>
                                <div
                                    className={`step ${paso > p ? 'step--done' : paso === p ? 'step--active' : 'step--pending'}`}
                                />
                                {i < pasos.length - 1 && <div className="step-line" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Título de sección */}
                <h2 className="registro-section-title">
                    {paso === 1 && 'Datos Personales'}
                    {paso === 2 && 'Seguridad'}
                    {paso === 3 && 'Ubicación'}
                    {paso === 4 && 'Preferencias'}
                </h2>

                {/* Formulario */}
                <form onSubmit={handleSubmit}>
                    <div className="form-box">
                        <p className="step-indicator">Paso {paso} de 4</p>

                        {/* PASO 1 - Datos personales */}
                        {paso === 1 && (
                            <>
                                <div className="input-group">
                                    <label>Nombre(s)</label>
                                    <input
                                        type="text"
                                        value={datos.nombre}
                                        onChange={e => actualizar('nombre', e.target.value)}
                                        placeholder="Tu nombre"
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Apellidos</label>
                                    <input
                                        type="text"
                                        value={datos.apellidos}
                                        onChange={e => actualizar('apellidos', e.target.value)}
                                        placeholder="Tus apellidos"
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Folio (ID de acceso)</label>
                                    <input
                                        type="text"
                                        value={datos.folio}
                                        onChange={e => actualizar('folio', e.target.value)}
                                        placeholder="Ej: PROD-001"
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Teléfono (WhatsApp)</label>
                                    <input
                                        type="tel"
                                        value={datos.telefono}
                                        onChange={e => actualizar('telefono', e.target.value)}
                                        placeholder="+52 000 000 0000"
                                    />
                                </div>
                                <button type="button" className="btn-siguiente" onClick={siguientePaso}>
                                    Siguiente →
                                </button>
                            </>
                        )}

                        {/* PASO 2 - Contraseña */}
                        {paso === 2 && (
                            <>
                                <div className="input-group">
                                    <label>Contraseña</label>
                                    <input
                                        type="password"
                                        value={datos.password}
                                        onChange={e => actualizar('password', e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Confirmar contraseña</label>
                                    <input
                                        type="password"
                                        value={datos.confirmPassword}
                                        onChange={e => actualizar('confirmPassword', e.target.value)}
                                        placeholder="Repite tu contraseña"
                                        required
                                    />
                                </div>
                                <div className="row-btns">
                                    <button type="button" className="btn-atras-inline" onClick={anteriorPaso}>← Atrás</button>
                                    <button type="button" className="btn-siguiente-inline" onClick={siguientePaso}>Siguiente →</button>
                                </div>
                            </>
                        )}

                        {/* PASO 3 - Ubicación */}
                        {paso === 3 && (
                            <>
                                <div className="input-group">
                                    <label>Estado</label>
                                    <input
                                        type="text"
                                        value={datos.estado}
                                        onChange={e => actualizar('estado', e.target.value)}
                                        placeholder="Ej: Puebla"
                                        required
                                    />
                                </div>
                                <div className="row">
                                    <div className="input-group flex-1">
                                        <label>Municipio</label>
                                        <input
                                            type="text"
                                            value={datos.municipio}
                                            onChange={e => actualizar('municipio', e.target.value)}
                                            placeholder="Tu municipio"
                                            required
                                        />
                                    </div>
                                    <div className="input-group flex-1">
                                        <label>Comunidad</label>
                                        <input
                                            type="text"
                                            value={datos.comunidad}
                                            onChange={e => actualizar('comunidad', e.target.value)}
                                            placeholder="Tu comunidad"
                                        />
                                    </div>
                                </div>
                                <button type="button" className="btn-location" onClick={obtenerUbicacion}>
                                    📍 Usar mi ubicación actual
                                </button>
                                <div className="row">
                                    <div className="input-group flex-1">
                                        <label>Latitud</label>
                                        <input
                                            type="text"
                                            value={datos.latitud}
                                            onChange={e => actualizar('latitud', e.target.value)}
                                            placeholder="Automático"
                                            className={datos.latitud ? '' : 'input-readonly'}
                                            readOnly={!datos.latitud}
                                        />
                                    </div>
                                    <div className="input-group flex-1">
                                        <label>Longitud</label>
                                        <input
                                            type="text"
                                            value={datos.longitud}
                                            onChange={e => actualizar('longitud', e.target.value)}
                                            placeholder="Automático"
                                            className={datos.longitud ? '' : 'input-readonly'}
                                            readOnly={!datos.longitud}
                                        />
                                    </div>
                                </div>
                                <div className="row-btns">
                                    <button type="button" className="btn-atras-inline" onClick={anteriorPaso}>← Atrás</button>
                                    <button type="button" className="btn-siguiente-inline" onClick={siguientePaso}>Siguiente →</button>
                                </div>
                            </>
                        )}

                        {/* PASO 4 - Preferencias */}
                        {paso === 4 && (
                            <>
                                <div className="input-group">
                                    <label>Idioma preferido</label>
                                    <div className="btn-group-2">
                                        <button
                                            type="button"
                                            className={`opt-btn ${datos.idioma_preferido === 'es' ? 'active' : ''}`}
                                            onClick={() => actualizar('idioma_preferido', 'es')}
                                        >
                                            🇲🇽 Español
                                        </button>
                                        <button
                                            type="button"
                                            className={`opt-btn ${datos.idioma_preferido === 'nah' ? 'active' : ''}`}
                                            onClick={() => actualizar('idioma_preferido', 'nah')}
                                        >
                                            🌽 Náhuatl
                                        </button>
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label>Tipo de acceso</label>
                                    <div className="btn-group-3">
                                        <button
                                            type="button"
                                            className={`opt-btn ${datos.tipo_acceso === 'web' ? 'active' : ''}`}
                                            onClick={() => actualizar('tipo_acceso', 'web')}
                                        >
                                            💻 Web
                                        </button>
                                        <button
                                            type="button"
                                            className={`opt-btn ${datos.tipo_acceso === 'whatsapp' ? 'active' : ''}`}
                                            onClick={() => actualizar('tipo_acceso', 'whatsapp')}
                                        >
                                            📱 WhatsApp
                                        </button>
                                        <button
                                            type="button"
                                            className={`opt-btn ${datos.tipo_acceso === 'ambos' ? 'active' : ''}`}
                                            onClick={() => actualizar('tipo_acceso', 'ambos')}
                                        >
                                            🌐 Ambos
                                        </button>
                                    </div>
                                </div>

                                {error && <p className="login-error">{error}</p>}

                                <div className="row-btns">
                                    <button type="button" className="btn-atras-inline" onClick={anteriorPaso}>← Atrás</button>
                                    <button type="submit" className="btn-siguiente-inline" disabled={loading}>
                                        {loading ? 'Registrando...' : '✅ Finalizar'}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Error global (pasos 1-3) */}
                        {error && paso !== 4 && <p className="login-error" style={{ marginTop: '0.75rem' }}>{error}</p>}
                    </div>
                </form>

                <button className="registro-back-btn" onClick={() => navigate('/')}>
                    ← Volver al Login
                </button>
            </div>
        </div>
    )
}

export default Registro
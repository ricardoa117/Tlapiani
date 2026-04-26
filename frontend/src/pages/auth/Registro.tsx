import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './Registro.css'

// ── Tipos ────────────────────────────────────────────────────────────────────

type Paso = 0 | 1 | 2 | 3

interface Municipio {
    id: number
    nombre: string
}

interface Cultivo {
    cultivo: string
    hectareas: string
    etapa: string
}

interface DatosParcela {
    nombre_parcela: string
    latitud: string
    longitud: string
    hectareas: string
    tipo_suelo: string
    ph_suelo: string
}

interface DatosProductor {
    nombre: string
    telefono: string
    password: string
    confirmPassword: string
    municipio_id: string
    idioma_preferido: 'es' | 'nah'
    tipo_acceso: 'smartphone' | 'sms' | 'sin_celular'
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function Registro() {
    const navigate = useNavigate()

    const [paso, setPaso] = useState<Paso>(0)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [exito, setExito] = useState('')
    const [municipios, setMunicipios] = useState<Municipio[]>([])

    const [datos, setDatos] = useState<DatosProductor>({
        nombre: '',
        telefono: '',
        password: '',
        confirmPassword: '',
        municipio_id: '',
        idioma_preferido: 'es',
        tipo_acceso: 'smartphone',
    })

    const [parcela, setParcela] = useState<DatosParcela>({
        nombre_parcela: '',
        latitud: '',
        longitud: '',
        hectareas: '1',
        tipo_suelo: 'franco',
        ph_suelo: '6.5',
    })

    const [cultivos, setCultivos] = useState<Cultivo[]>([
        { cultivo: 'maiz', hectareas: '1', etapa: 'vegetativa' },
    ])

    // Cargar municipios al montar
    useEffect(() => {
        supabase
            .from('municipios')
            .select('id, nombre')
            .order('nombre', { ascending: true })
            .then(({ data }) => setMunicipios(data || []))
    }, [])

    // ── Helpers ──────────────────────────────────────────────────────────────

    const actualizarDatos = (campo: keyof DatosProductor, valor: string) => {
        setDatos(prev => ({ ...prev, [campo]: valor }))
        setError('')
    }

    const actualizarParcela = (campo: keyof DatosParcela, valor: string) => {
        setParcela(prev => ({ ...prev, [campo]: valor }))
        setError('')
    }

    const actualizarCultivo = (idx: number, campo: keyof Cultivo, valor: string) => {
        setCultivos(prev => prev.map((c, i) => i === idx ? { ...c, [campo]: valor } : c))
    }

    const agregarCultivo = () =>
        setCultivos(prev => [...prev, { cultivo: 'maiz', hectareas: '1', etapa: 'vegetativa' }])

    const eliminarCultivo = (idx: number) =>
        setCultivos(prev => prev.filter((_, i) => i !== idx))

    const obtenerUbicacion = () => {
        if (!navigator.geolocation) {
            setError('Tu navegador no soporta geolocalización.')
            return
        }
        navigator.geolocation.getCurrentPosition(
            pos => {
                actualizarParcela('latitud', pos.coords.latitude.toFixed(6))
                actualizarParcela('longitud', pos.coords.longitude.toFixed(6))
            },
            () => setError('No se pudo obtener la ubicación. Ingresa las coordenadas manualmente.')
        )
    }

    // ── Validaciones por paso ─────────────────────────────────────────────────

    const validarPaso1 = (): boolean => {
        if (!datos.nombre.trim()) { setError('El nombre es obligatorio.'); return false }
        if (!datos.password) { setError('La contraseña es obligatoria.'); return false }
        if (datos.password !== datos.confirmPassword) { setError('Las contraseñas no coinciden.'); return false }
        if (!datos.municipio_id) { setError('Selecciona tu municipio.'); return false }
        return true
    }

    const validarPaso2 = (): boolean => {
        if (!parcela.nombre_parcela.trim()) { setError('El nombre de la parcela es obligatorio.'); return false }
        if (!parcela.latitud || !parcela.longitud) { setError('Ingresa o captura las coordenadas de la parcela.'); return false }
        if (!parcela.hectareas || Number(parcela.hectareas) <= 0) { setError('Las hectáreas deben ser mayor a 0.'); return false }
        return true
    }

    const siguientePaso = () => {
        setError('')
        if (paso === 1 && !validarPaso1()) return
        if (paso === 2 && !validarPaso2()) return
        setPaso(prev => (prev + 1) as Paso)
    }

    const anteriorPaso = () => {
        setError('')
        setPaso(prev => (prev - 1) as Paso)
    }

    // ── Submit final ──────────────────────────────────────────────────────────

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // 1. Generar folio único
            const folio = 'TLP-' + Date.now().toString(36).toUpperCase()

            // 2. Insertar productor
            const { data: prodData, error: prodErr } = await supabase
                .from('productores')
                .insert([{
                    folio,
                    nombre: datos.nombre.trim(),
                    telefono: datos.telefono.trim() || null,
                    password: datos.password,
                    municipio_id: Number(datos.municipio_id),
                    idioma_preferido: datos.idioma_preferido,
                    tipo_acceso: datos.tipo_acceso,
                    rol: 'productor',
                    activo: true,
                }])
                .select('id')
                .single()

            if (prodErr || !prodData) throw new Error(prodErr?.message || 'Error al crear productor')

            const productorId = prodData.id

            // 3. Insertar parcela
            const { data: parcelaData, error: parcelaErr } = await supabase
                .from('parcelas')
                .insert([{
                    productor_id: productorId,
                    nombre: parcela.nombre_parcela.trim(),
                    latitud: parseFloat(parcela.latitud),
                    longitud: parseFloat(parcela.longitud),
                    municipio_id: Number(datos.municipio_id),
                    hectareas: parseFloat(parcela.hectareas),
                    tipo_suelo: parcela.tipo_suelo,
                    ph_suelo: parseFloat(parcela.ph_suelo),
                }])
                .select('id')
                .single()

            if (parcelaErr || !parcelaData) throw new Error(parcelaErr?.message || 'Error al crear parcela')

            const parcelaId = parcelaData.id

            // 4. Insertar lotes de cultivo
            if (cultivos.length > 0) {
                const lotes = cultivos.map(c => ({
                    parcela_id: parcelaId,
                    cultivo: c.cultivo,
                    hectareas: parseFloat(c.hectareas) || 1,
                    etapa_fenologica: c.etapa,
                    fecha_siembra: new Date().toISOString().split('T')[0],
                }))
                const { error: lotesErr } = await supabase.from('lotes_cultivo').insert(lotes)
                if (lotesErr) throw new Error(lotesErr.message)
            }

            // 5. Éxito
            setExito(folio)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    // ── Pantalla de éxito ─────────────────────────────────────────────────────

    if (exito) {
        return (
            <div className="registro-wrapper">
                <div className="registro-overlay" />
                <div className="registro-content" style={{ justifyContent: 'center', minHeight: '80vh' }}>
                    <div className="form-box" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                        <h2 style={{ color: '#b8860b', fontFamily: 'Georgia, serif', marginBottom: '1rem' }}>
                            ¡Registro exitoso!
                        </h2>
                        <p style={{ color: '#f0ebdc', marginBottom: '0.5rem' }}>Tu folio de acceso es:</p>
                        <div style={{
                            background: '#6b1a2a', border: '2px solid #b8860b',
                            borderRadius: '8px', padding: '1rem 2rem', display: 'inline-block',
                            fontSize: '1.5rem', fontWeight: 900, color: '#b8860b',
                            letterSpacing: '0.15em', margin: '1rem 0',
                        }}>
                            {exito}
                        </div>
                        <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '2rem' }}>
                            Guarda este folio, lo necesitarás para iniciar sesión.
                        </p>
                        <button className="btn-siguiente" onClick={() => navigate('/login')}>
                            Ir al Login
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ── Labels del stepper ────────────────────────────────────────────────────

    const pasosTitulos = ['Tipo de cuenta', 'Datos personales', 'Mi parcela', 'Mis cultivos']

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
                        {[0, 1, 2, 3].map((p, i) => (
                            <div key={p} style={{ display: 'flex', alignItems: 'center' }}>
                                <div
                                    className={`step ${paso > p ? 'step--done' : paso === p ? 'step--active' : 'step--pending'}`}
                                />
                                {i < 3 && <div className="step-line" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Título de sección */}
                <h2 className="registro-section-title">{pasosTitulos[paso]}</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-box">
                        <p className="step-indicator">Paso {paso + 1} de 4</p>

                        {/* ── PASO 0: Selección tipo de cuenta ── */}
                        {paso === 0 && (
                            <>
                                <div className="registro-cards-grid">
                                    <div
                                        className="account-card"
                                        onClick={() => { setError(''); setPaso(1) }}
                                    >
                                        <svg className="account-card-icon" viewBox="0 0 24 24">
                                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                        </svg>
                                        <span className="account-card-title">Productor</span>
                                        <p style={{ color: '#555', textAlign: 'center', fontSize: '0.9rem' }}>
                                            Registra tu parcela, cultivos y accede a monitoreo satelital.
                                        </p>
                                    </div>
                                    <div
                                        className="account-card"
                                        onClick={() => setError('Los administradores se crean directamente en la base de datos. Contacta al equipo técnico.')}
                                        style={{ opacity: 0.7 }}
                                    >
                                        <svg className="account-card-icon" viewBox="0 0 24 24">
                                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                                        </svg>
                                        <span className="account-card-title">Administrador</span>
                                        <p style={{ color: '#555', textAlign: 'center', fontSize: '0.9rem' }}>
                                            Solo para personal autorizado. No disponible en registro público.
                                        </p>
                                    </div>
                                </div>
                                {error && <p className="login-error" style={{ marginTop: '1rem' }}>{error}</p>}
                            </>
                        )}

                        {/* ── PASO 1: Datos personales ── */}
                        {paso === 1 && (
                            <>
                                <div className="input-group">
                                    <label>Nombre completo *</label>
                                    <input
                                        type="text"
                                        value={datos.nombre}
                                        onChange={e => actualizarDatos('nombre', e.target.value)}
                                        placeholder="Tu nombre completo"
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Teléfono (opcional)</label>
                                    <input
                                        type="tel"
                                        value={datos.telefono}
                                        onChange={e => actualizarDatos('telefono', e.target.value)}
                                        placeholder="+52 000 000 0000"
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Contraseña *</label>
                                    <input
                                        type="password"
                                        value={datos.password}
                                        onChange={e => actualizarDatos('password', e.target.value)}
                                        placeholder="Contraseña de acceso"
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Confirmar contraseña *</label>
                                    <input
                                        type="password"
                                        value={datos.confirmPassword}
                                        onChange={e => actualizarDatos('confirmPassword', e.target.value)}
                                        placeholder="Repite tu contraseña"
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Municipio *</label>
                                    <select
                                        value={datos.municipio_id}
                                        onChange={e => actualizarDatos('municipio_id', e.target.value)}
                                        required
                                    >
                                        <option value="">— Selecciona tu municipio —</option>
                                        {municipios.map(m => (
                                            <option key={m.id} value={m.id}>{m.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Idioma preferido</label>
                                    <div className="btn-group-2">
                                        <button
                                            type="button"
                                            className={`opt-btn ${datos.idioma_preferido === 'es' ? 'active' : ''}`}
                                            onClick={() => actualizarDatos('idioma_preferido', 'es')}
                                        >🇲🇽 Español</button>
                                        <button
                                            type="button"
                                            className={`opt-btn ${datos.idioma_preferido === 'nah' ? 'active' : ''}`}
                                            onClick={() => actualizarDatos('idioma_preferido', 'nah')}
                                        >Náhuatl</button>
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label>Tipo de acceso</label>
                                    <div className="btn-group-3">
                                        <button
                                            type="button"
                                            className={`opt-btn ${datos.tipo_acceso === 'smartphone' ? 'active' : ''}`}
                                            onClick={() => actualizarDatos('tipo_acceso', 'smartphone')}
                                        >Smartphone</button>
                                        <button
                                            type="button"
                                            className={`opt-btn ${datos.tipo_acceso === 'sms' ? 'active' : ''}`}
                                            onClick={() => actualizarDatos('tipo_acceso', 'sms')}
                                        >Solo SMS</button>
                                        <button
                                            type="button"
                                            className={`opt-btn ${datos.tipo_acceso === 'sin_celular' ? 'active' : ''}`}
                                            onClick={() => actualizarDatos('tipo_acceso', 'sin_celular')}
                                        >Sin celular</button>
                                    </div>
                                </div>

                                {error && <p className="login-error">{error}</p>}

                                <div className="row-btns">
                                    <button type="button" className="btn-atras-inline" onClick={anteriorPaso}>← Atrás</button>
                                    <button type="button" className="btn-siguiente-inline" onClick={siguientePaso}>Siguiente →</button>
                                </div>
                            </>
                        )}

                        {/* ── PASO 2: Parcela ── */}
                        {paso === 2 && (
                            <>
                                <div className="input-group">
                                    <label>Nombre de la parcela *</label>
                                    <input
                                        type="text"
                                        value={parcela.nombre_parcela}
                                        onChange={e => actualizarParcela('nombre_parcela', e.target.value)}
                                        placeholder="Ej: Milpa del cerro"
                                        required
                                    />
                                </div>
                                <button type="button" className="btn-location" onClick={obtenerUbicacion}>
                                    📍 Usar mi ubicación actual
                                </button>
                                <div className="row">
                                    <div className="input-group flex-1">
                                        <label>Latitud *</label>
                                        <input
                                            type="number"
                                            step="0.000001"
                                            value={parcela.latitud}
                                            onChange={e => actualizarParcela('latitud', e.target.value)}
                                            placeholder="18.4615"
                                        />
                                    </div>
                                    <div className="input-group flex-1">
                                        <label>Longitud *</label>
                                        <input
                                            type="number"
                                            step="0.000001"
                                            value={parcela.longitud}
                                            onChange={e => actualizarParcela('longitud', e.target.value)}
                                            placeholder="-97.3897"
                                        />
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="input-group flex-1">
                                        <label>Hectáreas *</label>
                                        <input
                                            type="number"
                                            min="0.1"
                                            step="0.1"
                                            value={parcela.hectareas}
                                            onChange={e => actualizarParcela('hectareas', e.target.value)}
                                        />
                                    </div>
                                    <div className="input-group flex-1">
                                        <label>pH del suelo</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="14"
                                            step="0.1"
                                            value={parcela.ph_suelo}
                                            onChange={e => actualizarParcela('ph_suelo', e.target.value)}
                                            placeholder="6.5"
                                        />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label>Tipo de suelo</label>
                                    <select
                                        value={parcela.tipo_suelo}
                                        onChange={e => actualizarParcela('tipo_suelo', e.target.value)}
                                    >
                                        <option value="arcilloso">Arcilloso</option>
                                        <option value="arenoso">Arenoso</option>
                                        <option value="limoso">Limoso</option>
                                        <option value="franco">Franco</option>
                                    </select>
                                </div>

                                {error && <p className="login-error">{error}</p>}

                                <div className="row-btns">
                                    <button type="button" className="btn-atras-inline" onClick={anteriorPaso}>← Atrás</button>
                                    <button type="button" className="btn-siguiente-inline" onClick={siguientePaso}>Siguiente →</button>
                                </div>
                            </>
                        )}

                        {/* ── PASO 3: Cultivos ── */}
                        {paso === 3 && (
                            <>
                                {cultivos.map((c, idx) => (
                                    <div key={idx} style={{
                                        border: '1px solid #b8860b', borderRadius: '8px',
                                        padding: '1rem', marginBottom: '1rem', position: 'relative',
                                    }}>
                                        <p style={{ color: '#b8860b', marginBottom: '0.75rem', fontWeight: 'bold' }}>
                                            Cultivo {idx + 1}
                                        </p>
                                        {cultivos.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => eliminarCultivo(idx)}
                                                style={{
                                                    position: 'absolute', top: '0.5rem', right: '0.5rem',
                                                    background: 'transparent', border: 'none',
                                                    color: '#f87171', cursor: 'pointer', fontSize: '1rem',
                                                }}
                                            >✕</button>
                                        )}
                                        <div className="input-group">
                                            <label>Cultivo</label>
                                            <select
                                                value={c.cultivo}
                                                onChange={e => actualizarCultivo(idx, 'cultivo', e.target.value)}
                                            >
                                                <option value="maiz">Maíz</option>
                                                <option value="frijol">Frijol</option>
                                                <option value="aguacate">Aguacate</option>
                                                <option value="cafe">Café</option>
                                                <option value="calabaza">Calabaza</option>
                                                <option value="hortalizas">Hortalizas</option>
                                            </select>
                                        </div>
                                        <div className="row">
                                            <div className="input-group flex-1">
                                                <label>Hectáreas</label>
                                                <input
                                                    type="number"
                                                    min="0.1"
                                                    step="0.1"
                                                    value={c.hectareas}
                                                    onChange={e => actualizarCultivo(idx, 'hectareas', e.target.value)}
                                                />
                                            </div>
                                            <div className="input-group flex-1">
                                                <label>Etapa fenológica</label>
                                                <select
                                                    value={c.etapa}
                                                    onChange={e => actualizarCultivo(idx, 'etapa', e.target.value)}
                                                >
                                                    <option value="germinacion">Germinación</option>
                                                    <option value="vegetativa">Vegetativa</option>
                                                    <option value="floracion">Floración</option>
                                                    <option value="fructificacion">Fructificación</option>
                                                    <option value="maduracion">Maduración</option>
                                                    <option value="permanente">Permanente</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button type="button" className="btn-add" onClick={agregarCultivo}>
                                    + Agregar otro cultivo
                                </button>

                                {error && <p className="login-error">{error}</p>}

                                <div className="row-btns">
                                    <button type="button" className="btn-atras-inline" onClick={anteriorPaso}>← Atrás</button>
                                    <button type="submit" className="btn-siguiente-inline" disabled={loading}>
                                        {loading ? 'Registrando...' : 'Finalizar →'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </form>

                <button className="registro-back-btn" onClick={() => navigate('/login')}>
                    ← Volver al Login
                </button>
            </div>
        </div>
    )
}

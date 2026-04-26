import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './ProductorDashboard.css'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Usuario {
    id: string
    folio: string
    nombre: string
    idioma_preferido: 'es' | 'nah'
    tipo_acceso: string
    rol: string
}

interface Monitoreo {
    id: string
    lote_id: string
    fecha: string
    temperatura_max?: number
    temperatura_min?: number
    humedad_relativa?: number
    precipitacion?: number
    ndvi?: number
    estado_semaforo?: 'verde' | 'amarillo' | 'rojo'
    alerta_plaga?: boolean
    plaga_probable?: string
    recomendacion_texto_es?: string
    recomendacion_texto_nah?: string
    lotes_cultivo?: {
        id: string
        cultivo: string
        parcela_id: string
        parcelas?: {
            id: string
            nombre: string
            productor_id: string
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CULTIVO_EMOJI: Record<string, string> = {
    maiz: '', frijol: '', aguacate: '',
    cafe: '', calabaza: '', hortalizas: '',
}

const SEMAFORO_LABEL: Record<string, string> = {
    verde: 'Favorable', amarillo: 'Atención', rojo: 'Alerta',
}

function ndviColor(ndvi: number): string {
    if (ndvi >= 0.6) return '#22c55e'
    if (ndvi >= 0.3) return '#f59e0b'
    return '#ef4444'
}

function saludar(): string {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 19) return 'Buenas tardes'
    return 'Buenas noches'
}

function formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric',
    })
}

// ── Componente ─────────────────────────────────────────────────────────────────

export default function ProductorDashboard() {
    const navigate = useNavigate()
    const [usuario, setUsuario] = useState<Usuario | null>(null)
    const [monitoreos, setMonitoreos] = useState<Monitoreo[]>([])
    const [loading, setLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        const raw = localStorage.getItem('usuario')
        if (!raw) { navigate('/login'); return }

        let user: Usuario
        try { user = JSON.parse(raw) } catch { navigate('/login'); return }

        if (!user?.id) { navigate('/login'); return }
        if (user.rol === 'admin') { navigate('/admin/dashboard'); return }

        setUsuario(user)
        cargarMonitoreos(user.id)
    }, [])

    const cargarMonitoreos = async (productorId: string) => {
        setLoading(true)
        setErrorMsg('')

        const { data, error } = await supabase
            .from('monitoreo_lote')
            .select(`
                *,
                lotes_cultivo!inner(
                    id, cultivo, parcela_id,
                    parcelas!inner( id, nombre, productor_id )
                )
            `)
            .eq('lotes_cultivo.parcelas.productor_id', productorId)
            .order('fecha', { ascending: false })
            .limit(10)

        if (error) {
            setErrorMsg('No se pudieron cargar los monitoreos. Intenta de nuevo.')
            console.error(error)
        } else {
            setMonitoreos((data as unknown as Monitoreo[]) || [])
        }
        setLoading(false)
    }

    const cerrarSesion = () => {
        localStorage.removeItem('usuario')
        navigate('/login')
    }

    // ── Estadísticas rápidas ─────────────────────────────────────────────────

    const alertasActivas = monitoreos.filter(m => m.alerta_plaga).length
    const enRojo = monitoreos.filter(m => m.estado_semaforo === 'rojo').length
    const parcelasUnicas = new Set(
        monitoreos.map(m => m.lotes_cultivo?.parcelas?.nombre).filter(Boolean)
    ).size

    if (!usuario) return null

    return (
        <div className="pd-wrapper">
            <div className="pd-overlay" />
            <div className="pd-body">

                {/* ── HEADER ── */}
                <header className="pd-header">
                    <div className="pd-header-brand">
                        <div className="pd-logo" />
                        <div className="pd-brand-text">
                            <h1>TLAPIANI</h1>
                            <p>
                                {usuario.idioma_preferido === 'nah'
                                    ? 'Totlahtol, Totlal — Panel del Productor'
                                    : 'Panel del Productor'}
                            </p>
                        </div>
                    </div>
                    <nav className="pd-header-nav">
                        <button className="pd-nav-btn" onClick={() => navigate('/productor/perfil')}>
                            👤 Mi Perfil
                        </button>
                        <button className="pd-nav-btn" onClick={() => navigate('/productor/instructivo')}>
                            📖 Instructivo
                        </button>
                        <button className="pd-nav-btn-salir" onClick={cerrarSesion}>
                            Cerrar sesión
                        </button>
                    </nav>
                </header>

                <main className="pd-main">

                    {/* ── BIENVENIDA ── */}
                    <div className="pd-welcome">
                        <div>
                            <h2 className="pd-welcome-title">
                                {saludar()}, {usuario.nombre}
                            </h2>
                            <p className="pd-welcome-sub">
                                {usuario.idioma_preferido === 'nah' ? 'Náhuatl' : '🇲🇽 Español'}
                                &nbsp;·&nbsp;Acceso: {usuario.tipo_acceso}
                                {alertasActivas > 0 && (
                                    <span style={{ color: '#f87171', marginLeft: '1rem' }}>
                                        {alertasActivas} alerta{alertasActivas > 1 ? 's' : ''} activa{alertasActivas > 1 ? 's' : ''}
                                    </span>
                                )}
                            </p>
                        </div>
                        <span className="pd-folio-badge"> {usuario.folio}</span>
                    </div>

                    {/* ── STATS RÁPIDAS ── */}
                    {!loading && monitoreos.length > 0 && (
                        <div className="pd-stats">
                            <div className="pd-stat-card">
                                <span className="pd-stat-num">{monitoreos.length}</span>
                                <span className="pd-stat-label">Monitoreos recientes</span>
                            </div>
                            <div className="pd-stat-card">
                                <span className="pd-stat-num">{parcelasUnicas}</span>
                                <span className="pd-stat-label">Parcelas activas</span>
                            </div>
                            <div className="pd-stat-card">
                                <span className="pd-stat-num" style={{ color: '#f59e0b' }}>
                                    {alertasActivas}
                                </span>
                                <span className="pd-stat-label">Alertas de plaga</span>
                            </div>
                            <div className="pd-stat-card">
                                <span className="pd-stat-num" style={{ color: '#ef4444' }}>
                                    {enRojo}
                                </span>
                                <span className="pd-stat-label">Lotes en rojo</span>
                            </div>
                        </div>
                    )}

                    {/* ── ERROR ── */}
                    {errorMsg && (
                        <div className="pd-error">
                            {errorMsg}
                            <button
                                onClick={() => usuario && cargarMonitoreos(usuario.id)}
                                style={{
                                    display: 'block', margin: '0.75rem auto 0',
                                    background: 'transparent', border: '1px solid #b8860b',
                                    color: '#b8860b', padding: '0.35rem 1rem',
                                    borderRadius: '0.5rem', cursor: 'pointer',
                                    fontFamily: 'Georgia, serif',
                                }}
                            >
                                Reintentar
                            </button>
                        </div>
                    )}

                    {/* ── MONITOREOS ── */}
                    <h3 className="pd-section-title">🛰️ Últimos Monitoreos de Mis Cultivos</h3>

                    {loading ? (
                        <div className="pd-loading">
                            <div className="pd-spinner" />
                            Cargando datos satelitales...
                        </div>
                    ) : monitoreos.length === 0 ? (
                        <div className="pd-empty">
                            <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}></p>
                            <p>Aún no hay registros de monitoreo para tus parcelas.</p>
                            <p style={{ fontSize: '0.82rem', marginTop: '0.5rem', color: '#6b7280' }}>
                                El equipo técnico generará los primeros reportes pronto.
                            </p>
                        </div>
                    ) : (
                        <div className="pd-monitoreos-grid">
                            {monitoreos.map(m => {
                                const semaforo = m.estado_semaforo ?? 'sin-dato'
                                const parcela = m.lotes_cultivo?.parcelas
                                const cultivo = m.lotes_cultivo?.cultivo ?? '—'
                                const recomendacion = usuario.idioma_preferido === 'nah'
                                    ? m.recomendacion_texto_nah
                                    : m.recomendacion_texto_es
                                const ndviPct = m.ndvi != null
                                    ? Math.min(Math.max(m.ndvi, -1), 1)
                                    : null

                                return (
                                    <div key={m.id} className="pd-card">
                                        {/* Barra de color superior */}
                                        <div className={`pd-card-topbar ${semaforo}`} />

                                        <div className="pd-card-body">
                                            {/* Encabezado */}
                                            <div className="pd-card-header">
                                                <div className="pd-card-title-group">
                                                    <p className="pd-card-parcela">
                                                        {CULTIVO_EMOJI[cultivo] || ''}&nbsp;
                                                        {parcela?.nombre ?? 'Parcela desconocida'}
                                                    </p>
                                                    <p className="pd-card-cultivo">
                                                        {cultivo.charAt(0).toUpperCase() + cultivo.slice(1)}
                                                    </p>
                                                </div>
                                                <div
                                                    className={`pd-semaforo ${semaforo}`}
                                                    title={SEMAFORO_LABEL[semaforo] ?? 'Sin dato'}
                                                />
                                            </div>

                                            {/* Alerta de plaga */}
                                            {m.alerta_plaga && (
                                                <div className="pd-alerta-plaga">
                                                     Alerta activa
                                                    {m.plaga_probable && (
                                                        <span>&nbsp;— {m.plaga_probable}</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Métricas climáticas */}
                                            <div className="pd-metrics">
                                                <div className="pd-metric">
                                                    <span className="pd-metric-label"> Temp. máx</span>
                                                    <span className="pd-metric-value">
                                                        {m.temperatura_max != null ? `${m.temperatura_max}°C` : '—'}
                                                    </span>
                                                </div>
                                                <div className="pd-metric">
                                                    <span className="pd-metric-label"> Temp. mín</span>
                                                    <span className="pd-metric-value">
                                                        {m.temperatura_min != null ? `${m.temperatura_min}°C` : '—'}
                                                    </span>
                                                </div>
                                                <div className="pd-metric">
                                                    <span className="pd-metric-label"> Humedad</span>
                                                    <span className="pd-metric-value">
                                                        {m.humedad_relativa != null ? `${m.humedad_relativa}%` : '—'}
                                                    </span>
                                                </div>
                                                <div className="pd-metric">
                                                    <span className="pd-metric-label"> Precipitación</span>
                                                    <span className="pd-metric-value">
                                                        {m.precipitacion != null ? `${m.precipitacion} mm` : '—'}
                                                    </span>
                                                </div>

                                                {/* Barra NDVI */}
                                                {ndviPct != null && (
                                                    <div className="pd-ndvi-bar-wrap">
                                                        <div className="pd-metric-label" style={{ marginBottom: '0.3rem' }}>
                                                             NDVI: {m.ndvi!.toFixed(3)}
                                                        </div>
                                                        <div className="pd-ndvi-bar-bg">
                                                            <div
                                                                className="pd-ndvi-bar-fill"
                                                                style={{
                                                                    width: `${((ndviPct + 1) / 2) * 100}%`,
                                                                    background: ndviColor(ndviPct),
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Recomendación */}
                                            {recomendacion && (
                                                <div className="pd-recomendacion">
                                                     {recomendacion}
                                                </div>
                                            )}

                                            {/* Fecha */}
                                            <p className="pd-card-fecha">
                                                 {formatFecha(m.fecha)}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* ── INFO CARDS ── */}
                    <h3 className="pd-section-title"> Sobre Tlapiani</h3>
                    <div className="pd-info-grid">
                        <div className="pd-info-card">
                            <h4 className="pd-info-card-title"> Datos Satelitales</h4>
                            <p className="pd-info-card-text">
                                Analizamos índices NDVI con imágenes MODIS de la NASA para
                                detectar estrés hídrico y cambios en la salud de tu cultivo antes de que sean visibles.
                            </p>
                        </div>
                        <div className="pd-info-card">
                            <h4 className="pd-info-card-title"> Clima en Tiempo Real</h4>
                            <p className="pd-info-card-text">
                                Temperatura, humedad y precipitación desde estaciones meteorológicas
                                y modelos NASA POWER calibrados para tu parcela.
                            </p>
                        </div>
                        <div className="pd-info-card">
                            <h4 className="pd-info-card-title"> Alertas de Plagas</h4>
                            <p className="pd-info-card-text">
                                Identificación temprana de plagas basada en condiciones climáticas
                                y umbrales de riesgo regionales. Recomendaciones en tu idioma.
                            </p>
                        </div>
                        <div className="pd-info-card">
                            <h4 className="pd-info-card-title"> En tu Idioma</h4>
                            <p className="pd-info-card-text">
                                Todas las recomendaciones están disponibles en Español y Náhuatl.
                                Puedes cambiar tu idioma en el perfil.
                            </p>
                        </div>
                    </div>

                </main>
            </div>
        </div>
    )
}

// src/pages/productor/ProductorDashboard.tsx
// ============================================================
// TLAPIANI — Dashboard del Productor
// Muestra monitoreos satelitales, alertas, recomendaciones
// ============================================================

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './ProductorDashboard.css'

// ── Interfaces ──────────────────────────────────────────────
interface Usuario {
    id: string
    nombre: string
    folio: string
    idioma_preferido: 'es' | 'nah'
    tipo_acceso: 'smartphone' | 'sms' | 'sin_celular'
    rol: string
}

interface MonitoreoCard {
    parcela_nombre: string
    cultivo: string
    fecha: string
    temperatura_max: number | null
    temperatura_min: number | null
    humedad_relativa: number | null
    precipitacion: number | null
    ndvi: number | null
    estado_semaforo: string | null
    alerta_plaga: boolean
    plaga_probable: string | null
    recomendacion_texto_es: string | null
    recomendacion_texto_nah: string | null
}

interface Recomendacion {
    cultivo_sugerido: string
    compatibilidad_porcentaje: number
    ganancia_estimada_ha: number
    parcela_nombre: string
    cultivo_actual: string
}

// ── Helpers ─────────────────────────────────────────────────
const CULTIVO_EMOJI: Record<string, string> = {
    maiz: '🌽', maíz: '🌽', frijol: '🫘', aguacate: '🥑',
    cafe: '☕', café: '☕', calabaza: '🎃', hortalizas: '🥬',
    nopal: '🌵', default: '🌱',
}

function getCultivoEmoji(cultivo: string): string {
    return CULTIVO_EMOJI[cultivo?.toLowerCase()] || CULTIVO_EMOJI.default
}

function getNdviColor(ndvi: number): string {
    if (ndvi >= 0.7) return '#22c55e'
    if (ndvi >= 0.4) return '#f59e0b'
    return '#ef4444'
}

function getSemaforoClass(semaforo: string | null): string {
    if (semaforo === 'verde') return 'verde'
    if (semaforo === 'amarillo') return 'amarillo'
    if (semaforo === 'rojo') return 'rojo'
    return 'sin-dato'
}

function formatFecha(fecha: string): string {
    try {
        return new Date(fecha + 'T00:00:00').toLocaleDateString('es-MX', {
            day: 'numeric', month: 'short', year: 'numeric',
        })
    } catch {
        return fecha
    }
}

// ── Componente Principal ────────────────────────────────────
export default function ProductorDashboard() {
    const navigate = useNavigate()

    // Auth
    const [usuario, setUsuario] = useState<Usuario | null>(null)

    // Data
    const [monitoreos, setMonitoreos] = useState<MonitoreoCard[]>([])
    const [recomendaciones, setRecomendaciones] = useState<Recomendacion[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState('')

    // Stats
    const [stats, setStats] = useState({
        totalMonitoreos: 0,
        parcelasActivas: 0,
        alertasPlaga: 0,
        lotesRojos: 0,
    })

    // ── Auth Guard ──────────────────────────────────────────
    useEffect(() => {
        const raw = localStorage.getItem('usuario')
        if (!raw) {
            navigate('/login')
            return
        }
        try {
            const datos: Usuario = JSON.parse(raw)
            if (!datos.id) {
                navigate('/login')
                return
            }
            // Si es admin, redirigir al dashboard de admin
            if (datos.rol === 'admin') {
                navigate('/admin/dashboard')
                return
            }
            setUsuario(datos)
        } catch {
            navigate('/login')
        }
    }, [navigate])

    // ── Cargar datos cuando el usuario esté disponible ──────
    useEffect(() => {
        if (usuario) cargarDatos()
    }, [usuario])

    async function cargarDatos() {
        setCargando(true)
        setError('')

        try {
            // 1. Obtener parcelas con lotes y monitoreos del productor
            const { data: parcelas, error: errParcelas } = await supabase
                .from('parcelas')
                .select(`
                    id,
                    nombre,
                    lotes_cultivo (
                        id,
                        cultivo,
                        monitoreo_lote (
                            fecha,
                            temperatura_max,
                            temperatura_min,
                            humedad_relativa,
                            precipitacion,
                            ndvi,
                            estado_semaforo,
                            alerta_plaga,
                            plaga_probable,
                            recomendacion_texto_es,
                            recomendacion_texto_nah
                        )
                    )
                `)
                .eq('productor_id', usuario!.id)

            if (errParcelas) throw new Error(errParcelas.message)

            // Transformar datos en tarjetas de monitoreo
            const cards: MonitoreoCard[] = []
            let alertas = 0
            let rojos = 0
            const parcelasSet = new Set<string>()

            for (const parcela of (parcelas || [])) {
                parcelasSet.add(parcela.id)
                for (const lote of (parcela.lotes_cultivo || [])) {
                    // Obtener el monitoreo más reciente (ordenar por fecha desc)
                    const monitoreosList = (lote.monitoreo_lote || []) as any[]
                    const sorted = monitoreosList.sort((a: any, b: any) =>
                        b.fecha.localeCompare(a.fecha)
                    )
                    const m = sorted[0]
                    if (m) {
                        cards.push({
                            parcela_nombre: parcela.nombre,
                            cultivo: lote.cultivo,
                            fecha: m.fecha,
                            temperatura_max: m.temperatura_max,
                            temperatura_min: m.temperatura_min,
                            humedad_relativa: m.humedad_relativa,
                            precipitacion: m.precipitacion,
                            ndvi: m.ndvi,
                            estado_semaforo: m.estado_semaforo,
                            alerta_plaga: m.alerta_plaga || false,
                            plaga_probable: m.plaga_probable,
                            recomendacion_texto_es: m.recomendacion_texto_es,
                            recomendacion_texto_nah: m.recomendacion_texto_nah,
                        })
                        if (m.alerta_plaga) alertas++
                        if (m.estado_semaforo === 'rojo') rojos++
                    }
                }
            }

            // Ordenar por fecha desc y limitar a 10
            cards.sort((a, b) => b.fecha.localeCompare(a.fecha))
            setMonitoreos(cards.slice(0, 10))

            setStats({
                totalMonitoreos: cards.length,
                parcelasActivas: parcelasSet.size,
                alertasPlaga: alertas,
                lotesRojos: rojos,
            })

            // 2. Obtener recomendaciones
            const loteIds = (parcelas || []).flatMap(p =>
                (p.lotes_cultivo || []).map((l: any) => l.id)
            )

            if (loteIds.length > 0) {
                const { data: recos } = await supabase
                    .from('recomendaciones_lote')
                    .select(`
                        cultivo_sugerido,
                        compatibilidad_porcentaje,
                        ganancia_estimada_ha,
                        lotes_cultivo (
                            cultivo,
                            parcelas (nombre)
                        )
                    `)
                    .in('lote_id', loteIds)
                    .order('compatibilidad_porcentaje', { ascending: false })
                    .limit(5)

                const recoCards: Recomendacion[] = (recos || []).map((r: any) => ({
                    cultivo_sugerido: r.cultivo_sugerido,
                    compatibilidad_porcentaje: r.compatibilidad_porcentaje,
                    ganancia_estimada_ha: r.ganancia_estimada_ha,
                    parcela_nombre: r.lotes_cultivo?.parcelas?.nombre || '',
                    cultivo_actual: r.lotes_cultivo?.cultivo || '',
                }))
                setRecomendaciones(recoCards)
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al cargar datos')
        } finally {
            setCargando(false)
        }
    }

    function cerrarSesion() {
        localStorage.removeItem('usuario')
        navigate('/login')
    }

    // ── Loading ─────────────────────────────────────────────
    if (!usuario) return null

    if (cargando) {
        return (
            <div className="pd-wrapper">
                <div className="pd-overlay" />
                <div className="pd-body">
                    <div className="pd-loading">
                        <div className="pd-spinner" />
                        <p>Cargando tu dashboard...</p>
                    </div>
                </div>
            </div>
        )
    }

    const idioma = usuario.idioma_preferido || 'es'

    return (
        <div className="pd-wrapper">
            <div className="pd-overlay" />
            <div className="pd-body">

                {/* ══════ HEADER ══════ */}
                <header className="pd-header">
                    <div className="pd-header-brand">
                        <div className="pd-logo" />
                        <div className="pd-brand-text">
                            <h1>TLAPIANI</h1>
                            <p>Guardián de la Tierra</p>
                        </div>
                    </div>
                    <div className="pd-header-nav">
                        <button className="pd-nav-btn" onClick={() => navigate('/productor/perfil')}>
                            👤 Mi Perfil
                        </button>
                        <button className="pd-nav-btn" onClick={() => navigate('/productor/instructivo')}>
                            📖 Instructivo
                        </button>
                        <button className="pd-nav-btn-salir" onClick={cerrarSesion}>
                            Cerrar sesión
                        </button>
                    </div>
                </header>

                <main className="pd-main">

                    {/* ══════ BIENVENIDA ══════ */}
                    <div className="pd-welcome">
                        <div>
                            <h2 className="pd-welcome-title">
                                {idioma === 'nah' ? 'Xitlahpalo' : 'Bienvenido'}, {usuario.nombre}
                            </h2>
                            <p className="pd-welcome-sub">
                                {idioma === 'nah' ? 'Náhuatl' : '🇲🇽 Español'}
                                {' · '}
                                {usuario.tipo_acceso === 'smartphone' ? '📱 Smartphone' :
                                    usuario.tipo_acceso === 'sms' ? '📞 SMS' : '❌ Sin celular'}
                            </p>
                        </div>
                        <span className="pd-folio-badge">{usuario.folio}</span>
                    </div>

                    {/* ══════ ERROR ══════ */}
                    {error && (
                        <div className="pd-error">
                            <p>❌ {error}</p>
                            <button
                                onClick={cargarDatos}
                                style={{
                                    marginTop: '0.75rem', background: '#b8860b', color: '#1a0a05',
                                    border: 'none', padding: '0.5rem 1.5rem', borderRadius: '0.5rem',
                                    cursor: 'pointer', fontFamily: 'Georgia, serif', fontWeight: 700,
                                }}
                            >
                                🔄 Reintentar
                            </button>
                        </div>
                    )}

                    {/* ══════ ESTADÍSTICAS ══════ */}
                    <div className="pd-stats">
                        <div className="pd-stat-card">
                            <span className="pd-stat-num">{stats.totalMonitoreos}</span>
                            <span className="pd-stat-label">Monitoreos</span>
                        </div>
                        <div className="pd-stat-card">
                            <span className="pd-stat-num">{stats.parcelasActivas}</span>
                            <span className="pd-stat-label">Parcelas Activas</span>
                        </div>
                        <div className="pd-stat-card">
                            <span className="pd-stat-num" style={{ color: stats.alertasPlaga > 0 ? '#ef4444' : undefined }}>
                                {stats.alertasPlaga}
                            </span>
                            <span className="pd-stat-label">Alertas Plaga</span>
                        </div>
                        <div className="pd-stat-card">
                            <span className="pd-stat-num" style={{ color: stats.lotesRojos > 0 ? '#ef4444' : undefined }}>
                                {stats.lotesRojos}
                            </span>
                            <span className="pd-stat-label">Lotes en Rojo</span>
                        </div>
                    </div>

                    {/* ══════ MONITOREOS ══════ */}
                    <h3 className="pd-section-title">
                        📡 {idioma === 'nah' ? 'Notlalmilpa Monitoreo' : 'Monitoreo de Mis Cultivos'}
                    </h3>

                    {monitoreos.length === 0 ? (
                        <div className="pd-empty">
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌾</div>
                            <p>
                                {idioma === 'nah'
                                    ? 'Ayamo onkah datos. Ximochiya...'
                                    : 'Aún no hay registros de monitoreo para tus parcelas.'}
                            </p>
                            <p style={{ fontSize: '0.82rem', marginTop: '0.5rem' }}>
                                {idioma === 'nah'
                                    ? 'Niman yaseh datos tlen satélite.'
                                    : 'Los datos satelitales se actualizan semanalmente.'}
                            </p>
                        </div>
                    ) : (
                        <div className="pd-monitoreos-grid">
                            {monitoreos.map((m, i) => {
                                const semaforoClass = getSemaforoClass(m.estado_semaforo)
                                const recoTexto = idioma === 'nah'
                                    ? m.recomendacion_texto_nah
                                    : m.recomendacion_texto_es

                                return (
                                    <div className="pd-card" key={i}>
                                        {/* Top color bar */}
                                        <div className={`pd-card-topbar ${semaforoClass}`} />

                                        <div className="pd-card-body">
                                            {/* Header: parcela + semáforo */}
                                            <div className="pd-card-header">
                                                <div className="pd-card-title-group">
                                                    <p className="pd-card-parcela">{m.parcela_nombre}</p>
                                                    <p className="pd-card-cultivo">
                                                        {getCultivoEmoji(m.cultivo)} {m.cultivo}
                                                    </p>
                                                </div>
                                                <div className={`pd-semaforo ${semaforoClass}`}
                                                    title={m.estado_semaforo || 'Sin datos'} />
                                            </div>

                                            {/* Alerta de plaga */}
                                            {m.alerta_plaga && (
                                                <div className="pd-alerta-plaga">
                                                    ⚠️ Alerta activa
                                                    {m.plaga_probable && ` — ${m.plaga_probable}`}
                                                </div>
                                            )}

                                            {/* Métricas */}
                                            <div className="pd-metrics">
                                                <div className="pd-metric">
                                                    <span className="pd-metric-label">Temp. Máx</span>
                                                    <span className="pd-metric-value">
                                                        {m.temperatura_max != null ? `${m.temperatura_max.toFixed(1)}°C` : '—'}
                                                    </span>
                                                </div>
                                                <div className="pd-metric">
                                                    <span className="pd-metric-label">Temp. Mín</span>
                                                    <span className="pd-metric-value">
                                                        {m.temperatura_min != null ? `${m.temperatura_min.toFixed(1)}°C` : '—'}
                                                    </span>
                                                </div>
                                                <div className="pd-metric">
                                                    <span className="pd-metric-label">Humedad</span>
                                                    <span className="pd-metric-value">
                                                        {m.humedad_relativa != null ? `${m.humedad_relativa.toFixed(0)}%` : '—'}
                                                    </span>
                                                </div>
                                                <div className="pd-metric">
                                                    <span className="pd-metric-label">Lluvia</span>
                                                    <span className="pd-metric-value">
                                                        {m.precipitacion != null ? `${m.precipitacion.toFixed(1)} mm` : '—'}
                                                    </span>
                                                </div>

                                                {/* NDVI bar */}
                                                {m.ndvi != null && (
                                                    <div className="pd-ndvi-bar-wrap">
                                                        <span className="pd-metric-label">
                                                            NDVI: {m.ndvi.toFixed(2)}
                                                        </span>
                                                        <div className="pd-ndvi-bar-bg">
                                                            <div
                                                                className="pd-ndvi-bar-fill"
                                                                style={{
                                                                    width: `${Math.max(0, Math.min(1, m.ndvi)) * 100}%`,
                                                                    background: getNdviColor(m.ndvi),
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Recomendación */}
                                            {recoTexto && (
                                                <div className="pd-recomendacion">
                                                    💡 {recoTexto}
                                                </div>
                                            )}

                                            {/* Fecha */}
                                            <p className="pd-card-fecha">
                                                📅 {formatFecha(m.fecha)}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* ══════ RECOMENDACIONES ══════ */}
                    {recomendaciones.length > 0 && (
                        <>
                            <h3 className="pd-section-title" style={{ marginTop: '2rem' }}>
                                💡 {idioma === 'nah' ? 'Tlahtolmeh' : 'Recomendaciones de Cultivo'}
                            </h3>
                            <div className="pd-reco-grid">
                                {recomendaciones.map((r, i) => (
                                    <div className="pd-reco-card" key={i}>
                                        <div className="pd-reco-header">
                                            <span className="pd-reco-cultivo">
                                                {getCultivoEmoji(r.cultivo_sugerido)} {r.cultivo_sugerido}
                                            </span>
                                            <span className="pd-reco-compat">
                                                {r.compatibilidad_porcentaje}%
                                            </span>
                                        </div>
                                        <div className="pd-reco-compat-bar">
                                            <div
                                                className="pd-reco-compat-fill"
                                                style={{
                                                    width: `${r.compatibilidad_porcentaje}%`,
                                                    background: r.compatibilidad_porcentaje >= 90 ? '#22c55e' :
                                                        r.compatibilidad_porcentaje >= 70 ? '#f59e0b' : '#ef4444',
                                                }}
                                            />
                                        </div>
                                        <div className="pd-reco-info">
                                            <span>📍 {r.parcela_nombre}</span>
                                            <span>🌱 Actual: {r.cultivo_actual}</span>
                                        </div>
                                        {r.ganancia_estimada_ha > 0 && (
                                            <div className="pd-reco-ganancia">
                                                💰 ${r.ganancia_estimada_ha.toLocaleString('es-MX')} MXN/ha estimados
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ══════ SOBRE TLAPIANI ══════ */}
                    <h3 className="pd-section-title" style={{ marginTop: '2rem' }}>
                        🌍 Sobre Tlapiani
                    </h3>
                    <div className="pd-info-grid">
                        <div className="pd-info-card">
                            <h4 className="pd-info-card-title">🛰️ Datos Satelitales</h4>
                            <p className="pd-info-card-text">
                                Usamos imágenes MODIS de la NASA para calcular el índice NDVI,
                                que mide la salud de la vegetación en tu parcela cada semana.
                            </p>
                        </div>
                        <div className="pd-info-card">
                            <h4 className="pd-info-card-title">🌤️ Clima en Tiempo Real</h4>
                            <p className="pd-info-card-text">
                                Los datos de temperatura, humedad y precipitación provienen
                                de NASA POWER, actualizados diariamente para tu ubicación exacta.
                            </p>
                        </div>
                        <div className="pd-info-card">
                            <h4 className="pd-info-card-title">🐛 Alertas de Plagas</h4>
                            <p className="pd-info-card-text">
                                Nuestro modelo detecta condiciones propicias para plagas como
                                el gusano cogollero o la roya, y te alerta con recomendaciones.
                            </p>
                        </div>
                        <div className="pd-info-card">
                            <h4 className="pd-info-card-title">🗣️ Tu Idioma</h4>
                            <p className="pd-info-card-text">
                                Tlapiani habla tu lengua. Recibe alertas y recomendaciones
                                en Náhuatl o Español, directo a tu WhatsApp o por SMS.
                            </p>
                        </div>
                    </div>

                </main>
            </div>
        </div>
    )
}

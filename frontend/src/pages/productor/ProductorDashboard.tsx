import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

interface LoteCultivo {
    id: string
    cultivo: string
    hectareas?: number
    etapa_fenologica?: string
    fecha_siembra?: string
    parcelas?: {
        nombre: string
        municipios?: { nombre: string }[] | { nombre: string }
    }[] | {
        nombre: string
        municipios?: { nombre: string }[] | { nombre: string }
    }
}

interface Usuario {
    id: string
    nombre: string
    folio: string
    municipio_id?: number
    idioma_preferido: string
    tipo_acceso: string
    rol?: string
}

const etapaLabel: Record<string, string> = {
    germinacion: 'Germinación',
    vegetativa: 'Vegetativa',
    floracion: 'Floración',
    fructificacion: 'Fructificación',
    maduracion: 'Maduración',
    permanente: 'Permanente',
}

const cultivoEmoji: Record<string, string> = {
    maiz: '🌽', frijol: '🫘', aguacate: '🥑',
    cafe: '☕', calabaza: '🎃', hortalizas: '🥬',
}

export default function ProductorDashboard() {
    const navigate = useNavigate()
    const [usuario, setUsuario] = useState<Usuario | null>(null)
    const [lotes, setLotes] = useState<LoteCultivo[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const raw = localStorage.getItem('usuario')
        if (!raw) { navigate('/'); return }
        const user = JSON.parse(raw) as Usuario
        if (user.rol === 'admin') { navigate('/admin/dashboard'); return }
        setUsuario(user)
        cargarLotes(user.id)
    }, [])

    const cargarLotes = async (productorId: string) => {
        setLoading(true)
        const { data } = await supabase
            .from('lotes_cultivo')
            .select(`
                id, cultivo, hectareas, etapa_fenologica, fecha_siembra,
                parcelas (
                    nombre,
                    municipios ( nombre )
                )
            `)
            .eq('parcelas.productor_id', productorId)
            .order('fecha_siembra', { ascending: false })
        setLotes((data as unknown as LoteCultivo[]) || [])
        setLoading(false)
    }

    const cerrarSesion = () => {
        localStorage.removeItem('usuario')
        navigate('/')
    }

    if (!usuario) return null

    const saludar = () => {
        const h = new Date().getHours()
        if (h < 12) return 'Buenos días'
        if (h < 19) return 'Buenas tardes'
        return 'Buenas noches'
    }

    return (
        <div style={s.wrapper}>
            {/* Header */}
            <header style={s.header}>
                <div style={s.headerLeft}>
                    <div style={s.logoCircle}>T</div>
                    <div>
                        <h1 style={s.headerTitle}>TLAPIANI</h1>
                        <p style={s.headerSub}>
                            {usuario.idioma_preferido === 'nah' ? 'Panel Nauatl' : 'Panel del Productor'}
                        </p>
                    </div>
                </div>
                <div style={s.headerNav}>
                    <button style={s.navBtn} onClick={() => navigate('/productor/perfil')}>Mi Perfil</button>
                    <button style={s.navBtn} onClick={() => navigate('/productor/instructivo')}>Instructivo</button>
                    <button style={s.navBtnSalir} onClick={cerrarSesion}>Salir</button>
                </div>
            </header>

            <main style={s.main}>
                {/* Bienvenida */}
                <div style={s.welcomeCard}>
                    <div>
                        <h2 style={s.welcomeTitle}>{saludar()}, {usuario.nombre} 👋</h2>
                        <p style={s.welcomeSub}>
                            {usuario.idioma_preferido === 'nah' ? '🌽 Náhuatl' : '🇲🇽 Español'}&nbsp;·&nbsp;
                            Acceso: {usuario.tipo_acceso}
                        </p>
                    </div>
                    <span style={s.folioBadge}>📋 {usuario.folio}</span>
                </div>

                {/* Cultivos */}
                <h3 style={s.sectionTitle}>🌱 Mis Cultivos</h3>

                {loading ? (
                    <p style={s.loading}>Cargando cultivos...</p>
                ) : lotes.length === 0 ? (
                    <div style={s.empty}>
                        <p>No tienes cultivos registrados aún.</p>
                        <p style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '0.5rem' }}>
                            Contacta a tu administrador o completa tu registro.
                        </p>
                    </div>
                ) : (
                    <div style={s.grid}>
                        {lotes.map(l => (
                            <div key={l.id} style={s.card}>
                                <div style={s.cardHeader}>
                                    <span style={s.cardEmoji}>
                                        {cultivoEmoji[l.cultivo] || '🌿'}
                                    </span>
                                    <h4 style={s.cardTitle}>
                                        {l.cultivo.charAt(0).toUpperCase() + l.cultivo.slice(1)}
                                    </h4>
                                </div>
                                {(() => {
                                    const p = Array.isArray(l.parcelas) ? l.parcelas[0] : l.parcelas
                                    return p?.nombre ? <p style={s.cardInfo}>🏡 Parcela: <strong>{p.nombre}</strong></p> : null
                                })()
                                }
                                {l.hectareas != null && (
                                    <p style={s.cardInfo}>📐 {l.hectareas} ha</p>
                                )}
                                {l.etapa_fenologica && (
                                    <p style={s.cardInfo}>
                                        🌿 Etapa: <strong style={{ color: '#b8860b' }}>
                                            {etapaLabel[l.etapa_fenologica] || l.etapa_fenologica}
                                        </strong>
                                    </p>
                                )}
                                {l.fecha_siembra && (
                                    <p style={s.cardInfo}>📅 Siembra: {l.fecha_siembra}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Info cards */}
                <div style={s.infoGrid}>
                    <div style={s.infoCard}>
                        <h4 style={s.infoTitle}>🛰️ Datos Satelitales</h4>
                        <p style={s.infoText}>Análisis NDVI vía MODIS/NASA POWER para monitorear la salud de tus cultivos en tiempo real.</p>
                    </div>
                    <div style={s.infoCard}>
                        <h4 style={s.infoTitle}>🌧️ Clima</h4>
                        <p style={s.infoText}>Predicciones climáticas y alertas de heladas, sequías y lluvias extremas para tu región.</p>
                    </div>
                    <div style={s.infoCard}>
                        <h4 style={s.infoTitle}>🐛 Plagas</h4>
                        <p style={s.infoText}>Alertas tempranas de plagas con recomendaciones de manejo integrado de cultivos.</p>
                    </div>
                </div>
            </main>
        </div>
    )
}

const s: Record<string, React.CSSProperties> = {
    wrapper: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a1a05 0%, #1a2d0a 50%, #0a1a05 100%)',
        fontFamily: 'Georgia, serif',
        color: '#f0ebdc',
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(20,60,20,0.95)', padding: '1rem 2rem',
        borderBottom: '3px solid #b8860b', flexWrap: 'wrap', gap: '1rem',
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
    logoCircle: {
        width: '3rem', height: '3rem', borderRadius: '50%',
        background: '#b8860b', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontWeight: 900, fontSize: '1.5rem',
    },
    headerTitle: { margin: 0, fontSize: '1.4rem', letterSpacing: '0.2em' },
    headerSub: { margin: 0, fontSize: '0.8rem', color: '#b8860b' },
    headerNav: { display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' },
    navBtn: {
        background: 'transparent', border: '1px solid #b8860b',
        color: '#f0ebdc', padding: '0.4rem 1rem', borderRadius: '0.5rem',
        cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '0.85rem',
    },
    navBtnSalir: {
        background: '#6b1a2a', border: 'none',
        color: '#f0ebdc', padding: '0.4rem 1rem', borderRadius: '0.5rem',
        cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '0.85rem',
    },
    main: { padding: '2rem', maxWidth: '1300px', margin: '0 auto' },
    welcomeCard: {
        background: 'rgba(20,60,20,0.7)', border: '1px solid #b8860b',
        borderRadius: '1rem', padding: '1.5rem 2rem', marginBottom: '2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1rem',
    },
    welcomeTitle: { margin: 0, fontSize: '1.5rem', color: '#f0ebdc' },
    welcomeSub: { margin: '0.4rem 0 0', fontSize: '0.88rem', color: '#ccc' },
    folioBadge: {
        background: '#b8860b', color: '#1a0a05',
        padding: '0.4rem 1rem', borderRadius: '999px',
        fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.05em',
    },
    sectionTitle: { fontSize: '1.3rem', marginBottom: '1rem', color: '#b8860b' },
    loading: { textAlign: 'center', color: '#b8860b', padding: '2rem' },
    empty: {
        background: 'rgba(0,0,0,0.3)', border: '1px dashed #444',
        borderRadius: '1rem', padding: '2rem', textAlign: 'center', color: '#ccc',
        marginBottom: '2rem',
    },
    grid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '1.25rem', marginBottom: '2rem',
    },
    card: {
        background: 'rgba(20,60,20,0.6)', border: '1px solid #b8860b',
        borderRadius: '1rem', padding: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '0.4rem',
    },
    cardHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' },
    cardEmoji: { fontSize: '2rem' },
    cardTitle: { margin: 0, fontSize: '1.1rem', color: '#f0ebdc' },
    cardInfo: { margin: 0, fontSize: '0.85rem', color: '#ccc' },
    infoGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem', marginTop: '1rem',
    },
    infoCard: {
        background: 'rgba(20,60,20,0.5)', border: '1px solid rgba(184,134,11,0.4)',
        borderRadius: '1rem', padding: '1.5rem',
    },
    infoTitle: { margin: '0 0 0.75rem', color: '#b8860b', fontSize: '1rem' },
    infoText: { margin: 0, fontSize: '0.85rem', color: '#ccc', lineHeight: 1.6 },
}
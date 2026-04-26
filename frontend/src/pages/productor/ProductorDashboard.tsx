import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

interface DatosCultivo {
    id: string
    cultivo: string
    variedad?: string
    hectareas?: number
    estado_semaforo?: string
    fecha_siembra?: string
}

interface Productor {
    id: string
    nombre: string
    apellidos: string
    folio: string
    municipio: string
    estado: string
    idioma_preferido: string
    tipo_acceso: string
    rol?: string
}

export default function ProductorDashboard() {
    const navigate = useNavigate()
    const [productor, setProductor] = useState<Productor | null>(null)
    const [cultivos, setCultivos] = useState<DatosCultivo[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const raw = localStorage.getItem('usuario')
        if (!raw) {
            navigate('/')
            return
        }
        const user = JSON.parse(raw) as Productor
        if (user.rol === 'admin') {
            navigate('/admin/dashboard')
            return
        }
        setProductor(user)
        cargarCultivos(user.id)
    }, [])

    const cargarCultivos = async (productorId: string) => {
        setLoading(true)
        const { data } = await supabase
            .from('cultivos')
            .select('*')
            .eq('productor_id', productorId)
        setCultivos(data || [])
        setLoading(false)
    }

    const cerrarSesion = () => {
        localStorage.removeItem('usuario')
        navigate('/')
    }

    const semaforoColor = (estado?: string) => {
        if (estado === 'verde') return '#4ade80'
        if (estado === 'amarillo') return '#facc15'
        if (estado === 'rojo') return '#f87171'
        return '#aaa'
    }

    if (!productor) return null

    return (
        <div style={styles.wrapper}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <div style={styles.logoCircle}>T</div>
                    <div>
                        <h1 style={styles.headerTitle}>TLAPIANI</h1>
                        <p style={styles.headerSub}>
                            {productor.idioma_preferido === 'nah'
                                ? 'Tlatoa Nauatl'
                                : 'Panel del Productor'}
                        </p>
                    </div>
                </div>
                <div style={styles.headerNav}>
                    <button style={styles.navBtn} onClick={() => navigate('/productor/perfil')}>Mi Perfil</button>
                    <button style={styles.navBtn} onClick={() => navigate('/productor/instructivo')}>Instructivo</button>
                    <button style={styles.navBtnSalir} onClick={cerrarSesion}>Salir</button>
                </div>
            </header>

            <main style={styles.main}>
                {/* Bienvenida */}
                <div style={styles.welcomeCard}>
                    <div>
                        <h2 style={styles.welcomeTitle}>
                            ¡Bienvenido, {productor.nombre}!
                        </h2>
                        <p style={styles.welcomeSub}>
                            📍 {productor.municipio}, {productor.estado} &nbsp;·&nbsp;
                            🌐 Acceso: {productor.tipo_acceso} &nbsp;·&nbsp;
                            {productor.idioma_preferido === 'nah' ? '🌽 Náhuatl' : '🇲🇽 Español'}
                        </p>
                    </div>
                    <span style={styles.folioBadge}>Folio: {productor.folio}</span>
                </div>

                {/* Sección cultivos */}
                <h3 style={styles.sectionTitle}>🌱 Mis Cultivos</h3>

                {loading ? (
                    <p style={styles.loading}>Cargando cultivos...</p>
                ) : cultivos.length === 0 ? (
                    <div style={styles.emptyCultivos}>
                        <p>No tienes cultivos registrados aún.</p>
                        <p style={{ fontSize: '0.85rem', color: '#aaa' }}>
                            Contacta a tu técnico o administrador para registrar tus parcelas.
                        </p>
                    </div>
                ) : (
                    <div style={styles.cultivosGrid}>
                        {cultivos.map(c => (
                            <div key={c.id} style={styles.cultivoCard}>
                                <div style={styles.cultivoHeader}>
                                    <h4 style={styles.cultivoNombre}>{c.cultivo}</h4>
                                    <span
                                        style={{
                                            ...styles.semaforo,
                                            background: semaforoColor(c.estado_semaforo),
                                        }}
                                    />
                                </div>
                                {c.variedad && <p style={styles.cultivoInfo}>Variedad: {c.variedad}</p>}
                                {c.hectareas && <p style={styles.cultivoInfo}>Superficie: {c.hectareas} ha</p>}
                                {c.fecha_siembra && <p style={styles.cultivoInfo}>Siembra: {c.fecha_siembra}</p>}
                                <p style={styles.cultivoEstado}>
                                    Estado: <strong style={{ color: semaforoColor(c.estado_semaforo) }}>
                                        {c.estado_semaforo || 'Sin datos'}
                                    </strong>
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Info Cards */}
                <div style={styles.infoGrid}>
                    <div style={styles.infoCard}>
                        <h4 style={styles.infoCardTitle}>🛰️ Datos Satelitales</h4>
                        <p style={styles.infoCardText}>
                            Análisis de NDVI vía MODIS/NASA POWER para monitorear la salud de tus cultivos en tiempo real.
                        </p>
                    </div>
                    <div style={styles.infoCard}>
                        <h4 style={styles.infoCardTitle}>🌧️ Clima</h4>
                        <p style={styles.infoCardText}>
                            Predicciones climáticas y alertas de heladas, sequías y lluvias extremas para tu región.
                        </p>
                    </div>
                    <div style={styles.infoCard}>
                        <h4 style={styles.infoCardTitle}>🐛 Plagas</h4>
                        <p style={styles.infoCardText}>
                            Alertas tempranas de plagas y enfermedades con recomendaciones de manejo integrado.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
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
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
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
    emptyCultivos: {
        background: 'rgba(0,0,0,0.3)', border: '1px dashed #444',
        borderRadius: '1rem', padding: '2rem', textAlign: 'center', color: '#ccc',
    },
    cultivosGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '1.25rem', marginBottom: '2rem',
    },
    cultivoCard: {
        background: 'rgba(20,60,20,0.6)', border: '1px solid #b8860b',
        borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem',
    },
    cultivoHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    cultivoNombre: { margin: 0, fontSize: '1.1rem' },
    semaforo: { width: '1rem', height: '1rem', borderRadius: '50%' },
    cultivoInfo: { margin: 0, fontSize: '0.85rem', color: '#ccc' },
    cultivoEstado: { margin: 0, fontSize: '0.85rem' },
    infoGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem', marginTop: '1rem',
    },
    infoCard: {
        background: 'rgba(20,60,20,0.5)', border: '1px solid rgba(184,134,11,0.4)',
        borderRadius: '1rem', padding: '1.5rem',
    },
    infoCardTitle: { margin: '0 0 0.75rem', color: '#b8860b', fontSize: '1rem' },
    infoCardText: { margin: 0, fontSize: '0.85rem', color: '#ccc', lineHeight: 1.6 },
}
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

interface Productor {
    id: string
    nombre: string
    apellidos: string
    folio: string
    telefono: string
    idioma_preferido: string
    tipo_acceso: string
    estado: string
    municipio: string
    comunidad: string
    rol: string
    activo: boolean
}

export default function AdminDashboard() {
    const navigate = useNavigate()
    const [productores, setProductores] = useState<Productor[]>([])
    const [loading, setLoading] = useState(true)
    const [busqueda, setBusqueda] = useState('')
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

    useEffect(() => {
        // Protección de ruta
        if (!usuario?.id || usuario?.rol !== 'admin') {
            navigate('/')
            return
        }
        cargarProductores()
    }, [])

    const cargarProductores = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('productores')
            .select('*')
            .order('nombre', { ascending: true })
        setProductores(data || [])
        setLoading(false)
    }

    const toggleActivo = async (id: string, activo: boolean) => {
        await supabase
            .from('productores')
            .update({ activo: !activo })
            .eq('id', id)
        cargarProductores()
    }

    const cerrarSesion = () => {
        localStorage.removeItem('usuario')
        navigate('/')
    }

    const filtrados = productores.filter(p =>
        p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.folio?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.municipio?.toLowerCase().includes(busqueda.toLowerCase())
    )

    return (
        <div style={styles.wrapper}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <div style={styles.logoCircle}>T</div>
                    <div>
                        <h1 style={styles.headerTitle}>TLAPIANI</h1>
                        <p style={styles.headerSub}>Panel de Administración</p>
                    </div>
                </div>
                <div style={styles.headerRight}>
                    <span style={styles.adminName}>👤 {usuario?.nombre || 'Admin'}</span>
                    <button style={styles.btnSalir} onClick={cerrarSesion}>Cerrar sesión</button>
                </div>
            </header>

            {/* Contenido */}
            <main style={styles.main}>
                {/* Estadísticas */}
                <div style={styles.statsGrid}>
                    <div style={styles.statCard}>
                        <span style={styles.statNum}>{productores.length}</span>
                        <span style={styles.statLabel}>Productores totales</span>
                    </div>
                    <div style={styles.statCard}>
                        <span style={styles.statNum}>{productores.filter(p => p.activo).length}</span>
                        <span style={styles.statLabel}>Activos</span>
                    </div>
                    <div style={styles.statCard}>
                        <span style={styles.statNum}>{productores.filter(p => !p.activo).length}</span>
                        <span style={styles.statLabel}>Inactivos</span>
                    </div>
                    <div style={styles.statCard}>
                        <span style={styles.statNum}>{productores.filter(p => p.idioma_preferido === 'nah').length}</span>
                        <span style={styles.statLabel}>En Náhuatl</span>
                    </div>
                </div>

                {/* Buscador */}
                <div style={styles.searchBar}>
                    <input
                        style={styles.searchInput}
                        type="text"
                        placeholder="🔍 Buscar por nombre, folio o municipio..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                    />
                    <button style={styles.btnRecargar} onClick={cargarProductores}>↺ Recargar</button>
                </div>

                {/* Tabla */}
                {loading ? (
                    <p style={styles.loading}>Cargando productores...</p>
                ) : (
                    <div style={styles.tableWrap}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.theadRow}>
                                    <th style={styles.th}>Nombre</th>
                                    <th style={styles.th}>Folio</th>
                                    <th style={styles.th}>Municipio</th>
                                    <th style={styles.th}>Idioma</th>
                                    <th style={styles.th}>Acceso</th>
                                    <th style={styles.th}>Estado</th>
                                    <th style={styles.th}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.map(p => (
                                    <tr key={p.id} style={styles.tr}>
                                        <td style={styles.td}>{p.nombre} {p.apellidos}</td>
                                        <td style={styles.td}><code>{p.folio}</code></td>
                                        <td style={styles.td}>{p.municipio}, {p.estado}</td>
                                        <td style={styles.td}>{p.idioma_preferido === 'nah' ? '🌽 Náhuatl' : '🇲🇽 Español'}</td>
                                        <td style={styles.td}>{p.tipo_acceso}</td>
                                        <td style={styles.td}>
                                            <span style={p.activo ? styles.badgeActivo : styles.badgeInactivo}>
                                                {p.activo ? '✅ Activo' : '❌ Inactivo'}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <button
                                                style={p.activo ? styles.btnDesactivar : styles.btnActivar}
                                                onClick={() => toggleActivo(p.id, p.activo)}
                                            >
                                                {p.activo ? 'Desactivar' : 'Activar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filtrados.length === 0 && (
                                    <tr>
                                        <td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: '#aaa' }}>
                                            No se encontraron productores.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    wrapper: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a0a05 0%, #2d1a0a 50%, #1a0a05 100%)',
        fontFamily: 'Georgia, serif',
        color: '#f0ebdc',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(107,26,42,0.95)',
        padding: '1rem 2rem',
        borderBottom: '3px solid #b8860b',
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
    logoCircle: {
        width: '3rem', height: '3rem', borderRadius: '50%',
        background: '#b8860b', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontWeight: 900, fontSize: '1.5rem',
    },
    headerTitle: { margin: 0, fontSize: '1.4rem', letterSpacing: '0.2em', color: '#f0ebdc' },
    headerSub: { margin: 0, fontSize: '0.8rem', color: '#b8860b' },
    headerRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
    adminName: { fontSize: '0.9rem' },
    btnSalir: {
        background: 'transparent', border: '1px solid #f0ebdc',
        color: '#f0ebdc', padding: '0.4rem 1rem', borderRadius: '0.5rem',
        cursor: 'pointer', fontFamily: 'Georgia, serif',
    },
    main: { padding: '2rem', maxWidth: '1400px', margin: '0 auto' },
    statsGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem', marginBottom: '2rem',
    },
    statCard: {
        background: 'rgba(107,26,42,0.7)', border: '1px solid #b8860b',
        borderRadius: '1rem', padding: '1.5rem', display: 'flex',
        flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
    },
    statNum: { fontSize: '2.5rem', fontWeight: 900, color: '#b8860b' },
    statLabel: { fontSize: '0.85rem', color: '#f0ebdc', textAlign: 'center' },
    searchBar: { display: 'flex', gap: '1rem', marginBottom: '1.5rem' },
    searchInput: {
        flex: 1, padding: '0.75rem 1rem', borderRadius: '0.5rem',
        border: '1px solid #b8860b', background: 'rgba(0,0,0,0.4)',
        color: '#f0ebdc', fontSize: '0.9rem', fontFamily: 'Georgia, serif',
        outline: 'none',
    },
    btnRecargar: {
        padding: '0.75rem 1.5rem', borderRadius: '0.5rem',
        background: '#6b1a2a', border: '1px solid #b8860b',
        color: '#f0ebdc', cursor: 'pointer', fontFamily: 'Georgia, serif',
    },
    loading: { textAlign: 'center', color: '#b8860b', padding: '3rem' },
    tableWrap: { overflowX: 'auto', borderRadius: '1rem', border: '1px solid #b8860b' },
    table: { width: '100%', borderCollapse: 'collapse' },
    theadRow: { background: 'rgba(107,26,42,0.9)' },
    th: {
        padding: '1rem', textAlign: 'left', fontSize: '0.85rem',
        color: '#b8860b', borderBottom: '2px solid #b8860b', whiteSpace: 'nowrap',
    },
    tr: { borderBottom: '1px solid rgba(184,134,11,0.2)', background: 'rgba(0,0,0,0.3)' },
    td: { padding: '0.85rem 1rem', fontSize: '0.88rem', verticalAlign: 'middle' },
    badgeActivo: {
        background: 'rgba(0,200,100,0.2)', color: '#4ade80',
        padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem',
    },
    badgeInactivo: {
        background: 'rgba(200,0,0,0.2)', color: '#f87171',
        padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem',
    },
    btnActivar: {
        background: '#2d6a4f', color: 'white', border: 'none',
        padding: '0.35rem 0.8rem', borderRadius: '0.4rem', cursor: 'pointer', fontSize: '0.8rem',
    },
    btnDesactivar: {
        background: '#6b1a2a', color: 'white', border: 'none',
        padding: '0.35rem 0.8rem', borderRadius: '0.4rem', cursor: 'pointer', fontSize: '0.8rem',
    },
}

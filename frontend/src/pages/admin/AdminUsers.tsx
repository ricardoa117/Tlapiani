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
    created_at: string
}

export default function AdminUsers() {
    const navigate = useNavigate()
    const [productores, setProductores] = useState<Productor[]>([])
    const [loading, setLoading] = useState(true)

    const [busqueda, setBusqueda] = useState('')
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

    useEffect(() => {
        if (!usuario?.id || usuario?.rol !== 'admin') {
            navigate('/')
            return
        }
        cargar()
    }, [])

    const cargar = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('productores')
            .select('*')
            .order('created_at', { ascending: false })
        setProductores(data || [])
        setLoading(false)
    }

    const eliminar = async (id: string) => {
        if (!window.confirm('¿Eliminar este productor permanentemente?')) return
        await supabase.from('productores').delete().eq('id', id)
        cargar()
    }

    const filtrados = productores.filter(p =>
        p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.folio?.toLowerCase().includes(busqueda.toLowerCase())
    )

    return (
        <div style={styles.wrapper}>
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <button style={styles.btnBack} onClick={() => navigate('/admin/dashboard')}>← Dashboard</button>
                    <h1 style={styles.title}>Gestión de Usuarios</h1>
                </div>
                <input
                    style={styles.search}
                    placeholder=" Buscar..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                />
            </header>

            <main style={styles.main}>
                {loading ? (
                    <p style={styles.loading}>Cargando...</p>
                ) : (
                    <div style={styles.grid}>
                        {filtrados.map(p => (
                            <div key={p.id} style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <span style={styles.folio}>{p.folio}</span>
                                    <span style={p.activo ? styles.activo : styles.inactivo}>
                                        {p.activo ? '✅' : '❌'}
                                    </span>
                                </div>
                                <h3 style={styles.nombre}>{p.nombre} {p.apellidos}</h3>
                                <p style={styles.info}> {p.municipio}, {p.estado}</p>
                                <p style={styles.info}> {p.telefono || '—'}</p>
                                <p style={styles.info}> {p.tipo_acceso} · {p.idioma_preferido === 'nah' ? 'Náhuatl' : '🇲🇽 Español'}</p>
                                <div style={styles.cardActions}>
                                    <button
                                        style={styles.btnEliminar}
                                        onClick={() => eliminar(p.id)}
                                    >
                                         Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filtrados.length === 0 && (
                            <p style={{ color: '#aaa', gridColumn: '1/-1', textAlign: 'center' }}>
                                No hay usuarios.
                            </p>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    wrapper: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a0a05 0%, #2d1a0a 100%)',
        fontFamily: 'Georgia, serif',
        color: '#f0ebdc',
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(107,26,42,0.95)', padding: '1rem 2rem',
        borderBottom: '3px solid #b8860b', flexWrap: 'wrap', gap: '1rem',
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
    btnBack: {
        background: 'transparent', border: '1px solid #f0ebdc',
        color: '#f0ebdc', padding: '0.4rem 1rem', borderRadius: '0.5rem',
        cursor: 'pointer', fontFamily: 'Georgia, serif',
    },
    title: { margin: 0, fontSize: '1.3rem', letterSpacing: '0.1em' },
    search: {
        padding: '0.6rem 1rem', borderRadius: '0.5rem',
        border: '1px solid #b8860b', background: 'rgba(0,0,0,0.4)',
        color: '#f0ebdc', fontSize: '0.9rem', fontFamily: 'Georgia, serif',
        outline: 'none', minWidth: '220px',
    },
    main: { padding: '2rem', maxWidth: '1400px', margin: '0 auto' },
    loading: { textAlign: 'center', color: '#b8860b', padding: '3rem' },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.5rem',
    },
    card: {
        background: 'rgba(107,26,42,0.6)',
        border: '1px solid #b8860b', borderRadius: '1rem',
        padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
    },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    folio: { fontSize: '0.8rem', color: '#b8860b', fontWeight: 700, letterSpacing: '0.1em' },
    activo: { fontSize: '1.2rem' },
    inactivo: { fontSize: '1.2rem' },
    nombre: { margin: 0, fontSize: '1.1rem', color: '#f0ebdc' },
    info: { margin: 0, fontSize: '0.85rem', color: '#ccc' },
    cardActions: { marginTop: '1rem', display: 'flex', gap: '0.5rem' },
    btnEliminar: {
        background: '#6b1a2a', color: 'white', border: 'none',
        padding: '0.4rem 0.9rem', borderRadius: '0.4rem', cursor: 'pointer', fontSize: '0.8rem',
    },
}

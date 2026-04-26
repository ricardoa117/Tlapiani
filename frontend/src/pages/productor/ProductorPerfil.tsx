// src/pages/productor/ProductorPerfil.tsx
// ============================================================
// TLAPIANI — Perfil del Productor
// Muestra datos almacenados en localStorage
// ============================================================

import { useNavigate } from 'react-router-dom'

export default function ProductorPerfil() {
    const navigate = useNavigate()
    const raw = localStorage.getItem('usuario')
    const usuario = raw ? JSON.parse(raw) : null

    if (!usuario) {
        navigate('/login')
        return null
    }

    return (
        <div style={styles.wrapper}>
            <header style={styles.header}>
                <button style={styles.btnBack} onClick={() => navigate('/productor/dashboard')}>
                    ← Regresar
                </button>
                <h1 style={styles.title}>Mi Perfil</h1>
            </header>
            <main style={styles.main}>
                <div style={styles.card}>
                    <div style={styles.avatar}>
                        {usuario.nombre?.[0]?.toUpperCase() || '?'}
                    </div>
                    <h2 style={styles.nombre}>{usuario.nombre}</h2>
                    <span style={styles.folio}>Folio: {usuario.folio}</span>

                    <div style={styles.infoGrid}>
                        <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>Idioma</span>
                            <span style={styles.infoVal}>
                                {usuario.idioma_preferido === 'nah' ? 'Náhuatl' : '🇲🇽 Español'}
                            </span>
                        </div>
                        <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>Tipo de acceso</span>
                            <span style={styles.infoVal}>
                                {usuario.tipo_acceso === 'smartphone' ? '📱 Smartphone' :
                                    usuario.tipo_acceso === 'sms' ? '📞 SMS' : '❌ Sin celular'}
                            </span>
                        </div>
                        <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>Rol</span>
                            <span style={styles.infoVal}>{usuario.rol}</span>
                        </div>
                        {usuario.telefono && (
                            <div style={styles.infoItem}>
                                <span style={styles.infoLabel}>Teléfono</span>
                                <span style={styles.infoVal}>{usuario.telefono}</span>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}

// FIX: Paleta actualizada a guinda/dorado (antes usaba tonos verdes)
const styles: Record<string, React.CSSProperties> = {
    wrapper: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a0a05 0%, #2d1a0a 100%)',
        fontFamily: 'Georgia, serif', color: '#f0ebdc',
    },
    header: {
        display: 'flex', alignItems: 'center', gap: '1rem',
        background: 'rgba(107,26,42,0.95)', padding: '1rem 2rem',
        borderBottom: '3px solid #b8860b',
        flexWrap: 'wrap' as const,
    },
    btnBack: {
        background: 'transparent', border: '1px solid #f0ebdc',
        color: '#f0ebdc', padding: '0.4rem 1rem', borderRadius: '0.5rem',
        cursor: 'pointer', fontFamily: 'Georgia, serif',
    },
    title: { margin: 0, fontSize: '1.3rem', letterSpacing: '0.1em' },
    main: { padding: '3rem 1.5rem', display: 'flex', justifyContent: 'center' },
    card: {
        background: 'rgba(107,26,42,0.5)', border: '2px solid #b8860b',
        borderRadius: '1.5rem', padding: '3rem 2.5rem', maxWidth: '500px', width: '100%',
        display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '1rem',
    },
    avatar: {
        width: '6rem', height: '6rem', borderRadius: '50%',
        background: '#b8860b', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '2.5rem', fontWeight: 900, color: '#1a0a05',
    },
    nombre: { margin: 0, fontSize: '1.5rem', textAlign: 'center' as const },
    folio: {
        background: 'rgba(184,134,11,0.2)', color: '#b8860b',
        padding: '0.3rem 1rem', borderRadius: '999px', fontSize: '0.85rem',
    },
    infoGrid: { width: '100%', display: 'flex', flexDirection: 'column' as const, gap: '0.75rem', marginTop: '1rem' },
    infoItem: {
        display: 'flex', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(184,134,11,0.2)', paddingBottom: '0.5rem',
    },
    infoLabel: { color: '#aaa', fontSize: '0.85rem' },
    infoVal: { fontWeight: 700, fontSize: '0.9rem' },
}

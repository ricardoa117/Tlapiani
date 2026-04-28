// src/pages/productor/ProductorPerfil.tsx
import { useNavigate } from 'react-router-dom'

export default function ProductorPerfil() {
    const navigate = useNavigate()
    const raw = localStorage.getItem('usuario')
    const usuario = raw ? JSON.parse(raw) : null

    if (!usuario) {
        navigate('/login')
        return null
    }

    const inicial = usuario.nombre?.[0]?.toUpperCase() || '?'

    const infoItems = [
        {
            label: 'Idioma',
            value: usuario.idioma_preferido === 'nah' ? '🗣 Náhuatl' : '🇲🇽 Español',
            icon: '🌐',
        },
        {
            label: 'Tipo de acceso',
            value: usuario.tipo_acceso === 'smartphone' ? '📱 Smartphone'
                : usuario.tipo_acceso === 'sms' ? '📞 SMS' : '❌ Sin celular',
            icon: '📡',
        },
        {
            label: 'Rol',
            value: usuario.rol === 'admin' ? '⚙️ Administrador' : '🌾 Productor',
            icon: '👤',
        },
        ...(usuario.telefono ? [{
            label: 'Teléfono',
            value: usuario.telefono,
            icon: '☎️',
        }] : []),
    ]

    return (
        <div style={styles.wrapper}>
            {/* Glows decorativos */}
            <div style={styles.glow1} />
            <div style={styles.glow2} />

            <header style={styles.header}>
                <button style={styles.btnBack} onClick={() => navigate('/productor/dashboard')}>
                    ← Regresar
                </button>
                <h1 style={styles.title}>Mi Perfil</h1>
                <span style={styles.headerBadge}>TLAPIANI</span>
            </header>

            <main style={styles.main}>
                <div style={styles.card}>
                    {/* Barra decorativa superior */}
                    <div style={styles.cardTopBar} />

                    {/* Avatar */}
                    <div style={styles.avatarWrapper}>
                        <div style={styles.avatarRing} />
                        <div style={styles.avatar}>{inicial}</div>
                    </div>

                    <h2 style={styles.nombre}>{usuario.nombre}</h2>

                    <span style={styles.folio}>
                        <span style={styles.folioLabel}>FOLIO</span>
                        {usuario.folio}
                    </span>

                    {/* Info Grid */}
                    <div style={styles.infoGrid}>
                        {infoItems.map((item, i) => (
                            <div key={i} style={styles.infoItem}>
                                <div style={styles.infoLeft}>
                                    <span style={styles.infoIcon}>{item.icon}</span>
                                    <span style={styles.infoLabel}>{item.label}</span>
                                </div>
                                <span style={styles.infoVal}>{item.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Footer card */}
                    <div style={styles.cardFooter}>
                        <span style={styles.cardFooterText}>
                            🛡 Cuenta verificada por el administrador
                        </span>
                    </div>
                </div>
            </main>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    wrapper: {
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #1a0a05 0%, #0e0503 100%)',
        fontFamily: "'Lato', Georgia, sans-serif",
        color: '#f0ebdc',
        position: 'relative',
        overflow: 'hidden',
    },
    glow1: {
        position: 'fixed',
        top: '-15%', left: '-10%',
        width: '45vw', height: '45vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(107,26,42,0.3) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
    },
    glow2: {
        position: 'fixed',
        bottom: '-20%', right: '-10%',
        width: '45vw', height: '45vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(43,25,8,0.35) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        background: 'rgba(107,26,42,0.3)',
        padding: '1rem 2rem',
        borderBottom: '1px solid rgba(184,134,11,0.3)',
        flexWrap: 'wrap' as const,
        backdropFilter: 'blur(20px)',
        position: 'sticky' as const,
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    },
    btnBack: {
        background: 'rgba(240,235,220,0.08)',
        border: '1px solid rgba(240,235,220,0.2)',
        color: '#f0ebdc',
        padding: '0.45rem 1.1rem',
        borderRadius: '0.6rem',
        cursor: 'pointer',
        fontFamily: "'Lato', sans-serif",
        fontSize: '0.85rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
    },
    title: {
        margin: 0,
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: '1.2rem',
        letterSpacing: '0.15em',
        flex: 1,
    },
    headerBadge: {
        fontFamily: "'Cinzel', serif",
        fontSize: '0.72rem',
        color: '#b8860b',
        letterSpacing: '0.3em',
        textTransform: 'uppercase' as const,
    },
    main: {
        padding: '3rem 1.5rem',
        display: 'flex',
        justifyContent: 'center',
        position: 'relative' as const,
        zIndex: 1,
    },
    card: {
        background: 'rgba(20,8,3,0.6)',
        border: '1px solid rgba(184,134,11,0.3)',
        borderRadius: '1.75rem',
        padding: '0 0 2rem',
        maxWidth: '480px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(184,134,11,0.1)',
        overflow: 'hidden',
        position: 'relative' as const,
    },
    cardTopBar: {
        width: '100%',
        height: '5px',
        background: 'linear-gradient(90deg, #6b1a2a, #b8860b, #6b1a2a)',
        marginBottom: '2.5rem',
        flexShrink: 0,
    },
    avatarWrapper: {
        position: 'relative' as const,
        marginBottom: '1rem',
    },
    avatarRing: {
        position: 'absolute' as const,
        inset: '-6px',
        borderRadius: '50%',
        background: 'conic-gradient(from 0deg, #b8860b, #d4a017, #6b1a2a, #b8860b)',
        animation: 'spin 8s linear infinite',
        opacity: 0.6,
    },
    avatar: {
        width: '5.5rem',
        height: '5.5rem',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #6b1a2a, #4a1020)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Cinzel', serif",
        fontSize: '2.2rem',
        fontWeight: 900,
        color: '#b8860b',
        position: 'relative' as const,
        zIndex: 1,
        border: '3px solid #0e0503',
        boxShadow: '0 0 30px rgba(184,134,11,0.25)',
    },
    nombre: {
        margin: 0,
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: '1.4rem',
        letterSpacing: '0.06em',
        textAlign: 'center' as const,
        color: '#f0ebdc',
    },
    folio: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'rgba(184,134,11,0.12)',
        border: '1px solid rgba(184,134,11,0.3)',
        color: '#b8860b',
        padding: '0.35rem 1.2rem',
        borderRadius: '999px',
        fontSize: '0.85rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        marginTop: '0.25rem',
    },
    folioLabel: {
        fontSize: '0.68rem',
        color: 'rgba(184,134,11,0.6)',
        letterSpacing: '0.15em',
    },
    infoGrid: {
        width: '100%',
        padding: '1.75rem 2rem 0',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '0.5rem',
        marginTop: '1.25rem',
    },
    infoItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.7rem 1rem',
        borderRadius: '0.75rem',
        background: 'rgba(240,235,220,0.04)',
        border: '1px solid rgba(240,235,220,0.07)',
        transition: 'background 0.2s',
    },
    infoLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
    },
    infoIcon: { fontSize: '1rem', opacity: 0.7 },
    infoLabel: {
        color: 'rgba(240,235,220,0.45)',
        fontSize: '0.8rem',
        letterSpacing: '0.04em',
    },
    infoVal: {
        fontWeight: 700,
        fontSize: '0.85rem',
        color: '#f0ebdc',
    },
    cardFooter: {
        marginTop: '1.75rem',
        padding: '0.65rem 2rem',
        borderTop: '1px solid rgba(184,134,11,0.15)',
        width: '100%',
        textAlign: 'center' as const,
    },
    cardFooterText: {
        fontSize: '0.75rem',
        color: 'rgba(240,235,220,0.35)',
        letterSpacing: '0.04em',
    },
}

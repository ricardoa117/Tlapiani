// src/pages/productor/ProductorInstructivo.tsx
import { useNavigate } from 'react-router-dom'

const secciones = [
    {
        icon: '🔐',
        titulo: '1. Iniciar Sesión',
        texto: 'Ingresa con tu Folio (código asignado por el administrador) y tu contraseña. Si no tienes cuenta, presiona "Registrar" en la pantalla de login.',
        color: '#b8860b',
    },
    {
        icon: '🌾',
        titulo: '2. Ver Mis Cultivos',
        texto: 'En tu Dashboard encontrarás tus parcelas con el semáforo de salud: verde = bien, amarillo = atención, rojo = alerta. Actualizado con datos satelitales de la NASA.',
        color: '#22c55e',
    },
    {
        icon: '🛰️',
        titulo: '3. Datos Satelitales',
        texto: 'El sistema consulta MODIS/NDVI y NASA POWER para analizar la vegetación de tu parcela. Temperatura, humedad y lluvia actualizados cada semana.',
        color: '#3b82f6',
    },
    {
        icon: '🐛',
        titulo: '4. Alertas de Plagas',
        texto: 'Recibirás alertas cuando el modelo detecte condiciones propicias para plagas como el gusano cogollero o la roya. Incluye recomendaciones de control integrado.',
        color: '#ef4444',
    },
    {
        icon: '📱',
        titulo: '5. WhatsApp',
        texto: 'Si elegiste acceso por WhatsApp, recibirás resúmenes semanales y alertas directamente en tu celular en Náhuatl o Español según tu preferencia.',
        color: '#22c55e',
    },
    {
        icon: '🛟',
        titulo: '6. Soporte',
        texto: 'Para cambiar tu contraseña, actualizar tu parcela o reportar un problema, contacta a tu técnico agrícola o al administrador del sistema.',
        color: '#b8860b',
    },
]

export default function ProductorInstructivo() {
    const navigate = useNavigate()

    return (
        <div style={styles.wrapper}>
            {/* Fondo decorativo */}
            <div style={styles.bgGlow1} />
            <div style={styles.bgGlow2} />

            <header style={styles.header}>
                <button style={styles.btnBack} onClick={() => navigate('/productor/dashboard')}>
                    ← Regresar
                </button>
                <h1 style={styles.title}>Instructivo de Uso</h1>
                <span style={styles.headerSub}>TLAPIANI</span>
            </header>

            <main style={styles.main}>
                {/* Intro */}
                <div style={styles.intro}>
                    <div style={styles.introIcon}>🌿</div>
                    <h2 style={styles.introTitle}>¿Cómo usar Tlapiani?</h2>
                    <p style={styles.introText}>
                        Tlapiani es tu aliado digital en el campo. Aquí te explicamos cómo
                        aprovechar todas sus funciones para proteger y optimizar tus cultivos.
                    </p>
                    <div style={styles.introDivider} />
                </div>

                {/* Grid de secciones */}
                <div style={styles.grid}>
                    {secciones.map((s, i) => (
                        <div
                            key={i}
                            style={{
                                ...styles.card,
                                animationDelay: `${i * 0.07}s`,
                                borderTop: `3px solid ${s.color}22`,
                            }}
                            onMouseEnter={e => {
                                const el = e.currentTarget
                                el.style.transform = 'translateY(-8px)'
                                el.style.borderColor = `${s.color}55`
                                el.style.boxShadow = `0 20px 50px rgba(0,0,0,0.4), 0 0 30px ${s.color}10`
                            }}
                            onMouseLeave={e => {
                                const el = e.currentTarget
                                el.style.transform = 'translateY(0)'
                                el.style.borderColor = 'rgba(184,134,11,0.2)'
                                el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)'
                            }}
                        >
                            {/* Número de fondo */}
                            <span style={styles.cardNum}>{i + 1}</span>

                            <span style={{ ...styles.icon, textShadow: `0 0 20px ${s.color}60` }}>
                                {s.icon}
                            </span>
                            <h3 style={{ ...styles.cardTitle, color: s.color }}>{s.titulo}</h3>
                            <p style={styles.cardText}>{s.texto}</p>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div style={styles.footer}>
                    <span style={styles.footerIcon}>💬</span>
                    <p style={styles.footerText}>
                        ¿Necesitas ayuda en Náhuatl? Escríbenos por WhatsApp y te atenderemos en tu idioma.
                    </p>
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
    bgGlow1: {
        position: 'fixed',
        top: '-20%', left: '-10%',
        width: '50vw', height: '50vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(107,26,42,0.25) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
    },
    bgGlow2: {
        position: 'fixed',
        bottom: '-20%', right: '-10%',
        width: '50vw', height: '50vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(43,25,8,0.3) 0%, transparent 70%)',
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
        transition: 'all 0.2s',
    },
    title: {
        margin: 0,
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: '1.2rem',
        letterSpacing: '0.15em',
        color: '#f0ebdc',
        flex: 1,
    },
    headerSub: {
        fontFamily: "'Cinzel', serif",
        fontSize: '0.72rem',
        color: '#b8860b',
        letterSpacing: '0.3em',
        textTransform: 'uppercase' as const,
    },
    main: {
        padding: '2.5rem 1.5rem 4rem',
        maxWidth: '1100px',
        margin: '0 auto',
        position: 'relative' as const,
        zIndex: 1,
    },
    intro: {
        background: 'rgba(107,26,42,0.2)',
        border: '1px solid rgba(184,134,11,0.3)',
        borderRadius: '1.5rem',
        padding: '2.5rem 2rem',
        marginBottom: '2.5rem',
        textAlign: 'center' as const,
        backdropFilter: 'blur(16px)',
        position: 'relative' as const,
        overflow: 'hidden',
    },
    introIcon: {
        fontSize: '3rem',
        display: 'block',
        marginBottom: '0.75rem',
        filter: 'drop-shadow(0 0 15px rgba(34,197,94,0.4))',
    },
    introTitle: {
        margin: '0 0 0.9rem',
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: 'clamp(1.3rem, 3vw, 1.7rem)',
        color: '#b8860b',
        letterSpacing: '0.08em',
    },
    introText: {
        margin: '0 auto',
        color: 'rgba(240,235,220,0.7)',
        lineHeight: 1.75,
        maxWidth: '580px',
        fontSize: '0.92rem',
    },
    introDivider: {
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(184,134,11,0.4), transparent)',
        margin: '1.5rem auto 0',
        width: '60%',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem',
    },
    card: {
        background: 'rgba(20,8,3,0.55)',
        border: '1px solid rgba(184,134,11,0.2)',
        borderRadius: '1.25rem',
        padding: '2rem 1.75rem',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '0.75rem',
        transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        backdropFilter: 'blur(12px)',
        position: 'relative' as const,
        overflow: 'hidden',
        cursor: 'default',
    },
    cardNum: {
        position: 'absolute' as const,
        top: '0.75rem',
        right: '1.25rem',
        fontFamily: "'Cinzel', serif",
        fontSize: '4rem',
        fontWeight: 900,
        color: 'rgba(184,134,11,0.06)',
        lineHeight: 1,
        pointerEvents: 'none',
        userSelect: 'none' as const,
    },
    icon: { fontSize: '2.2rem', display: 'block' },
    cardTitle: {
        margin: 0,
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: '0.92rem',
        fontWeight: 700,
        letterSpacing: '0.06em',
    },
    cardText: {
        margin: 0,
        fontSize: '0.83rem',
        color: 'rgba(240,235,220,0.6)',
        lineHeight: 1.65,
    },
    footer: {
        background: 'rgba(107,26,42,0.2)',
        border: '1px solid rgba(184,134,11,0.25)',
        borderRadius: '1.25rem',
        padding: '1.75rem 2rem',
        textAlign: 'center' as const,
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        flexWrap: 'wrap' as const,
    },
    footerIcon: { fontSize: '1.8rem', filter: 'drop-shadow(0 0 10px rgba(34,197,94,0.4))' },
    footerText: { margin: 0, color: 'rgba(240,235,220,0.8)', fontSize: '0.9rem', letterSpacing: '0.03em' },
}

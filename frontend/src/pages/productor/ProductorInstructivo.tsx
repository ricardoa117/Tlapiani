import { useNavigate } from 'react-router-dom'

const secciones = [
    {
        icon: '',
        titulo: '1. Iniciar Sesión',
        texto: 'Ingresa con tu Folio (código asignado por el administrador) y tu contraseña. Si no tienes cuenta, presiona "Registrar" en la pantalla de login.',
    },
    {
        icon: '',
        titulo: '2. Ver Mis Cultivos',
        texto: 'En tu Dashboard encontrarás tus parcelas registradas con el semáforo de salud (verde = bien, amarillo = atención, rojo = alerta). Actualizado con datos satelitales de la NASA.',
    },
    {
        icon: '',
        titulo: '3. Datos Satelitales',
        texto: 'El sistema consulta MODIS/NDVI y NASA POWER para analizar la vegetación de tu parcela. Los datos se actualizan cada semana con información de temperatura, humedad y lluvia.',
    },
    {
        icon: '',
        titulo: '4. Alertas de Plagas',
        texto: 'Recibirás alertas cuando el modelo detecte condiciones propicias para plagas como el gusano cogollero o la roya. Incluye recomendaciones de control integrado.',
    },
    {
        icon: '',
        titulo: '5. WhatsApp',
        texto: 'Si elegiste acceso por WhatsApp, recibirás resúmenes semanales y alertas directamente en tu celular en Náhuatl o Español según tu preferencia.',
    },
    {
        icon: '',
        titulo: '6. Soporte',
        texto: 'Para cambiar tu contraseña, actualizar tu parcela o reportar un problema, contacta a tu técnico agrícola o al administrador del sistema.',
    },
]

export default function ProductorInstructivo() {
    const navigate = useNavigate()

    return (
        <div style={styles.wrapper}>
            <header style={styles.header}>
                <button style={styles.btnBack} onClick={() => navigate('/productor/dashboard')}>
                    ← Regresar
                </button>
                <h1 style={styles.title}>Instructivo de Uso</h1>
            </header>

            <main style={styles.main}>
                <div style={styles.intro}>
                    <h2 style={styles.introTitle}> ¿Cómo usar Tlapiani?</h2>
                    <p style={styles.introText}>
                        Tlapiani es tu aliado digital en el campo. Aquí te explicamos cómo aprovechar
                        todas sus funciones para proteger y optimizar tus cultivos.
                    </p>
                </div>

                <div style={styles.grid}>
                    {secciones.map((s, i) => (
                        <div key={i} style={styles.card}>
                            <span style={styles.icon}>{s.icon}</span>
                            <h3 style={styles.cardTitle}>{s.titulo}</h3>
                            <p style={styles.cardText}>{s.texto}</p>
                        </div>
                    ))}
                </div>

                <div style={styles.footer}>
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
        background: 'linear-gradient(135deg, #0a1a05 0%, #1a2d0a 100%)',
        fontFamily: 'Georgia, serif', color: '#f0ebdc',
    },
    header: {
        display: 'flex', alignItems: 'center', gap: '1rem',
        background: 'rgba(20,60,20,0.95)', padding: '1rem 2rem',
        borderBottom: '3px solid #b8860b',
    },
    btnBack: {
        background: 'transparent', border: '1px solid #f0ebdc',
        color: '#f0ebdc', padding: '0.4rem 1rem', borderRadius: '0.5rem',
        cursor: 'pointer', fontFamily: 'Georgia, serif',
    },
    title: { margin: 0, fontSize: '1.3rem', letterSpacing: '0.1em' },
    main: { padding: '2rem', maxWidth: '1200px', margin: '0 auto' },
    intro: {
        background: 'rgba(20,60,20,0.7)', border: '1px solid #b8860b',
        borderRadius: '1rem', padding: '2rem', marginBottom: '2rem', textAlign: 'center',
    },
    introTitle: { margin: '0 0 1rem', fontSize: '1.6rem', color: '#b8860b' },
    introText: { margin: 0, color: '#ccc', lineHeight: 1.7, maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' },
    grid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem', marginBottom: '2rem',
    },
    card: {
        background: 'rgba(20,60,20,0.6)', border: '1px solid rgba(184,134,11,0.4)',
        borderRadius: '1rem', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
        transition: 'border-color 0.2s',
    },
    icon: { fontSize: '2rem' },
    cardTitle: { margin: 0, fontSize: '1rem', color: '#b8860b' },
    cardText: { margin: 0, fontSize: '0.88rem', color: '#ccc', lineHeight: 1.6 },
    footer: {
        background: 'rgba(107,26,42,0.4)', border: '1px solid rgba(184,134,11,0.3)',
        borderRadius: '1rem', padding: '1.5rem', textAlign: 'center',
    },
    footerText: { margin: 0, color: '#f0ebdc', fontSize: '0.95rem' },
}

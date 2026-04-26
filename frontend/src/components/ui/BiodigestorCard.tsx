interface BiodigestorCardProps {
    temperatura?: number
    ph?: number
    produccion_gas?: number
    estado?: 'optimo' | 'regular' | 'critico' | string
}

const estadoColor: Record<string, string> = {
    optimo: '#4ade80',
    regular: '#facc15',
    critico: '#f87171',
}

export default function BiodigestorCard({ temperatura, ph, produccion_gas, estado }: BiodigestorCardProps) {
    const color = estadoColor[estado ?? ''] ?? '#aaa'

    return (
        <div style={styles.card}>
            <div style={styles.header}>
                <h4 style={styles.title}> Biodigestor</h4>
                {estado && (
                    <span style={{ ...styles.badge, background: color + '22', color, border: `1px solid ${color}` }}>
                        {estado}
                    </span>
                )}
            </div>
            <div style={styles.metrics}>
                {temperatura !== undefined && (
                    <div style={styles.metric}>
                        <span style={styles.metricLabel}> Temp.</span>
                        <span style={styles.metricVal}>{temperatura}°C</span>
                    </div>
                )}
                {ph !== undefined && (
                    <div style={styles.metric}>
                        <span style={styles.metricLabel}> pH</span>
                        <span style={styles.metricVal}>{ph}</span>
                    </div>
                )}
                {produccion_gas !== undefined && (
                    <div style={styles.metric}>
                        <span style={styles.metricLabel}> Gas</span>
                        <span style={styles.metricVal}>{produccion_gas} m³/día</span>
                    </div>
                )}
            </div>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    card: {
        background: 'rgba(20,60,20,0.6)',
        border: '1px solid #b8860b',
        borderRadius: '1rem',
        padding: '1.25rem',
        fontFamily: 'Georgia, serif',
        color: '#f0ebdc',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: { margin: 0, fontSize: '1rem', color: '#b8860b' },
    badge: {
        padding: '0.2rem 0.6rem',
        borderRadius: '999px',
        fontSize: '0.78rem',
        fontWeight: 700,
    },
    metrics: {
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
    },
    metric: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
    },
    metricLabel: { fontSize: '0.75rem', color: '#aaa' },
    metricVal: { fontSize: '1rem', fontWeight: 700 },
}

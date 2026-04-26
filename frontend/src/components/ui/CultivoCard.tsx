interface CultivoCardProps {
    cultivo: string
    variedad?: string
    hectareas?: number
    estado_semaforo?: string
    fecha_siembra?: string
}

const colores: Record<string, string> = {
    verde: '#4ade80',
    amarillo: '#facc15',
    rojo: '#f87171',
}

export default function CultivoCard({ cultivo, variedad, hectareas, estado_semaforo, fecha_siembra }: CultivoCardProps) {
    const color = colores[estado_semaforo ?? ''] ?? '#aaa'

    return (
        <div style={styles.card}>
            <div style={styles.header}>
                <h4 style={styles.nombre}>{cultivo}</h4>
                <span
                    style={{
                        ...styles.semaforo,
                        background: color,
                        boxShadow: `0 0 8px ${color}`,
                    }}
                />
            </div>
            {variedad && <p style={styles.info}>Variedad: {variedad}</p>}
            {hectareas && <p style={styles.info}>Superficie: {hectareas} ha</p>}
            {fecha_siembra && <p style={styles.info}>Siembra: {fecha_siembra}</p>}
            <p style={{ ...styles.info, color }}>
                {estado_semaforo
                    ? estado_semaforo.charAt(0).toUpperCase() + estado_semaforo.slice(1)
                    : 'Sin datos'}
            </p>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    card: {
        background: 'rgba(20,60,20,0.6)',
        border: '1px solid #b8860b',
        borderRadius: '1rem',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        fontFamily: 'Georgia, serif',
        color: '#f0ebdc',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    nombre: {
        margin: 0,
        fontSize: '1.05rem',
    },
    semaforo: {
        width: '1rem',
        height: '1rem',
        borderRadius: '50%',
        flexShrink: 0,
    },
    info: {
        margin: 0,
        fontSize: '0.83rem',
        color: '#ccc',
    },
}

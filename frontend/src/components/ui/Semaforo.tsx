interface SemaforoProps {
    estado: 'verde' | 'amarillo' | 'rojo' | string
    size?: number
    showLabel?: boolean
}

const colores: Record<string, string> = {
    verde: '#4ade80',
    amarillo: '#facc15',
    rojo: '#f87171',
}

const etiquetas: Record<string, string> = {
    verde: 'Bien',
    amarillo: 'Atención',
    rojo: 'Alerta',
}

export default function Semaforo({ estado, size = 16, showLabel = false }: SemaforoProps) {
    const color = colores[estado] ?? '#aaa'
    const label = etiquetas[estado] ?? estado

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <span
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 6px ${color}`,
                    display: 'inline-block',
                    flexShrink: 0,
                }}
            />
            {showLabel && (
                <span style={{ fontSize: '0.8rem', color }}>{label}</span>
            )}
        </span>
    )
}

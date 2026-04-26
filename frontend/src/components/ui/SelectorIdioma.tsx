import type { Idioma } from '../../lib/translations'

interface SelectorIdiomaProps {
    value: Idioma
    onChange: (idioma: Idioma) => void
}

export default function SelectorIdioma({ value, onChange }: SelectorIdiomaProps) {
    return (
        <div style={styles.wrapper}>
            <button
                style={{
                    ...styles.btn,
                    ...(value === 'es' ? styles.btnActive : {}),
                }}
                onClick={() => onChange('es')}
            >
                🇲🇽 Español
            </button>
            <button
                style={{
                    ...styles.btn,
                    ...(value === 'nah' ? styles.btnActive : {}),
                }}
                onClick={() => onChange('nah')}
            >
                 Náhuatl
            </button>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    wrapper: {
        display: 'inline-flex',
        gap: '0.5rem',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '999px',
        padding: '0.25rem',
    },
    btn: {
        padding: '0.35rem 0.9rem',
        borderRadius: '999px',
        border: 'none',
        background: 'transparent',
        color: '#ccc',
        cursor: 'pointer',
        fontFamily: 'Georgia, serif',
        fontSize: '0.82rem',
        transition: 'all 0.2s',
    },
    btnActive: {
        background: '#b8860b',
        color: '#1a0a05',
        fontWeight: 700,
    },
}

// src/pages/productor/ProductorDashboard.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface Monitoreo {
    id: string;
    fecha: string;
    temperatura_max: number;
    temperatura_min: number;
    humedad_relativa: number;
    precipitacion: number;
    ndvi: number;
    estado_semaforo: 'verde' | 'amarillo' | 'rojo';
    recomendacion_texto_es: string;
    recomendacion_texto_nah: string;
    alerta_plaga: boolean;
    plaga_probable: string;
    lote: {
        cultivo: string;
        parcela: {
            nombre: string;
        };
    };
}

interface Recomendacion {
    cultivo_sugerido: string;
    compatibilidad_porcentaje: number;
    ganancia_estimada_ha: number;
    razon_tecnica: string;
    rendimiento_ha: string;
    demanda: string;
    ventaja_puebla: string;
    lote: {
        cultivo: string;
    };
}

export default function ProductorDashboard() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState<any>(null);
    const [monitoreos, setMonitoreos] = useState<Monitoreo[]>([]);
    const [recomendaciones, setRecomendaciones] = useState<Recomendacion[]>([]);
    const [cargando, setCargando] = useState(true);
    const [estadisticas, setEstadisticas] = useState({
        total_monitoreos: 0,
        parcelas_activas: 0,
        alertas: 0,
        lotes_rojos: 0
    });

    useEffect(() => {
        const usuarioData = localStorage.getItem('usuario');
        if (!usuarioData) {
            navigate('/login');
            return;
        }

        const datos = JSON.parse(usuarioData);
        if (datos.rol !== 'productor') {
            navigate('/admin/dashboard');
            return;
        }

        setUsuario(datos);
        cargarDatos(datos.id);
    }, [navigate]);

    async function cargarDatos(productorId: string) {
        setCargando(true);

        const { data: parcelasData } = await supabase
            .from('parcelas')
            .select(`
        id,
        nombre,
        lotes_cultivo(
          id,
          cultivo,
          monitoreo_lote(
            id,
            fecha,
            temperatura_max,
            temperatura_min,
            humedad_relativa,
            precipitacion,
            ndvi,
            estado_semaforo,
            recomendacion_texto_es,
            recomendacion_texto_nah,
            alerta_plaga,
            plaga_probable
          )
        )
      `)
            .eq('productor_id', productorId);

        const monitoreosList: Monitoreo[] = [];
        parcelasData?.forEach(parcela => {
            parcela.lotes_cultivo?.forEach((lote: any) => {
                lote.monitoreo_lote?.forEach((mon: any) => {
                    monitoreosList.push({
                        ...mon,
                        lote: {
                            cultivo: lote.cultivo,
                            parcela: {
                                nombre: parcela.nombre
                            }
                        }
                    });
                });
            });
        });

        monitoreosList.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        setMonitoreos(monitoreosList.slice(0, 10));

        const parcelas = parcelasData?.length || 0;
        const alertas = monitoreosList.filter(m => m.alerta_plaga).length;
        const rojos = monitoreosList.filter(m => m.estado_semaforo === 'rojo').length;

        setEstadisticas({
            total_monitoreos: monitoreosList.length,
            parcelas_activas: parcelas,
            alertas: alertas,
            lotes_rojos: rojos
        });

        // Cargar recomendaciones - QUERY CORREGIDO
        const { data: lotesData } = await supabase
            .from('lotes_cultivo')
            .select(`
        id,
        cultivo,
        parcelas!inner(productor_id)
      `)
            .eq('parcelas.productor_id', productorId);

        if (lotesData && lotesData.length > 0) {
            const lotesIds = lotesData.map(l => l.id);

            const { data: recomendacionesData } = await supabase
                .from('recomendaciones_lote')
                .select('*')
                .in('lote_id', lotesIds)
                .order('fecha_generacion', { ascending: false })
                .limit(5);

            if (recomendacionesData) {
                const recsConCultivo = recomendacionesData.map(rec => {
                    const lote = lotesData.find(l => l.id === rec.lote_id);
                    return {
                        ...rec,
                        lote: {
                            cultivo: lote?.cultivo || ''
                        }
                    };
                });
                setRecomendaciones(recsConCultivo);
            }
        }

        setCargando(false);
    }

    function cerrarSesion() {
        localStorage.removeItem('usuario');
        navigate('/login');
    }

    const emojiCultivo = (cultivo: string) => {
        const lower = cultivo.toLowerCase();
        if (lower.includes('maíz') || lower.includes('maiz')) return '🌽';
        if (lower.includes('café') || lower.includes('cafe')) return '☕';
        if (lower.includes('aguacate')) return '🥑';
        if (lower.includes('nopal')) return '🌵';
        if (lower.includes('frijol')) return '🫘';
        return '🌱';
    };

    if (cargando) {
        return (
            <div style={{
                background: 'linear-gradient(135deg, #2d1a0a 0%, #1a0a05 100%)',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Georgia, serif',
                color: '#f0ebdc',
                padding: '20px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌾</div>
                    <p>Cargando tus cultivos...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            background: 'linear-gradient(135deg, #2d1a0a 0%, #1a0a05 100%)',
            minHeight: '100vh',
            padding: 'clamp(12px, 3vw, 20px)',
            fontFamily: 'Georgia, serif'
        }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>

                {/* ENCABEZADO */}
                <div style={{
                    background: '#f0ebdc',
                    border: '2px solid #b8860b',
                    borderRadius: '12px',
                    padding: 'clamp(16px, 3vw, 20px)',
                    marginBottom: 'clamp(16px, 3vw, 20px)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h1 style={{
                                color: '#6b1a2a',
                                fontSize: 'clamp(20px, 5vw, 28px)',
                                margin: '0 0 4px 0'
                            }}>
                                🌾 Mis Cultivos
                            </h1>
                            <p style={{ color: '#2b2620', margin: 0, fontSize: 'clamp(12px, 2.5vw, 14px)' }}>
                                {usuario?.nombre} • {usuario?.folio}
                            </p>
                            <p style={{ color: '#666', margin: '4px 0 0 0', fontSize: 'clamp(10px, 2vw, 12px)' }}>
                                Idioma: {usuario?.idioma_preferido === 'es' ? 'Español' : usuario?.idioma_preferido === 'nah' ? 'Náhuatl' : 'Totonaco'} •
                                {usuario?.tipo_acceso === 'smartphone' ? ' 📱 Smartphone' : usuario?.tipo_acceso === 'sms' ? ' 📞 SMS' : ' Sin celular'}
                            </p>
                        </div>
                        <button
                            onClick={cerrarSesion}
                            style={{
                                background: '#6b1a2a',
                                color: '#f0ebdc',
                                border: 'none',
                                padding: 'clamp(6px, 2vw, 8px) clamp(12px, 3vw, 16px)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: 'clamp(11px, 2.5vw, 13px)',
                                fontWeight: 'bold'
                            }}
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>

                {/* ESTADÍSTICAS */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 'clamp(10px, 2vw, 12px)',
                    marginBottom: 'clamp(16px, 3vw, 20px)'
                }}>
                    {[
                        { valor: estadisticas.total_monitoreos, label: 'Monitoreos', color: '#6b1a2a' },
                        { valor: estadisticas.parcelas_activas, label: 'Parcelas', color: '#1D9E75' },
                        { valor: estadisticas.alertas, label: 'Alertas', color: estadisticas.alertas > 0 ? '#D85A30' : '#1D9E75' },
                        { valor: estadisticas.lotes_rojos, label: 'Urgentes', color: '#D85A30' }
                    ].map((stat, i) => (
                        <div key={i} style={{
                            background: '#f0ebdc',
                            border: '2px solid #b8860b',
                            borderRadius: '12px',
                            padding: 'clamp(14px, 3vw, 16px)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: 'clamp(28px, 6vw, 32px)', fontWeight: 'bold', color: stat.color, marginBottom: '4px' }}>
                                {stat.valor}
                            </div>
                            <div style={{ fontSize: 'clamp(10px, 2vw, 12px)', color: '#2b2620', textTransform: 'uppercase' }}>
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ALERTAS CRÍTICAS */}
                {estadisticas.alertas > 0 && (
                    <div style={{
                        background: '#FCEBEB',
                        border: '2px solid #D85A30',
                        borderRadius: '12px',
                        padding: 'clamp(12px, 3vw, 16px)',
                        marginBottom: 'clamp(16px, 3vw, 20px)'
                    }}>
                        <h2 style={{
                            color: '#D85A30',
                            fontSize: 'clamp(16px, 4vw, 18px)',
                            margin: '0 0 8px 0'
                        }}>
                            🚨 Tienes {estadisticas.alertas} alerta{estadisticas.alertas > 1 ? 's' : ''} activa{estadisticas.alertas > 1 ? 's' : ''}
                        </h2>
                        <p style={{
                            color: '#791F1F',
                            fontSize: 'clamp(12px, 2.5vw, 14px)',
                            margin: 0
                        }}>
                            Revisa tus lotes lo antes posible.
                        </p>
                    </div>
                )}

                {/* RECOMENDACIONES ECONÓMICAS */}
                {recomendaciones.length > 0 && (
                    <div style={{ marginBottom: 'clamp(20px, 4vw, 24px)' }}>
                        <h2 style={{
                            color: '#f0ebdc',
                            fontSize: 'clamp(18px, 4vw, 22px)',
                            marginBottom: '12px'
                        }}>
                            💰 Recomendaciones de Cultivo
                        </h2>

                        {recomendaciones.map((rec, index) => (
                            <div
                                key={index}
                                style={{
                                    background: 'linear-gradient(135deg, #E1F5EE 0%, #E8F8F3 100%)',
                                    border: '2px solid #1D9E75',
                                    borderRadius: '12px',
                                    padding: 'clamp(14px, 3vw, 18px)',
                                    marginBottom: '12px'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'start',
                                    marginBottom: '10px',
                                    flexWrap: 'wrap',
                                    gap: '8px'
                                }}>
                                    <div>
                                        <div style={{ fontSize: 'clamp(11px, 2vw, 12px)', color: '#085041', fontWeight: 'bold', marginBottom: '4px' }}>
                                            Para tu lote de {emojiCultivo(rec.lote.cultivo)} {rec.lote.cultivo}
                                        </div>
                                        <div style={{ fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: 'bold', color: '#1D9E75' }}>
                                            {rec.cultivo_sugerido}
                                        </div>
                                    </div>
                                    <div style={{
                                        background: '#1D9E75',
                                        color: 'white',
                                        padding: '4px 10px',
                                        borderRadius: '12px',
                                        fontSize: 'clamp(10px, 2vw, 11px)',
                                        fontWeight: 'bold'
                                    }}>
                                        {rec.compatibilidad_porcentaje}% compatible
                                    </div>
                                </div>

                                <p style={{
                                    fontSize: 'clamp(11px, 2vw, 12px)',
                                    color: '#085041',
                                    lineHeight: '1.5',
                                    margin: '0 0 10px 0'
                                }}>
                                    {rec.razon_tecnica}
                                </p>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                    gap: '8px',
                                    marginBottom: '10px'
                                }}>
                                    <div style={{
                                        background: 'rgba(255,255,255,0.7)',
                                        padding: '8px',
                                        borderRadius: '6px'
                                    }}>
                                        <div style={{ fontSize: 'clamp(9px, 2vw, 10px)', color: '#085041', marginBottom: '2px' }}>
                                            Rendimiento
                                        </div>
                                        <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', fontWeight: 'bold', color: '#1D9E75' }}>
                                            {rec.rendimiento_ha}
                                        </div>
                                    </div>

                                    <div style={{
                                        background: 'rgba(255,255,255,0.7)',
                                        padding: '8px',
                                        borderRadius: '6px'
                                    }}>
                                        <div style={{ fontSize: 'clamp(9px, 2vw, 10px)', color: '#085041', marginBottom: '2px' }}>
                                            Ganancia/ha
                                        </div>
                                        <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', fontWeight: 'bold', color: '#1D9E75' }}>
                                            ${(rec.ganancia_estimada_ha || 0).toLocaleString('es-MX')}
                                        </div>
                                    </div>

                                    <div style={{
                                        background: 'rgba(255,255,255,0.7)',
                                        padding: '8px',
                                        borderRadius: '6px'
                                    }}>
                                        <div style={{ fontSize: 'clamp(9px, 2vw, 10px)', color: '#085041', marginBottom: '2px' }}>
                                            Demanda
                                        </div>
                                        <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', fontWeight: 'bold', color: '#1D9E75' }}>
                                            {rec.demanda}
                                        </div>
                                    </div>
                                </div>

                                {rec.ventaja_puebla && (
                                    <div style={{
                                        background: 'rgba(255,255,255,0.7)',
                                        padding: '8px',
                                        borderRadius: '6px',
                                        fontSize: 'clamp(10px, 2vw, 11px)',
                                        color: '#085041'
                                    }}>
                                        <strong>Ventaja en Puebla:</strong> {rec.ventaja_puebla}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* MONITOREOS */}
                <h2 style={{
                    color: '#f0ebdc',
                    fontSize: 'clamp(18px, 4vw, 22px)',
                    marginBottom: '12px'
                }}>
                    📊 Últimos Monitoreos
                </h2>

                {monitoreos.length === 0 ? (
                    <div style={{
                        background: '#f0ebdc',
                        border: '2px solid #b8860b',
                        borderRadius: '12px',
                        padding: 'clamp(40px, 8vw, 60px)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 'clamp(40px, 8vw, 48px)', marginBottom: '16px' }}>🌱</div>
                        <p style={{ color: '#2b2620', fontSize: 'clamp(14px, 3vw, 16px)' }}>
                            Aún no hay registros de monitoreo.
                        </p>
                        <p style={{ color: '#666', fontSize: 'clamp(12px, 2.5vw, 14px)' }}>
                            Los datos satelitales llegarán pronto.
                        </p>
                    </div>
                ) : (
                    monitoreos.map((mon) => (
                        <div
                            key={mon.id}
                            style={{
                                background: '#f0ebdc',
                                border: '2px solid #b8860b',
                                borderRadius: '12px',
                                padding: 'clamp(14px, 3vw, 18px)',
                                marginBottom: 'clamp(14px, 3vw, 16px)',
                                borderLeft: `6px solid ${mon.estado_semaforo === 'rojo' ? '#D85A30' :
                                        mon.estado_semaforo === 'amarillo' ? '#BA7517' :
                                            '#1D9E75'
                                    }`
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                <div>
                                    <h3 style={{
                                        color: '#2b2620',
                                        fontSize: 'clamp(16px, 4vw, 18px)',
                                        margin: '0 0 4px 0'
                                    }}>
                                        {emojiCultivo(mon.lote.cultivo)} {mon.lote.cultivo}
                                    </h3>
                                    <p style={{ color: '#666', margin: 0, fontSize: 'clamp(11px, 2vw, 12px)' }}>
                                        {mon.lote.parcela.nombre} • {new Date(mon.fecha).toLocaleDateString('es-MX')}
                                    </p>
                                </div>

                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    borderRadius: '16px',
                                    fontSize: 'clamp(10px, 2vw, 12px)',
                                    fontWeight: 'bold',
                                    background:
                                        mon.estado_semaforo === 'rojo' ? '#FCEBEB' :
                                            mon.estado_semaforo === 'amarillo' ? '#FAEEDA' :
                                                '#E1F5EE',
                                    color:
                                        mon.estado_semaforo === 'rojo' ? '#D85A30' :
                                            mon.estado_semaforo === 'amarillo' ? '#BA7517' :
                                                '#1D9E75'
                                }}>
                                    {mon.estado_semaforo === 'rojo' ? '🔴 URGENTE' :
                                        mon.estado_semaforo === 'amarillo' ? '🟡 VIGILAR' :
                                            '🟢 NORMAL'}
                                </div>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                                gap: 'clamp(10px, 2vw, 12px)',
                                marginBottom: '12px'
                            }}>
                                <div>
                                    <div style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: '#666', marginBottom: '2px' }}>
                                        TEMP MAX
                                    </div>
                                    <div style={{ fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: 'bold', color: '#2b2620' }}>
                                        {mon.temperatura_max}°C
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: '#666', marginBottom: '2px' }}>
                                        HUMEDAD
                                    </div>
                                    <div style={{ fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: 'bold', color: '#2b2620' }}>
                                        {mon.humedad_relativa}%
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: '#666', marginBottom: '2px' }}>
                                        SALUD
                                    </div>
                                    <div style={{ fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: 'bold', color: '#2b2620' }}>
                                        {(mon.ndvi * 100).toFixed(0)}%
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: '#666', marginBottom: '2px' }}>
                                        LLUVIA
                                    </div>
                                    <div style={{ fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: 'bold', color: '#2b2620' }}>
                                        {mon.precipitacion} mm
                                    </div>
                                </div>
                            </div>

                            {mon.alerta_plaga && mon.plaga_probable && (
                                <div style={{
                                    background: '#FCEBEB',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    marginBottom: '8px',
                                    fontSize: 'clamp(11px, 2vw, 12px)',
                                    color: '#D85A30',
                                    fontWeight: 'bold'
                                }}>
                                    ⚠️ Alerta: {mon.plaga_probable}
                                </div>
                            )}

                            <div style={{
                                background: '#fff',
                                padding: 'clamp(10px, 2vw, 12px)',
                                borderRadius: '8px',
                                borderLeft: '4px solid #6b1a2a'
                            }}>
                                <div style={{ fontSize: 'clamp(11px, 2vw, 13px)', fontWeight: 'bold', color: '#6b1a2a', marginBottom: '4px' }}>
                                    💡 Recomendación:
                                </div>
                                <div style={{ fontSize: 'clamp(12px, 2.5vw, 13px)', color: '#2b2620', lineHeight: '1.5' }}>
                                    {usuario?.idioma_preferido === 'nah'
                                        ? mon.recomendacion_texto_nah
                                        : mon.recomendacion_texto_es}
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {/* INFO SOBRE TLAPIANI */}
                <div style={{
                    background: '#f0ebdc',
                    border: '2px solid #b8860b',
                    borderRadius: '12px',
                    padding: 'clamp(16px, 3vw, 20px)',
                    marginTop: 'clamp(20px, 4vw, 24px)'
                }}>
                    <h2 style={{
                        color: '#6b1a2a',
                        fontSize: 'clamp(18px, 4vw, 20px)',
                        marginBottom: '16px'
                    }}>
                        ℹ️ Sobre Tlapiani
                    </h2>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '12px'
                    }}>
                        {[
                            { emoji: '🛰️', titulo: 'Datos Satelitales', desc: 'Usamos satélites NASA para monitorear tu cultivo' },
                            { emoji: '🌤️', titulo: 'Clima en Tiempo Real', desc: 'Temperatura, humedad y lluvia actualizados' },
                            { emoji: '🐛', titulo: 'Alertas de Plagas', desc: 'Te avisamos cuando detectamos riesgo' },
                            { emoji: '🌐', titulo: 'En tu Idioma', desc: 'Náhuatl, Español o Totonaco' }
                        ].map((item, i) => (
                            <div key={i} style={{
                                background: '#fff',
                                padding: '12px',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{item.emoji}</div>
                                <h4 style={{ fontSize: 'clamp(12px, 2.5vw, 14px)', color: '#2b2620', margin: '0 0 4px 0' }}>
                                    {item.titulo}
                                </h4>
                                <p style={{ fontSize: 'clamp(10px, 2vw, 11px)', color: '#666', margin: 0 }}>
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}

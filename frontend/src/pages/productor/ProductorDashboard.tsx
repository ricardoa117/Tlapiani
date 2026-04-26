// src/pages/ProductorDashboard.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface LoteCultivo {
    id: string;
    cultivo: string;
    hectareas: number;
    etapa_fenologica: string;
    monitoreo?: {
        temperatura_max: number;
        temperatura_min: number;
        humedad_relativa: number;
        ndvi: number;
        estado_semaforo: 'verde' | 'amarillo' | 'rojo';
        recomendacion_texto_es: string;
        recomendacion_texto_nah: string;
        alerta_plaga: boolean;
        plaga_probable: string;
        fecha: string;
    };
    recomendacion?: {
        cultivo_sugerido: string;
        compatibilidad_porcentaje: number;
        ganancia_estimada_ha: number;
        razon_tecnica: string;
        rendimiento_ha: string;
        demanda: string;
        ventaja_puebla: string;
    };
}

export default function ProductorDashboard() {
    const navigate = useNavigate();
    const [productor, setProductor] = useState<any>(null);
    const [lotes, setLotes] = useState<LoteCultivo[]>([]);
    const [cargando, setCargando] = useState(true);
    const [mostrarAlertas, setMostrarAlertas] = useState(true);

    useEffect(() => {
        const sesion = localStorage.getItem('tlapiani_sesion');
        if (!sesion) {
            navigate('/login');
            return;
        }

        const datos = JSON.parse(sesion);
        if (datos.rol !== 'productor') {
            navigate('/admin/dashboard');
            return;
        }

        setProductor(datos);
        cargarDatos(datos.id);
    }, [navigate]);

    async function cargarDatos(productorId: string) {
        setCargando(true);

        // Cargar parcelas y lotes con monitoreo y recomendaciones
        const { data: parcelas, error } = await supabase
            .from('parcelas')
            .select(`
        id,
        nombre,
        lotes_cultivo(
          id,
          cultivo,
          hectareas,
          etapa_fenologica,
          monitoreo_lote(
            temperatura_max,
            temperatura_min,
            humedad_relativa,
            ndvi,
            estado_semaforo,
            recomendacion_texto_es,
            recomendacion_texto_nah,
            alerta_plaga,
            plaga_probable,
            fecha
          ),
          recomendaciones_lote(
            cultivo_sugerido,
            compatibilidad_porcentaje,
            ganancia_estimada_ha,
            razon_tecnica,
            rendimiento_ha,
            demanda,
            ventaja_puebla
          )
        )
      `)
            .eq('productor_id', productorId);

        if (error) {
            console.error('Error cargando datos:', error);
        } else if (parcelas && parcelas.length > 0) {
            // Aplanar lotes de todas las parcelas
            const todosLotes: LoteCultivo[] = [];
            parcelas.forEach(parcela => {
                parcela.lotes_cultivo?.forEach((lote: any) => {
                    const monitoreoReciente = lote.monitoreo_lote?.[0];
                    const recomendacion = lote.recomendaciones_lote?.[0];

                    todosLotes.push({
                        id: lote.id,
                        cultivo: lote.cultivo,
                        hectareas: lote.hectareas,
                        etapa_fenologica: lote.etapa_fenologica,
                        monitoreo: monitoreoReciente || undefined,
                        recomendacion: recomendacion || undefined
                    });
                });
            });
            setLotes(todosLotes);
        }

        setCargando(false);
    }

    function cerrarSesion() {
        localStorage.removeItem('tlapiani_sesion');
        navigate('/login');
    }

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
                    <div style={{ fontSize: 'clamp(40px, 8vw, 48px)', marginBottom: '16px' }}>🌾</div>
                    <p style={{ fontSize: 'clamp(14px, 3vw, 16px)' }}>Cargando tus cultivos...</p>
                </div>
            </div>
        );
    }

    const lotesConAlerta = lotes.filter(l => l.monitoreo?.alerta_plaga);
    const lotesEnRiesgo = lotes.filter(l => l.monitoreo?.estado_semaforo === 'rojo');

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
                                {productor?.nombre} • {productor?.folio}
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
                                fontFamily: 'Georgia, serif',
                                fontSize: 'clamp(11px, 2.5vw, 13px)',
                                fontWeight: 'bold'
                            }}
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>

                {/* ALERTAS CRÍTICAS */}
                {(lotesConAlerta.length > 0 || lotesEnRiesgo.length > 0) && mostrarAlertas && (
                    <div style={{
                        background: '#FCEBEB',
                        border: '2px solid #D85A30',
                        borderRadius: '12px',
                        padding: 'clamp(14px, 3vw, 16px)',
                        marginBottom: 'clamp(16px, 3vw, 20px)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <h2 style={{
                                    color: '#D85A30',
                                    fontSize: 'clamp(16px, 4vw, 18px)',
                                    margin: '0 0 8px 0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    🚨 Alertas Activas
                                </h2>
                                <p style={{
                                    color: '#791F1F',
                                    fontSize: 'clamp(12px, 2.5vw, 14px)',
                                    lineHeight: '1.6',
                                    margin: 0
                                }}>
                                    {lotesConAlerta.length > 0 && (
                                        <>{lotesConAlerta.length} cultivo(s) con alerta de plaga. </>
                                    )}
                                    {lotesEnRiesgo.length > 0 && (
                                        <>{lotesEnRiesgo.length} cultivo(s) requieren atención urgente.</>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={() => setMostrarAlertas(false)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#D85A30',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    padding: '4px'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                {/* ESTADÍSTICAS */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 'clamp(10px, 2vw, 12px)',
                    marginBottom: 'clamp(16px, 3vw, 20px)'
                }}>
                    <div style={{
                        background: '#f0ebdc',
                        border: '2px solid #b8860b',
                        borderRadius: '12px',
                        padding: 'clamp(14px, 3vw, 16px)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 'clamp(28px, 6vw, 32px)', fontWeight: 'bold', color: '#6b1a2a', marginBottom: '4px' }}>
                            {lotes.length}
                        </div>
                        <div style={{ fontSize: 'clamp(10px, 2vw, 12px)', color: '#2b2620', textTransform: 'uppercase' }}>
                            Lotes
                        </div>
                    </div>

                    <div style={{
                        background: '#f0ebdc',
                        border: '2px solid #b8860b',
                        borderRadius: '12px',
                        padding: 'clamp(14px, 3vw, 16px)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 'clamp(28px, 6vw, 32px)', fontWeight: 'bold', color: lotesConAlerta.length > 0 ? '#D85A30' : '#1D9E75', marginBottom: '4px' }}>
                            {lotesConAlerta.length}
                        </div>
                        <div style={{ fontSize: 'clamp(10px, 2vw, 12px)', color: '#2b2620', textTransform: 'uppercase' }}>
                            Alertas
                        </div>
                    </div>

                    <div style={{
                        background: '#f0ebdc',
                        border: '2px solid #b8860b',
                        borderRadius: '12px',
                        padding: 'clamp(14px, 3vw, 16px)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 'clamp(28px, 6vw, 32px)', fontWeight: 'bold', color: '#b8860b', marginBottom: '4px' }}>
                            {lotes.reduce((sum, l) => sum + (l.hectareas || 0), 0).toFixed(1)}
                        </div>
                        <div style={{ fontSize: 'clamp(10px, 2vw, 12px)', color: '#2b2620', textTransform: 'uppercase' }}>
                            Hectáreas
                        </div>
                    </div>
                </div>

                {/* LOTES DE CULTIVO */}
                {lotes.length === 0 ? (
                    <div style={{
                        background: '#f0ebdc',
                        border: '2px solid #b8860b',
                        borderRadius: '12px',
                        padding: 'clamp(40px, 8vw, 60px)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 'clamp(40px, 8vw, 48px)', marginBottom: '16px' }}>🌱</div>
                        <p style={{ color: '#2b2620', fontSize: 'clamp(14px, 3vw, 16px)' }}>
                            No tienes lotes registrados aún.
                        </p>
                    </div>
                ) : (
                    lotes.map((lote, index) => (
                        <div
                            key={lote.id}
                            style={{
                                background: '#f0ebdc',
                                border: '2px solid #b8860b',
                                borderRadius: '12px',
                                padding: 'clamp(14px, 3vw, 18px)',
                                marginBottom: 'clamp(14px, 3vw, 16px)',
                                borderLeft: `6px solid ${lote.monitoreo?.estado_semaforo === 'rojo' ? '#D85A30' :
                                        lote.monitoreo?.estado_semaforo === 'amarillo' ? '#BA7517' :
                                            '#1D9E75'
                                    }`
                            }}
                        >
                            {/* Header del lote */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                <div>
                                    <h2 style={{
                                        color: '#2b2620',
                                        fontSize: 'clamp(18px, 4vw, 20px)',
                                        margin: '0 0 4px 0',
                                        textTransform: 'capitalize'
                                    }}>
                                        {lote.cultivo}
                                    </h2>
                                    <p style={{ color: '#666', margin: 0, fontSize: 'clamp(11px, 2vw, 12px)' }}>
                                        {lote.hectareas} ha • {lote.etapa_fenologica}
                                    </p>
                                </div>

                                {lote.monitoreo && (
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 12px',
                                        borderRadius: '16px',
                                        fontSize: 'clamp(10px, 2vw, 12px)',
                                        fontWeight: 'bold',
                                        background:
                                            lote.monitoreo.estado_semaforo === 'rojo' ? '#FCEBEB' :
                                                lote.monitoreo.estado_semaforo === 'amarillo' ? '#FAEEDA' :
                                                    '#E1F5EE',
                                        color:
                                            lote.monitoreo.estado_semaforo === 'rojo' ? '#D85A30' :
                                                lote.monitoreo.estado_semaforo === 'amarillo' ? '#BA7517' :
                                                    '#1D9E75'
                                    }}>
                                        {lote.monitoreo.estado_semaforo === 'rojo' ? '🔴 URGENTE' :
                                            lote.monitoreo.estado_semaforo === 'amarillo' ? '🟡 VIGILAR' :
                                                '🟢 NORMAL'}
                                    </div>
                                )}
                            </div>

                            {/* Métricas del monitoreo */}
                            {lote.monitoreo && (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                    gap: 'clamp(10px, 2vw, 12px)',
                                    marginBottom: '12px'
                                }}>
                                    <div>
                                        <div style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: '#666', marginBottom: '2px' }}>
                                            TEMPERATURA
                                        </div>
                                        <div style={{ fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: 'bold', color: '#2b2620' }}>
                                            {lote.monitoreo.temperatura_max}°C
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: '#666', marginBottom: '2px' }}>
                                            HUMEDAD
                                        </div>
                                        <div style={{ fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: 'bold', color: '#2b2620' }}>
                                            {lote.monitoreo.humedad_relativa}%
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: '#666', marginBottom: '2px' }}>
                                            SALUD PLANTA
                                        </div>
                                        <div style={{ fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: 'bold', color: '#2b2620' }}>
                                            {(lote.monitoreo.ndvi * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Recomendación de acción */}
                            {lote.monitoreo && (
                                <div style={{
                                    background: '#fff',
                                    padding: 'clamp(10px, 2vw, 12px)',
                                    borderRadius: '8px',
                                    borderLeft: '4px solid #6b1a2a',
                                    marginBottom: '12px'
                                }}>
                                    <div style={{ fontSize: 'clamp(11px, 2vw, 13px)', fontWeight: 'bold', color: '#6b1a2a', marginBottom: '4px' }}>
                                        {lote.monitoreo.alerta_plaga ? '⚠️ ACCIÓN REQUERIDA:' : '💡 Recomendación:'}
                                    </div>
                                    <div style={{ fontSize: 'clamp(12px, 2.5vw, 13px)', color: '#2b2620', lineHeight: '1.5' }}>
                                        {productor?.idioma_preferido === 'nah'
                                            ? lote.monitoreo.recomendacion_texto_nah
                                            : lote.monitoreo.recomendacion_texto_es}
                                    </div>
                                    {lote.monitoreo.alerta_plaga && lote.monitoreo.plaga_probable && (
                                        <div style={{
                                            marginTop: '8px',
                                            padding: '8px',
                                            background: '#FCEBEB',
                                            borderRadius: '6px',
                                            fontSize: 'clamp(11px, 2vw, 12px)',
                                            color: '#D85A30',
                                            fontWeight: 'bold'
                                        }}>
                                            🐛 Riesgo detectado: {lote.monitoreo.plaga_probable}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Recomendación económica de cultivo */}
                            {lote.recomendacion && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #E1F5EE 0%, #E8F8F3 100%)',
                                    padding: 'clamp(12px, 3vw, 14px)',
                                    borderRadius: '8px',
                                    border: '2px solid #1D9E75'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'start',
                                        marginBottom: '8px',
                                        flexWrap: 'wrap',
                                        gap: '8px'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: 'clamp(11px, 2vw, 12px)', color: '#085041', fontWeight: 'bold', marginBottom: '4px' }}>
                                                💰 OPORTUNIDAD DE MEJORA
                                            </div>
                                            <div style={{ fontSize: 'clamp(15px, 3.5vw, 17px)', fontWeight: 'bold', color: '#1D9E75' }}>
                                                {lote.recomendacion.cultivo_sugerido}
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
                                            {lote.recomendacion.compatibilidad_porcentaje}% compatible
                                        </div>
                                    </div>

                                    <p style={{
                                        fontSize: 'clamp(11px, 2vw, 12px)',
                                        color: '#085041',
                                        lineHeight: '1.5',
                                        margin: '0 0 10px 0'
                                    }}>
                                        {lote.recomendacion.razon_tecnica}
                                    </p>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                        gap: '10px',
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
                                                {lote.recomendacion.rendimiento_ha}
                                            </div>
                                        </div>

                                        <div style={{
                                            background: 'rgba(255,255,255,0.7)',
                                            padding: '8px',
                                            borderRadius: '6px'
                                        }}>
                                            <div style={{ fontSize: 'clamp(9px, 2vw, 10px)', color: '#085041', marginBottom: '2px' }}>
                                                Ganancia estimada/ha
                                            </div>
                                            <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', fontWeight: 'bold', color: '#1D9E75' }}>
                                                ${(lote.recomendacion.ganancia_estimada_ha || 0).toLocaleString('es-MX')}
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
                                                {lote.recomendacion.demanda}
                                            </div>
                                        </div>
                                    </div>

                                    {lote.recomendacion.ventaja_puebla && (
                                        <div style={{
                                            background: 'rgba(255,255,255,0.7)',
                                            padding: '8px',
                                            borderRadius: '6px',
                                            fontSize: 'clamp(10px, 2vw, 11px)',
                                            color: '#085041'
                                        }}>
                                            <strong>Ventaja en Puebla:</strong> {lote.recomendacion.ventaja_puebla}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Fecha de última actualización */}
                            {lote.monitoreo && (
                                <div style={{
                                    fontSize: 'clamp(9px, 2vw, 10px)',
                                    color: '#999',
                                    marginTop: '8px',
                                    textAlign: 'right'
                                }}>
                                    Última actualización: {new Date(lote.monitoreo.fecha).toLocaleDateString('es-MX')}
                                </div>
                            )}
                        </div>
                    ))
                )}

            </div>
        </div>
    );
}

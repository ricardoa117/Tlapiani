import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface Zona {
    id: string;
    nombre: string;
    municipio_id: number;
    latitud: number;
    longitud: number;
    hectareas: number;
    programa: string;
    organizacion: string;
    descripcion: string;
    actividades: string;
    cultivos_sugeridos: string[];
    apoyo_mensual_estimado: number;
    estado: 'disponible' | 'asignada';
    municipio_nombre?: string;
}

export default function ZonasRestauracion() {
    const [zonas, setZonas] = useState<Zona[]>([]);
    const [cargando, setCargando] = useState(true);
    const [zonaSeleccionada, setZonaSeleccionada] = useState<Zona | null>(null);
    const [mostrarModal, setMostrarModal] = useState(false);
    
    const [formModal, setFormModal] = useState({
        nombre: '',
        telefono: '',
        idioma: 'es' as 'es' | 'nah',
        tipoAcceso: 'smartphone' as 'smartphone' | 'sms' | 'sin_celular',
        cultivosSeleccionados: [] as string[],
    });
    const [mensajeModal, setMensajeModal] = useState('');
    const [enviandoModal, setEnviandoModal] = useState(false);

    useEffect(() => {
        cargarZonas();
    }, []);

    async function cargarZonas() {
        setCargando(true);
        const { data: zonasData, error: errorZonas } = await supabase
            .from('zonas_restauracion')
            .select('*');

        if (errorZonas) {
            console.error('Error cargando zonas:', errorZonas);
            setZonas([]);
        } else if (zonasData && zonasData.length > 0) {
            const municipioIds = [...new Set(zonasData.map(z => z.municipio_id).filter(id => id !== null))];
            let municipiosMap: Record<number, string> = {};
            if (municipioIds.length > 0) {
                const { data: munis } = await supabase
                    .from('municipios')
                    .select('id, nombre')
                    .in('id', municipioIds);
                if (munis) {
                    municipiosMap = munis.reduce((acc, m) => ({ ...acc, [m.id]: m.nombre }), {});
                }
            }
            const zonasConNombre = zonasData.map(z => ({
                ...z,
                municipio_nombre: municipiosMap[z.municipio_id] || 'Municipio no encontrado',
                cultivos_sugeridos: z.cultivos_sugeridos || [],
            })) as Zona[];
            setZonas(zonasConNombre);
        } else {
            setZonas([]);
        }
        setCargando(false);
    }

    async function registrarProductorEnZona() {
        if (!zonaSeleccionada) return;
        if (!formModal.nombre.trim()) {
            setMensajeModal('❌ El nombre es obligatorio');
            return;
        }
        if (formModal.cultivosSeleccionados.length === 0) {
            setMensajeModal('❌ Selecciona al menos un cultivo');
            return;
        }

        setEnviandoModal(true);
        setMensajeModal('');

        try {
            const folio = `TLP-${Date.now().toString(36).toUpperCase()}`;

            const { data: nuevoProd, error: errProd } = await supabase
                .from('productores')
                .insert({
                    folio,
                    nombre: formModal.nombre.trim(),
                    telefono: formModal.telefono || null,
                    municipio_id: zonaSeleccionada.municipio_id,
                    idioma_preferido: formModal.idioma,
                    tipo_acceso: formModal.tipoAcceso,
                    password: 'cambiame123',
                    rol: 'productor',
                    activo: true,
                    registrado_por: 'admin_zona_restauracion',
                })
                .select()
                .single();
            if (errProd) throw errProd;

            const { data: nuevaParcela, error: errParcela } = await supabase
                .from('parcelas')
                .insert({
                    productor_id: nuevoProd.id,
                    nombre: `Zona: ${zonaSeleccionada.nombre}`,
                    latitud: zonaSeleccionada.latitud,
                    longitud: zonaSeleccionada.longitud,
                    municipio_id: zonaSeleccionada.municipio_id,
                    hectareas: zonaSeleccionada.hectareas,
                    zona_id: zonaSeleccionada.id,
                })
                .select()
                .single();
            if (errParcela) throw errParcela;

            const hectareasPorCultivo = zonaSeleccionada.hectareas / formModal.cultivosSeleccionados.length;
            const hoy = new Date().toISOString().split('T')[0];
            const lotesInserts = formModal.cultivosSeleccionados.map(cultivo =>
                supabase.from('lotes_cultivo').insert({
                    parcela_id: nuevaParcela.id,
                    cultivo: cultivo.toLowerCase(),
                    hectareas: Math.round(hectareasPorCultivo * 100) / 100,
                    etapa_fenologica: 'vegetativa',
                    fecha_siembra: hoy,
                })
            );
            await Promise.all(lotesInserts);

            await supabase.from('zonas_restauracion').update({ estado: 'asignada' }).eq('id', zonaSeleccionada.id);

            setMensajeModal(`✅ Productor registrado exitosamente.\n\nFolio: ${folio}\nContraseña temporal: cambiame123`);
            setTimeout(() => {
                setMostrarModal(false);
                setZonaSeleccionada(null);
                setFormModal({ nombre: '', telefono: '', idioma: 'es', tipoAcceso: 'smartphone', cultivosSeleccionados: [] });
                setMensajeModal('');
                cargarZonas();
            }, 4000);
        } catch (err: any) {
            setMensajeModal(`❌ Error: ${err.message}`);
        } finally {
            setEnviandoModal(false);
        }
    }

    if (cargando) {
        return <div style={{ textAlign: 'center', padding: '2rem', color: '#b8860b' }}>Cargando zonas de restauración...</div>;
    }

    return (
        <div>
            <h2 className="admin-section-title">🌳 Zonas de Restauración Forestal</h2>
            
            {zonas.length === 0 ? (
                <div className="admin-empty">
                    <div className="admin-empty-icon">🌲</div>
                    <p>No hay zonas de restauración disponibles.</p>
                </div>
            ) : (
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Programa</th>
                                <th>Hectáreas</th>
                                <th>Apoyo Mensual</th>
                                <th>Estado</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {zonas.map((zona, i) => (
                                <tr key={zona.id} className={i % 2 === 0 ? 'even' : 'odd'}>
                                    <td>{zona.nombre}</td>
                                    <td>{zona.programa}</td>
                                    <td>{zona.hectareas} ha</td>
                                    <td>${zona.apoyo_mensual_estimado?.toLocaleString('es-MX')} MXN</td>
                                    <td>
                                        <span className={`badge ${zona.estado === 'disponible' ? 'activo' : 'inactivo'}`}>
                                            {zona.estado === 'disponible' ? '✓ Disponible' : '✗ Asignada'}
                                        </span>
                                    </td>
                                    <td>
                                        {zona.estado === 'disponible' ? (
                                            <button 
                                                className="btn-toggle activar"
                                                onClick={() => {
                                                    setZonaSeleccionada(zona);
                                                    setMostrarModal(true);
                                                }}
                                            >
                                                Asignar productor
                                            </button>
                                        ) : (
                                            <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Asignada</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de registro */}
            {mostrarModal && zonaSeleccionada && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Registrar Productor</h2>
                        <p className="modal-subtitle">{zonaSeleccionada.nombre}</p>

                        <label>Nombre completo *</label>
                        <input value={formModal.nombre} onChange={e => setFormModal({ ...formModal, nombre: e.target.value })} placeholder="Ej: Juan Pérez" />

                        <label>Teléfono (opcional)</label>
                        <input value={formModal.telefono} onChange={e => setFormModal({ ...formModal, telefono: e.target.value })} placeholder="+52..." />

                        <label>Idioma</label>
                        <div className="btn-group">
                            <button className={formModal.idioma === 'es' ? 'active' : ''} onClick={() => setFormModal({ ...formModal, idioma: 'es' })}>Español</button>
                            <button className={formModal.idioma === 'nah' ? 'active' : ''} onClick={() => setFormModal({ ...formModal, idioma: 'nah' })}>Náhuatl</button>
                        </div>

                        <label>Tipo de celular</label>
                        {(['smartphone', 'sms', 'sin_celular'] as const).map(tipo => (
                            <button
                                key={tipo}
                                className={`btn-tipo ${formModal.tipoAcceso === tipo ? 'active' : ''}`}
                                onClick={() => setFormModal({ ...formModal, tipoAcceso: tipo })}
                            >
                                {tipo === 'smartphone' ? '📱 Smartphone (WhatsApp)' : tipo === 'sms' ? '📞 Solo SMS' : '❌ Sin celular'}
                            </button>
                        ))}

                        <label>Cultivos a sembrar *</label>
                        {zonaSeleccionada.cultivos_sugeridos?.map(cultivo => (
                            <label key={cultivo} className="checkbox-cultivo">
                                <input
                                    type="checkbox"
                                    checked={formModal.cultivosSeleccionados.includes(cultivo)}
                                    onChange={e => {
                                        if (e.target.checked) {
                                            setFormModal({ ...formModal, cultivosSeleccionados: [...formModal.cultivosSeleccionados, cultivo] });
                                        } else {
                                            setFormModal({ ...formModal, cultivosSeleccionados: formModal.cultivosSeleccionados.filter(c => c !== cultivo) });
                                        }
                                    }}
                                />
                                {cultivo}
                            </label>
                        ))}

                        {mensajeModal && <div className="modal-mensaje" style={{ whiteSpace: 'pre-line' }}>{mensajeModal}</div>}

                        <div className="modal-buttons">
                            <button onClick={registrarProductorEnZona} disabled={enviandoModal} className="btn-registrar">
                                {enviandoModal ? 'Registrando...' : 'Registrar'}
                            </button>
                            <button onClick={() => { setMostrarModal(false); setMensajeModal(''); setZonaSeleccionada(null); }} disabled={enviandoModal} className="btn-cancelar">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

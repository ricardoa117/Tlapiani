import { useState } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '../../lib/supabase';
import './ZonasRestauracion.css';
import zonasDataJson from '../../../../backend/data/zonas_restauracion.json';

// Definir el tipo para el JSON importado
interface Zona {
    id: string;
    nombre: string;
    municipio_id: number;
    municipio_nombre: string;
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
}

const datosEstaticos = zonasDataJson as Zona[];

export default function ZonasRestauracion() {
    // Usar el JSON estático como estado inicial
    const [zonas, setZonas] = useState<Zona[]>(datosEstaticos);
    const [zonaSeleccionada, setZonaSeleccionada] = useState<Zona | null>(null);
    const [mostrarPopup, setMostrarPopup] = useState(false);
    const [mostrarModal, setMostrarModal] = useState(false);

    // Vista inicial centrada en Puebla
    const [viewState, setViewState] = useState({
        latitude: 19.0,
        longitude: -97.5,
        zoom: 7,
    });

    const [formModal, setFormModal] = useState({
        nombre: '',
        telefono: '',
        idioma: 'es' as 'es' | 'nah',
        tipoAcceso: 'smartphone' as 'smartphone' | 'sms' | 'sin_celular',
        cultivosSeleccionados: [] as string[],
    });
    
    const [mensajeModal, setMensajeModal] = useState('');
    const [enviandoModal, setEnviandoModal] = useState(false);

    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

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

            // 1. Insertar productor
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

            // 2. Insertar parcela
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

            // 3. Insertar lotes_cultivo
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

            // 4. Actualizar estado local (JSON estático modificado en memoria)
            setZonas(prevZonas => 
                prevZonas.map(z => 
                    z.id === zonaSeleccionada.id ? { ...z, estado: 'asignada' } : z
                )
            );

            // 5. Intentar actualizar Supabase como respaldo (sin detener el flujo si falla)
            const { error: errUpdate } = await supabase
                .from('zonas_restauracion')
                .update({ estado: 'asignada' })
                .eq('id', zonaSeleccionada.id);
            
            if (errUpdate) {
                console.warn('⚠️ No se pudo actualizar zonas_restauracion en Supabase. El estado local se ha actualizado.', errUpdate);
            }

            setMensajeModal(`✅ Productor registrado exitosamente.\n\nFolio: ${folio}\nContraseña: cambiame123`);
            
            setTimeout(() => {
                setMostrarModal(false);
                setMostrarPopup(false);
                setZonaSeleccionada(null);
                setFormModal({ nombre: '', telefono: '', idioma: 'es', tipoAcceso: 'smartphone', cultivosSeleccionados: [] });
                setMensajeModal('');
            }, 3500);
            
        } catch (err: any) {
            setMensajeModal(`❌ Error: ${err.message}`);
        } finally {
            setEnviandoModal(false);
        }
    }

    return (
        <div className="zonas-restauracion-container">
            <h2 className="admin-section-title">🌳 Zonas de Restauración Forestal</h2>
            
            {!mapboxToken ? (
                <div className="admin-empty">
                    <div className="admin-empty-icon">🗺️</div>
                    <p>Error: falta VITE_MAPBOX_TOKEN en variables de entorno.</p>
                </div>
            ) : zonas.length === 0 ? (
                <div className="admin-empty">
                    <div className="admin-empty-icon">🌲</div>
                    <p>No hay zonas de restauración en el archivo JSON.</p>
                </div>
            ) : (
                <>
                    <div className="admin-map-container">
                        <Map 
                            {...viewState} 
                            onMove={(evt: any) => setViewState(evt.viewState)} 
                            mapboxAccessToken={mapboxToken} 
                            style={{ width: '100%', height: '100%' }} 
                            mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                        >
                            {zonas.map(zona => (
                                <Marker key={zona.id} latitude={zona.latitud} longitude={zona.longitud} anchor="bottom">
                                    <div 
                                        className={`marker ${zona.estado}`} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setZonaSeleccionada(zona);
                                            setMostrarPopup(true);
                                        }} 
                                    />
                                </Marker>
                            ))}
                            
                            {mostrarPopup && zonaSeleccionada && (
                                <Popup 
                                    latitude={zonaSeleccionada.latitud} 
                                    longitude={zonaSeleccionada.longitud} 
                                    anchor="top" 
                                    onClose={() => { setMostrarPopup(false); setZonaSeleccionada(null); }} 
                                    closeOnClick={false} 
                                    maxWidth="350px"
                                >
                                    <div className="popup-content">
                                        <h3>{zonaSeleccionada.nombre}</h3>
                                        <p><strong>Programa:</strong> {zonaSeleccionada.programa}</p>
                                        <p><strong>Organización:</strong> {zonaSeleccionada.organizacion}</p>
                                        <p><strong>Hectáreas:</strong> {zonaSeleccionada.hectareas} ha</p>
                                        <p><strong>Apoyo mensual:</strong> ${zonaSeleccionada.apoyo_mensual_estimado?.toLocaleString('es-MX')} MXN</p>
                                        <p><strong>Actividades:</strong> {zonaSeleccionada.actividades}</p>
                                        
                                        <div className="cultivos-sugeridos">
                                            {zonaSeleccionada.cultivos_sugeridos?.map(c => 
                                                <span key={c} className="cultivo-badge">{c}</span>
                                            )}
                                        </div>
                                        
                                        <div className={`estado-badge ${zonaSeleccionada.estado}`}>
                                            {zonaSeleccionada.estado === 'disponible' ? '✓ Disponible' : '✗ Asignada'}
                                        </div>
                                        
                                        {zonaSeleccionada.estado === 'disponible' && (
                                            <button 
                                                className="btn-asignar" 
                                                onClick={() => {
                                                    setFormModal({
                                                        ...formModal,
                                                        cultivosSeleccionados: zonaSeleccionada.cultivos_sugeridos || []
                                                    });
                                                    setMostrarModal(true);
                                                }}
                                            >
                                                Asignar productor aquí
                                            </button>
                                        )}
                                    </div>
                                </Popup>
                            )}
                        </Map>
                    </div>
                    
                    <div className="leyenda">
                        <span>Leyenda:</span>
                        <div className="leyenda-item"><div className="circle verde" /> Disponible</div>
                        <div className="leyenda-item"><div className="circle rojo" /> Asignada</div>
                    </div>
                </>
            )}

            {/* Modal de asignación */}
            {mostrarModal && zonaSeleccionada && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Registrar Productor</h2>
                        <p className="modal-subtitle">{zonaSeleccionada.nombre}</p>

                        <label>Nombre completo *</label>
                        <input 
                            value={formModal.nombre} 
                            onChange={e => setFormModal({ ...formModal, nombre: e.target.value })} 
                            placeholder="Ej: Juan Pérez" 
                        />

                        <label>Teléfono (opcional)</label>
                        <input 
                            value={formModal.telefono} 
                            onChange={e => setFormModal({ ...formModal, telefono: e.target.value })} 
                            placeholder="+52..." 
                        />

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
                            <button 
                                onClick={() => { 
                                    setMostrarModal(false); 
                                    setMensajeModal(''); 
                                    setFormModal({ ...formModal, cultivosSeleccionados: [] }); 
                                }} 
                                disabled={enviandoModal} 
                                className="btn-cancelar"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

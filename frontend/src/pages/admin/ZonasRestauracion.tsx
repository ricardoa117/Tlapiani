import { useState, useEffect } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '../../lib/supabase';
import './ZonasRestauracion.css';
import zonasDataJson from '../../../../backend/data/zonas_restauracion.json';

// Tipo de los datos JSON
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

const zonasEstaticas = zonasDataJson as Zona[];

export default function ZonasRestauracion() {
    const [cargandoAdmin, setCargandoAdmin] = useState(true);
    const [adminMunicipioId, setAdminMunicipioId] = useState<number | null>(null);
    const [zonasFiltradas, setZonasFiltradas] = useState<Zona[]>([]);
    
    const [zonaSeleccionada, setZonaSeleccionada] = useState<Zona | null>(null);
    const [mostrarPopup, setMostrarPopup] = useState(false);
    const [mostrarModal, setMostrarModal] = useState(false);

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

    useEffect(() => {
        async function inicializar() {
            try {
                const raw = localStorage.getItem('usuario');
                if (raw) {
                    const usuario = JSON.parse(raw);
                    if (usuario.id) {
                        const { data, error } = await supabase
                            .from('productores')
                            .select('municipio_id')
                            .eq('id', usuario.id)
                            .single();

                        if (!error && data?.municipio_id) {
                            setAdminMunicipioId(data.municipio_id);
                            // Filtrar por el municipio_id del administrador
                            const filtradas = zonasEstaticas.filter(z => z.municipio_id === data.municipio_id);
                            setZonasFiltradas(filtradas);
                            
                            // Si hay zonas, centrar el mapa en la primera
                            if (filtradas.length > 0) {
                                setViewState({
                                    latitude: filtradas[0].latitud,
                                    longitude: filtradas[0].longitud,
                                    zoom: 10
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Error al obtener datos del admin:", err);
            } finally {
                setCargandoAdmin(false);
            }
        }
        inicializar();
    }, []);

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

        // Simulación visual de guardado (sin Supabase)
        setTimeout(() => {
            const folio = `TLP-${Date.now().toString(36).toUpperCase()}`;
            
            // Actualizar el estado local para cambiar el color a rojo sin recargar la página
            setZonasFiltradas(prevZonas => 
                prevZonas.map(z => 
                    z.id === zonaSeleccionada.id ? { ...z, estado: 'asignada' } : z
                )
            );

            setMensajeModal(`✅ Productor guardado correctamente. Folio: ${folio}`);
            
            setTimeout(() => {
                setMostrarModal(false);
                setMostrarPopup(false);
                setZonaSeleccionada(null);
                setMensajeModal('');
                // NO limpiamos los checkboxes ni el formulario según requerimiento
            }, 1500);

            setEnviandoModal(false);
        }, 800); // Pequeño delay para simular red
    }

    if (cargandoAdmin) {
        return (
            <div className="admin-loading" style={{ padding: '3rem', textAlign: 'center', color: '#b8860b' }}>
                <div className="admin-loading-icon" style={{ fontSize: '2rem', animation: 'spin 1s infinite' }}>⚙️</div>
                <p>Verificando permisos de zona...</p>
            </div>
        );
    }

    if (!adminMunicipioId) {
        return (
            <div className="zonas-restauracion-container">
                <h2 className="admin-section-title">🌳 Zonas de Restauración Forestal</h2>
                <div className="admin-empty" style={{ border: '1px dashed #ef4444' }}>
                    <div className="admin-empty-icon">⚠️</div>
                    <p style={{ color: '#ef4444' }}>No tienes un municipio asignado. Contacta al administrador general.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="zonas-restauracion-container">
            <h2 className="admin-section-title">🌳 Zonas de Restauración Forestal</h2>
            
            {!mapboxToken ? (
                <div className="admin-empty">
                    <div className="admin-empty-icon">🗺️</div>
                    <p>Error: falta VITE_MAPBOX_TOKEN en variables de entorno.</p>
                </div>
            ) : zonasFiltradas.length === 0 ? (
                <div className="admin-empty">
                    <div className="admin-empty-icon">🌲</div>
                    <p>No hay zonas de restauración en tu municipio.</p>
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
                            {zonasFiltradas.map(zona => (
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

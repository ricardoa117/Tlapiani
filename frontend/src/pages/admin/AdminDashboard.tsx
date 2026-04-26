// src/pages/admin/AdminDashboard.tsx
// ============================================================
// TLAPIANI — Panel de Administración (Corregido)
// ============================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './AdminDashboard.css';

// ── Interfaces ──────────────────────────────────────────────
interface Productor {
    id: string;
    folio: string;
    nombre: string;
    telefono: string | null;
    idioma_preferido: 'es' | 'nah' | 'tot';
    tipo_acceso: 'smartphone' | 'sms' | 'sin_celular';
    activo: boolean;
    municipios?: { nombre: string };
    estado_riesgo?: 'bajo' | 'medio' | 'alto';
    alertas_activas?: number;
    cultivos_afectados?: string[];
    ultima_alerta?: string;
}

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
    municipios?: { nombre: string };
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [adminNombre, setAdminNombre] = useState('Administrador');
    const [productores, setProductores] = useState<Productor[]>([]);
    const [productoresFiltrados, setProductoresFiltrados] = useState<Productor[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(true);
    const [adminMunicipioId, setAdminMunicipioId] = useState<number | null>(null);

    // Estadísticas
    const [stats, setStats] = useState({
        total: 0,
        activos: 0,
        inactivos: 0,
        nahuatl: 0,
        en_riesgo_alto: 0,
        con_alertas: 0,
    });

    // Zonas de restauración
    const [zonas, setZonas] = useState<Zona[]>([]);
    const [zonaSeleccionada, setZonaSeleccionada] = useState<Zona | null>(null);
    const [mostrarPopup, setMostrarPopup] = useState(false);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [vistaActual, setVistaActual] = useState<'productores' | 'zonas'>('productores');

    // Viewport del mapa
    const [viewState, setViewState] = useState({
        latitude: 19.0414,
        longitude: -98.2063,
        zoom: 9,
    });

    // Formulario modal
    const [formModal, setFormModal] = useState({
        nombre: '',
        telefono: '',
        idioma: 'es' as 'es' | 'nah',
        tipoAcceso: 'smartphone' as 'smartphone' | 'sms' | 'sin_celular',
        cultivosSeleccionados: [] as string[],
    });
    const [mensajeModal, setMensajeModal] = useState('');
    const [enviandoModal, setEnviandoModal] = useState(false);

    // ── Auth Guard ──────────────────────────────────────────
    useEffect(() => {
        const raw = localStorage.getItem('usuario');
        if (!raw) {
            navigate('/login');
            return;
        }
        try {
            const datos = JSON.parse(raw);
            if (datos.rol !== 'admin') {
                navigate('/productor/dashboard');
                return;
            }
            setAdminNombre(datos.nombre);
            const muniId = datos.municipio_id ? Number(datos.municipio_id) : null;
            setAdminMunicipioId(muniId);
            // Centrar mapa si hay coordenadas del municipio
            if (datos.latitud && datos.longitud) {
                setViewState(prev => ({
                    ...prev,
                    latitude: Number(datos.latitud),
                    longitude: Number(datos.longitud),
                }));
            }
            cargarDatos(muniId);
        } catch {
            navigate('/login');
        }
    }, [navigate]);

    // ── Carga de datos ──────────────────────────────────────
    async function cargarDatos(mId: number | null) {
        setCargando(true);

        // 1. Productores
        let queryProds = supabase
            .from('productores')
            .select(`
                *,
                municipios(nombre),
                parcelas(
                    id,
                    lotes_cultivo(
                        id,
                        cultivo,
                        monitoreo_lote(
                            estado_semaforo,
                            alerta_plaga,
                            plaga_probable,
                            fecha
                        )
                    )
                )
            `)
            .eq('rol', 'productor')
            .order('created_at', { ascending: false });

        if (mId) queryProds = queryProds.eq('municipio_id', mId);

        const { data: prods, error: errorProds } = await queryProds;

        if (!errorProds && prods) {
            const productoresProcesados = prods.map((p: any) => {
                let alertasActivas = 0;
                let lotesEnRiesgo = 0;
                const cultivosAfectados = new Set<string>();
                let ultimaAlerta = '';

                p.parcelas?.forEach((parcela: any) => {
                    parcela.lotes_cultivo?.forEach((lote: any) => {
                        const monitoreoReciente = lote.monitoreo_lote?.[0];
                        if (monitoreoReciente) {
                            if (monitoreoReciente.alerta_plaga) {
                                alertasActivas++;
                                cultivosAfectados.add(lote.cultivo);
                                ultimaAlerta = monitoreoReciente.plaga_probable || 'Alerta activa';
                            }
                            if (monitoreoReciente.estado_semaforo === 'rojo') lotesEnRiesgo++;
                        }
                    });
                });

                let estado_riesgo: 'bajo' | 'medio' | 'alto' = 'bajo';
                if (alertasActivas > 0 || lotesEnRiesgo > 0) {
                    estado_riesgo = lotesEnRiesgo >= 2 ? 'alto' : 'medio';
                }

                return {
                    ...p,
                    estado_riesgo,
                    alertas_activas: alertasActivas,
                    cultivos_afectados: Array.from(cultivosAfectados),
                    ultima_alerta: ultimaAlerta,
                } as Productor;
            });

            setProductores(productoresProcesados);
            setProductoresFiltrados(productoresProcesados);

            const total = productoresProcesados.length;
            const activos = productoresProcesados.filter(p => p.activo).length;
            const inactivos = total - activos;
            const nahuatl = productoresProcesados.filter(p => p.idioma_preferido === 'nah').length;
            const en_riesgo_alto = productoresProcesados.filter(p => p.estado_riesgo === 'alto').length;
            const con_alertas = productoresProcesados.filter(p => (p.alertas_activas || 0) > 0).length;
            setStats({ total, activos, inactivos, nahuatl, en_riesgo_alto, con_alertas });
        }

        // 2. Zonas de restauración (CORREGIDO: LEFT JOIN)
        let queryZonas = supabase
            .from('zonas_restauracion')
            .select('*, municipios!left(nombre)');

        const { data: zonasData, error: errorZonas } = await queryZonas;

        if (errorZonas) {
            console.error('Error cargando zonas:', errorZonas);
            setZonas([]);
        } else if (zonasData && zonasData.length > 0) {
            setZonas(zonasData);
            // Centrar mapa en la primera zona (si hay)
            setViewState({
                latitude: zonasData[0].latitud,
                longitude: zonasData[0].longitud,
                zoom: 9,
            });
        } else {
            console.log('No se encontraron zonas. Verifica que la tabla zonas_restauracion tenga datos y que los municipio_id existan.');
            setZonas([]);
        }

        setCargando(false);
    }

    // ── Filtro por búsqueda ─────────────────────────────────
    useEffect(() => {
        if (!busqueda.trim()) {
            setProductoresFiltrados(productores);
            return;
        }
        const termino = busqueda.toLowerCase();
        setProductoresFiltrados(
            productores.filter(
                p =>
                    p.nombre.toLowerCase().includes(termino) ||
                    p.folio.toLowerCase().includes(termino) ||
                    p.municipios?.nombre.toLowerCase().includes(termino) ||
                    p.cultivos_afectados?.some(c => c.toLowerCase().includes(termino))
            )
        );
    }, [busqueda, productores]);

    async function toggleActivoProductor(id: string, activoActual: boolean) {
        await supabase.from('productores').update({ activo: !activoActual }).eq('id', id);
        cargarDatos(adminMunicipioId);
    }

    function cerrarSesion() {
        localStorage.removeItem('usuario');
        navigate('/login');
    }

    // ── Registro de productor desde zona ────────────────────
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
                    nombre: `${zonaSeleccionada.nombre} – Asignado`,
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
                setMostrarPopup(false);
                setFormModal({ nombre: '', telefono: '', idioma: 'es', tipoAcceso: 'smartphone', cultivosSeleccionados: [] });
                setMensajeModal('');
                cargarDatos(adminMunicipioId);
            }, 3000);
        } catch (err: any) {
            setMensajeModal(`❌ Error: ${err.message}`);
        } finally {
            setEnviandoModal(false);
        }
    }

    // ── Renderizado ─────────────────────────────────────────
    if (cargando) {
        return (
            <div className="admin-loading">
                <div className="admin-loading-icon">🌾</div>
                <p>Cargando panel de administración...</p>
            </div>
        );
    }

    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

    return (
        <div className="admin-wrapper">
            <div className="admin-container">
                {/* Encabezado */}
                <header className="admin-header">
                    <div className="admin-header-left">
                        <div className="admin-logo">T</div>
                        <div>
                            <h1 className="admin-title">TLAPIANI</h1>
                            <p className="admin-subtitle">Panel de Administración</p>
                        </div>
                    </div>
                    <div className="admin-header-right">
                        <span className="admin-user">👤 {adminNombre}</span>
                        <button onClick={cerrarSesion} className="admin-btn-logout">
                            Cerrar sesión
                        </button>
                    </div>
                </header>

                {/* Tabs */}
                <div className="admin-tabs">
                    <button
                        className={`admin-tab ${vistaActual === 'productores' ? 'active' : ''}`}
                        onClick={() => setVistaActual('productores')}
                    >
                        📊 Productores
                    </button>
                    <button
                        className={`admin-tab ${vistaActual === 'zonas' ? 'active' : ''}`}
                        onClick={() => setVistaActual('zonas')}
                    >
                        🌳 Zonas de Restauración
                    </button>
                </div>

                {/* Vista Productores */}
                {vistaActual === 'productores' && (
                    <>
                        <div className="admin-stats-grid">
                            <div className="admin-stat-card">
                                <span className="admin-stat-num">{stats.total}</span>
                                <span>Total</span>
                            </div>
                            <div className="admin-stat-card">
                                <span className="admin-stat-num" style={{ color: '#1D9E75' }}>{stats.activos}</span>
                                <span>Activos</span>
                            </div>
                            <div className="admin-stat-card">
                                <span className="admin-stat-num" style={{ color: '#D85A30' }}>{stats.en_riesgo_alto}</span>
                                <span>🚨 Riesgo Alto</span>
                            </div>
                            <div className="admin-stat-card">
                                <span className="admin-stat-num" style={{ color: '#BA7517' }}>{stats.con_alertas}</span>
                                <span>⚠️ Con Alertas</span>
                            </div>
                            <div className="admin-stat-card">
                                <span className="admin-stat-num" style={{ color: '#b8860b' }}>{stats.nahuatl}</span>
                                <span>Náhuatl</span>
                            </div>
                            <div className="admin-stat-card">
                                <span className="admin-stat-num" style={{ color: '#555' }}>{stats.inactivos}</span>
                                <span>Inactivos</span>
                            </div>
                        </div>

                        <div className="admin-search-bar">
                            <input
                                type="text"
                                placeholder="Buscar por nombre, folio, municipio o cultivo..."
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                className="admin-search-input"
                            />
                            <button onClick={() => cargarDatos(adminMunicipioId)} className="admin-btn-reload">
                                🔄 Recargar
                            </button>
                        </div>

                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Folio</th>
                                        <th>Municipio</th>
                                        <th>Estado Cultivos</th>
                                        <th>Alertas</th>
                                        <th>Idioma</th>
                                        <th>Acceso</th>
                                        <th>Estado</th>
                                        <th>Acción</th>
                                    </td>
                                </thead>
                                <tbody>
                                    {productoresFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="admin-empty-table">
                                                {busqueda ? 'Sin resultados' : 'No hay productores registrados'}
                                            </td>
                                        </tr>
                                    ) : (
                                        productoresFiltrados.map((p, i) => (
                                            <tr key={p.id} className={i % 2 === 0 ? 'even' : 'odd'}>
                                                <td>{p.nombre}</td>
                                                <td className="folio">{p.folio}</td>
                                                <td>{p.municipios?.nombre || '—'}</td>
                                                <td>
                                                    <span className={`badge riesgo-${p.estado_riesgo}`}>
                                                        {p.estado_riesgo === 'alto' ? '🔴 Alto' : p.estado_riesgo === 'medio' ? '🟡 Medio' : '🟢 Normal'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {(p.alertas_activas || 0) > 0 ? (
                                                        <div className="alertas-cell">
                                                            <strong>{p.alertas_activas} {p.alertas_activas === 1 ? 'alerta' : 'alertas'}</strong>
                                                            {p.cultivos_afectados?.join(', ')}
                                                        </div>
                                                    ) : '—'}
                                                </td>
                                                <td>
                                                    <span className={`badge idioma-${p.idioma_preferido}`}>
                                                        {p.idioma_preferido.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="acceso-icon">
                                                    {p.tipo_acceso === 'smartphone' ? '📱' : p.tipo_acceso === 'sms' ? '📞' : '❌'}
                                                </td>
                                                <td>
                                                    <span className={`badge ${p.activo ? 'activo' : 'inactivo'}`}>
                                                        {p.activo ? '✓ Activo' : '✗ Inactivo'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => toggleActivoProductor(p.id, p.activo)}
                                                        className={`btn-toggle ${p.activo ? 'desactivar' : 'activar'}`}
                                                    >
                                                        {p.activo ? 'Desactivar' : 'Activar'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Vista Zonas de Restauración */}
                {vistaActual === 'zonas' && (
                    <>
                        <h2 className="admin-section-title">🌳 Zonas de Restauración Forestal</h2>
                        {!mapboxToken ? (
                            <div className="admin-empty">
                                <div className="admin-empty-icon">🗺️</div>
                                <p>Error: falta la variable de entorno <code>VITE_MAPBOX_TOKEN</code></p>
                            </div>
                        ) : zonas.length === 0 ? (
                            <div className="admin-empty">
                                <div className="admin-empty-icon">🌲</div>
                                <p>No hay zonas de restauración registradas.</p>
                                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                    Verifica que la tabla <code>zonas_restauracion</code> tenga datos y que cada zona tenga un <code>municipio_id</code> válido en la tabla <code>municipios</code>.
                                </p>
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
                                                    onClick={() => {
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
                                                onClose={() => {
                                                    setMostrarPopup(false);
                                                    setZonaSeleccionada(null);
                                                }}
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
                                                        {zonaSeleccionada.cultivos_sugeridos?.map(c => (
                                                            <span key={c} className="cultivo-badge">{c}</span>
                                                        ))}
                                                    </div>
                                                    <div className={`estado-badge ${zonaSeleccionada.estado}`}>
                                                        {zonaSeleccionada.estado === 'disponible' ? '✓ Disponible' : '✗ Asignada'}
                                                    </div>
                                                    {zonaSeleccionada.estado === 'disponible' && (
                                                        <button
                                                            className="btn-asignar"
                                                            onClick={() => setMostrarModal(true)}
                                                        >
                                                            Registrar productor aquí
                                                        </button>
                                                    )}
                                                </div>
                                            </Popup>
                                        )}
                                    </Map>
                                </div>
                                <div className="leyenda">
                                    <span>Leyenda:</span>
                                    <div className="leyenda-item">
                                        <div className="circle verde" /> Disponible
                                    </div>
                                    <div className="leyenda-item">
                                        <div className="circle rojo" /> Asignada
                                    </div>
                                </div>
                            </>
                        )}
                    </>
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

                            {mensajeModal && <div className="modal-mensaje">{mensajeModal}</div>}

                            <div className="modal-buttons">
                                <button onClick={registrarProductorEnZona} disabled={enviandoModal} className="btn-registrar">
                                    {enviandoModal ? 'Registrando...' : 'Registrar'}
                                </button>
                                <button onClick={() => { setMostrarModal(false); setMensajeModal(''); }} disabled={enviandoModal} className="btn-cancelar">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
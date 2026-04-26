// src/pages/admin/AdminDashboard.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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

    const [stats, setStats] = useState({
        total: 0,
        activos: 0,
        inactivos: 0,
        nahuatl: 0,
        en_riesgo_alto: 0,
        con_alertas: 0
    });

    const [zonas, setZonas] = useState<Zona[]>([]);
    const [zonaSeleccionada, setZonaSeleccionada] = useState<Zona | null>(null);
    const [mostrarPopup, setMostrarPopup] = useState(false);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [vistaActual, setVistaActual] = useState<'productores' | 'zonas'>('productores');

    const [viewState, setViewState] = useState({
        latitude: 19.0414,
        longitude: -98.2063,
        zoom: 9
    });

    const [formModal, setFormModal] = useState({
        nombre: '',
        telefono: '',
        idioma: 'es' as 'es' | 'nah',
        tipoAcceso: 'smartphone' as 'smartphone' | 'sms' | 'sin_celular',
        cultivosSeleccionados: [] as string[]
    });
    const [mensajeModal, setMensajeModal] = useState('');
    const [enviandoModal, setEnviandoModal] = useState(false);

    useEffect(() => {
        const usuario = localStorage.getItem('usuario');
        if (!usuario) {
            navigate('/login');
            return;
        }

        const datos = JSON.parse(usuario);
        if (datos.rol !== 'admin') {
            navigate('/productor/dashboard');
            return;
        }

        setAdminNombre(datos.nombre);
        cargarDatos();
    }, [navigate]);

    async function cargarDatos() {
        setCargando(true);

        // Cargar productores con monitoreo
        const { data: prods, error: errorProds } = await supabase
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

        if (!errorProds && prods) {
            const productoresConMonitoreo = prods.map(p => {
                let alertasActivas = 0;
                let lotesEnRiesgo = 0;
                let cultivosAfectados = new Set<string>();
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
                            if (monitoreoReciente.estado_semaforo === 'rojo') {
                                lotesEnRiesgo++;
                            }
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
                    ultima_alerta: ultimaAlerta
                };
            });

            setProductores(productoresConMonitoreo);
            setProductoresFiltrados(productoresConMonitoreo);

            const total = productoresConMonitoreo.length;
            const activos = productoresConMonitoreo.filter(p => p.activo).length;
            const inactivos = total - activos;
            const nahuatl = productoresConMonitoreo.filter(p => p.idioma_preferido === 'nah').length;
            const en_riesgo_alto = productoresConMonitoreo.filter(p => p.estado_riesgo === 'alto').length;
            const con_alertas = productoresConMonitoreo.filter(p => (p.alertas_activas || 0) > 0).length;

            setStats({ total, activos, inactivos, nahuatl, en_riesgo_alto, con_alertas });
        }

        // Cargar zonas
        const { data: zonasData, error: errorZonas } = await supabase
            .from('zonas_restauracion')
            .select('*, municipios(nombre)');

        if (!errorZonas && zonasData && zonasData.length > 0) {
            setZonas(zonasData);
            const primeraZona = zonasData[0];
            setViewState({
                latitude: primeraZona.latitud,
                longitude: primeraZona.longitud,
                zoom: 9
            });
        }

        setCargando(false);
    }

    useEffect(() => {
        if (!busqueda.trim()) {
            setProductoresFiltrados(productores);
            return;
        }

        const termino = busqueda.toLowerCase();
        const filtrados = productores.filter(p =>
            p.nombre.toLowerCase().includes(termino) ||
            p.folio.toLowerCase().includes(termino) ||
            p.municipios?.nombre.toLowerCase().includes(termino) ||
            p.cultivos_afectados?.some(c => c.toLowerCase().includes(termino))
        );
        setProductoresFiltrados(filtrados);
    }, [busqueda, productores]);

    async function toggleActivoProductor(id: string, activoActual: boolean) {
        const { error } = await supabase
            .from('productores')
            .update({ activo: !activoActual })
            .eq('id', id);

        if (error) {
            alert('Error al actualizar el estado del productor');
            return;
        }

        cargarDatos();
    }

    function cerrarSesion() {
        localStorage.removeItem('usuario');
        navigate('/login');
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
            const timestamp = Date.now().toString(36).toUpperCase();
            const folio = `TLP-${timestamp}`;

            const { data: nuevoProductor, error: errorProductor } = await supabase
                .from('productores')
                .insert({
                    folio,
                    nombre: formModal.nombre,
                    telefono: formModal.telefono || null,
                    municipio_id: zonaSeleccionada.municipio_id,
                    idioma_preferido: formModal.idioma,
                    tipo_acceso: formModal.tipoAcceso,
                    password: 'cambiame123',
                    rol: 'productor',
                    activo: true,
                    registrado_por: 'admin_zona_restauracion'
                })
                .select()
                .single();

            if (errorProductor) throw errorProductor;

            const { data: nuevaParcela, error: errorParcela } = await supabase
                .from('parcelas')
                .insert({
                    productor_id: nuevoProductor.id,
                    nombre: `${zonaSeleccionada.nombre} – Asignado`,
                    latitud: zonaSeleccionada.latitud,
                    longitud: zonaSeleccionada.longitud,
                    municipio_id: zonaSeleccionada.municipio_id,
                    hectareas: zonaSeleccionada.hectareas,
                    zona_id: zonaSeleccionada.id
                })
                .select()
                .single();

            if (errorParcela) throw errorParcela;

            const hectareasPorCultivo = zonaSeleccionada.hectareas / formModal.cultivosSeleccionados.length;
            const hoy = new Date().toISOString().split('T')[0];

            const lotesPromises = formModal.cultivosSeleccionados.map(cultivo =>
                supabase.from('lotes_cultivo').insert({
                    parcela_id: nuevaParcela.id,
                    cultivo: cultivo.toLowerCase(),
                    hectareas: Math.round(hectareasPorCultivo * 100) / 100,
                    etapa_fenologica: 'vegetativa',
                    fecha_siembra: hoy
                })
            );

            await Promise.all(lotesPromises);

            await supabase
                .from('zonas_restauracion')
                .update({ estado: 'asignada' })
                .eq('id', zonaSeleccionada.id);

            setMensajeModal(`✅ Productor registrado exitosamente.\n\nFolio: ${folio}\nContraseña: cambiame123`);

            setTimeout(() => {
                setMostrarModal(false);
                setMostrarPopup(false);
                setFormModal({
                    nombre: '',
                    telefono: '',
                    idioma: 'es',
                    tipoAcceso: 'smartphone',
                    cultivosSeleccionados: []
                });
                setMensajeModal('');
                cargarDatos();
            }, 3000);

        } catch (error: any) {
            setMensajeModal(`❌ Error: ${error.message}`);
        } finally {
            setEnviandoModal(false);
        }
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
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌾</div>
                    <p>Cargando panel...</p>
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
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

                {/* ENCABEZADO */}
                <div style={{
                    background: '#f0ebdc',
                    border: '2px solid #b8860b',
                    borderRadius: '12px',
                    padding: 'clamp(16px, 3vw, 20px)',
                    marginBottom: 'clamp(16px, 3vw, 24px)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            background: '#6b1a2a',
                            color: '#f0ebdc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '32px',
                            fontWeight: 'bold',
                            border: '3px solid #b8860b'
                        }}>
                            T
                        </div>
                        <div>
                            <h1 style={{
                                color: '#6b1a2a',
                                fontSize: 'clamp(20px, 4vw, 28px)',
                                margin: '0 0 4px 0'
                            }}>
                                TLAPIANI
                            </h1>
                            <p style={{ color: '#2b2620', margin: 0, fontSize: 'clamp(12px, 2.5vw, 14px)' }}>
                                Panel de Administración
                            </p>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <p style={{ color: '#2b2620', margin: '0 0 8px 0', fontSize: 'clamp(13px, 2vw, 15px)' }}>
                            👤 {adminNombre}
                        </p>
                        <button
                            onClick={cerrarSesion}
                            style={{
                                background: '#6b1a2a',
                                color: '#f0ebdc',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontFamily: 'Georgia, serif',
                                fontSize: 'clamp(12px, 2vw, 13px)',
                                fontWeight: 'bold'
                            }}
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>

                {/* TABS */}
                <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setVistaActual('productores')}
                        style={{
                            padding: '12px 24px',
                            background: vistaActual === 'productores' ? '#6b1a2a' : '#f0ebdc',
                            color: vistaActual === 'productores' ? '#f0ebdc' : '#2b2620',
                            border: vistaActual === 'productores' ? '2px solid #b8860b' : '2px solid transparent',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontFamily: 'Georgia, serif',
                            fontSize: 'clamp(12px, 2vw, 14px)',
                            fontWeight: 'bold'
                        }}
                    >
                        📊 Productores
                    </button>
                    {zonas.length > 0 && (
                        <button
                            onClick={() => setVistaActual('zonas')}
                            style={{
                                padding: '12px 24px',
                                background: vistaActual === 'zonas' ? '#6b1a2a' : '#f0ebdc',
                                color: vistaActual === 'zonas' ? '#f0ebdc' : '#2b2620',
                                border: vistaActual === 'zonas' ? '2px solid #b8860b' : '2px solid transparent',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontFamily: 'Georgia, serif',
                                fontSize: 'clamp(12px, 2vw, 14px)',
                                fontWeight: 'bold'
                            }}
                        >
                            🌳 Zonas
                        </button>
                    )}
                </div>

                {/* VISTA PRODUCTORES */}
                {vistaActual === 'productores' && (
                    <>
                        {/* ESTADÍSTICAS */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: '16px',
                            marginBottom: '24px'
                        }}>
                            {[
                                { valor: stats.total, label: 'Total', color: '#6b1a2a' },
                                { valor: stats.activos, label: 'Activos', color: '#1D9E75' },
                                { valor: stats.en_riesgo_alto, label: '🚨 Riesgo Alto', color: '#D85A30' },
                                { valor: stats.con_alertas, label: '⚠️ Con Alertas', color: '#BA7517' },
                                { valor: stats.nahuatl, label: 'Náhuatl', color: '#b8860b' },
                                { valor: stats.inactivos, label: 'Inactivos', color: '#555' }
                            ].map((stat, i) => (
                                <div key={i} style={{
                                    background: '#f0ebdc',
                                    border: '2px solid #b8860b',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: 'clamp(28px, 5vw, 36px)', fontWeight: 'bold', color: stat.color, marginBottom: '8px' }}>
                                        {stat.valor}
                                    </div>
                                    <div style={{ fontSize: 'clamp(10px, 2vw, 12px)', color: '#2b2620', textTransform: 'uppercase' }}>
                                        {stat.label}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* BÚSQUEDA */}
                        <div style={{
                            background: '#f0ebdc',
                            border: '2px solid #b8860b',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '20px',
                            display: 'flex',
                            gap: '12px',
                            flexWrap: 'wrap'
                        }}>
                            <input
                                type="text"
                                placeholder="Buscar por nombre, folio o municipio..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                style={{
                                    flex: '1 1 300px',
                                    padding: '10px 14px',
                                    border: '1px solid #b8860b',
                                    borderRadius: '6px',
                                    fontFamily: 'Georgia, serif',
                                    fontSize: '14px'
                                }}
                            />
                            <button
                                onClick={cargarDatos}
                                style={{
                                    background: '#6b1a2a',
                                    color: '#f0ebdc',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontFamily: 'Georgia, serif',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                }}
                            >
                                🔄 Recargar
                            </button>
                        </div>

                        {/* TABLA */}
                        <div style={{
                            background: '#f0ebdc',
                            border: '2px solid #b8860b',
                            borderRadius: '12px',
                            overflow: 'hidden'
                        }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    fontSize: 'clamp(11px, 2vw, 14px)'
                                }}>
                                    <thead>
                                        <tr style={{ background: '#6b1a2a', color: '#f0ebdc' }}>
                                            <th style={{ padding: '14px 12px', textAlign: 'left' }}>Nombre</th>
                                            <th style={{ padding: '14px 12px', textAlign: 'left' }}>Folio</th>
                                            <th style={{ padding: '14px 12px', textAlign: 'left' }}>Municipio</th>
                                            <th style={{ padding: '14px 12px', textAlign: 'center' }}>Estado Cultivos</th>
                                            <th style={{ padding: '14px 12px', textAlign: 'center' }}>Alertas</th>
                                            <th style={{ padding: '14px 12px', textAlign: 'center' }}>Idioma</th>
                                            <th style={{ padding: '14px 12px', textAlign: 'center' }}>Estado</th>
                                            <th style={{ padding: '14px 12px', textAlign: 'center' }}>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productoresFiltrados.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                                                    {busqueda ? 'No se encontraron productores' : 'No hay productores registrados'}
                                                </td>
                                            </tr>
                                        ) : (
                                            productoresFiltrados.map((p, index) => (
                                                <tr key={p.id} style={{
                                                    background: index % 2 === 0 ? '#fff' : '#f9f9f9',
                                                    borderBottom: '1px solid #e0e0e0'
                                                }}>
                                                    <td style={{ padding: '12px' }}>{p.nombre}</td>
                                                    <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}>{p.folio}</td>
                                                    <td style={{ padding: '12px' }}>{p.municipios?.nombre || 'N/A'}</td>
                                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                                        <span style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '12px',
                                                            fontSize: '11px',
                                                            fontWeight: 'bold',
                                                            background:
                                                                p.estado_riesgo === 'alto' ? '#FCEBEB' :
                                                                    p.estado_riesgo === 'medio' ? '#FAEEDA' : '#E1F5EE',
                                                            color:
                                                                p.estado_riesgo === 'alto' ? '#D85A30' :
                                                                    p.estado_riesgo === 'medio' ? '#BA7517' : '#1D9E75'
                                                        }}>
                                                            {p.estado_riesgo === 'alto' ? '🔴 Alto' :
                                                                p.estado_riesgo === 'medio' ? '🟡 Vigilar' : '🟢 Normal'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px' }}>
                                                        {(p.alertas_activas || 0) > 0 ? (
                                                            <div>
                                                                <div style={{ fontWeight: 'bold', color: '#D85A30' }}>
                                                                    {p.alertas_activas}
                                                                </div>
                                                                {p.cultivos_afectados && p.cultivos_afectados.length > 0 && (
                                                                    <div style={{ color: '#666', fontSize: '10px' }}>
                                                                        {p.cultivos_afectados.join(', ')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: '#999' }}>Sin alertas</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                                        <span style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '8px',
                                                            fontSize: '10px',
                                                            background: p.idioma_preferido === 'nah' ? '#b8860b' : '#ccc',
                                                            color: p.idioma_preferido === 'nah' ? '#fff' : '#000'
                                                        }}>
                                                            {p.idioma_preferido.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                                        <span style={{
                                                            padding: '5px 10px',
                                                            borderRadius: '10px',
                                                            fontSize: '11px',
                                                            fontWeight: 'bold',
                                                            background: p.activo ? '#E1F5EE' : '#FCEBEB',
                                                            color: p.activo ? '#1D9E75' : '#D85A30'
                                                        }}>
                                                            {p.activo ? '✓' : '✗'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => toggleActivoProductor(p.id, p.activo)}
                                                            style={{
                                                                background: p.activo ? '#D85A30' : '#1D9E75',
                                                                color: '#fff',
                                                                border: 'none',
                                                                padding: '6px 12px',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer',
                                                                fontSize: '11px'
                                                            }}
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
                        </div>
                    </>
                )}

                {/* VISTA ZONAS */}
                {vistaActual === 'zonas' && zonas.length > 0 && (
                    <>
                        <h2 style={{ color: '#f0ebdc', marginBottom: '16px' }}>🌳 Zonas de Restauración</h2>

                        <div style={{
                            background: '#f0ebdc',
                            border: '3px solid #b8860b',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            marginBottom: '20px',
                            height: 'clamp(400px, 60vh, 600px)'
                        }}>
                            <Map
                                {...viewState}
                                onMove={evt => setViewState(evt.viewState)}
                                mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                                style={{ width: '100%', height: '100%' }}
                                mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                            >
                                {zonas.map(zona => (
                                    <Marker
                                        key={zona.id}
                                        latitude={zona.latitud}
                                        longitude={zona.longitud}
                                        anchor="bottom"
                                    >
                                        <div
                                            onClick={() => {
                                                setZonaSeleccionada(zona);
                                                setMostrarPopup(true);
                                            }}
                                            style={{
                                                width: '30px',
                                                height: '30px',
                                                borderRadius: '50%',
                                                background: zona.estado === 'disponible' ? '#22c55e' : '#ef4444',
                                                border: '3px solid white',
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                                            }}
                                        />
                                    </Marker>
                                ))}

                                {mostrarPopup && zonaSeleccionada && (
                                    <Popup
                                        latitude={zonaSeleccionada.latitud}
                                        longitude={zonaSeleccionada.longitud}
                                        onClose={() => {
                                            setMostrarPopup(false);
                                            setZonaSeleccionada(null);
                                        }}
                                        closeOnClick={false}
                                        maxWidth="350px"
                                    >
                                        <div style={{ padding: '12px', fontFamily: 'Georgia, serif' }}>
                                            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{zonaSeleccionada.nombre}</h3>
                                            <p style={{ margin: '4px 0', fontSize: '13px' }}>
                                                <strong>Programa:</strong> {zonaSeleccionada.programa}
                                            </p>
                                            <p style={{ margin: '4px 0', fontSize: '13px' }}>
                                                <strong>Hectáreas:</strong> {zonaSeleccionada.hectareas} ha
                                            </p>
                                            <p style={{ margin: '4px 0', fontSize: '13px' }}>
                                                <strong>Apoyo:</strong> ${zonaSeleccionada.apoyo_mensual_estimado?.toLocaleString()} MXN/mes
                                            </p>
                                            <p style={{ margin: '8px 0 4px 0', fontSize: '12px' }}>
                                                <strong>Cultivos:</strong>
                                            </p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                                                {zonaSeleccionada.cultivos_sugeridos?.map((c, i) => (
                                                    <span key={i} style={{
                                                        background: '#1D9E75',
                                                        color: 'white',
                                                        padding: '3px 8px',
                                                        borderRadius: '10px',
                                                        fontSize: '11px'
                                                    }}>
                                                        {c}
                                                    </span>
                                                ))}
                                            </div>
                                            {zonaSeleccionada.estado === 'disponible' && (
                                                <button
                                                    onClick={() => setMostrarModal(true)}
                                                    style={{
                                                        width: '100%',
                                                        background: '#6b1a2a',
                                                        color: '#f0ebdc',
                                                        border: 'none',
                                                        padding: '10px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '13px',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    Registrar productor
                                                </button>
                                            )}
                                        </div>
                                    </Popup>
                                )}
                            </Map>
                        </div>
                    </>
                )}

                {/* MODAL */}
                {mostrarModal && zonaSeleccionada && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000,
                        padding: '20px'
                    }}>
                        <div style={{
                            background: '#2d1a0a',
                            border: '3px solid #b8860b',
                            borderRadius: '16px',
                            padding: '30px',
                            maxWidth: '500px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflowY: 'auto'
                        }}>
                            <h2 style={{ color: '#f0ebdc', marginBottom: '20px' }}>Registrar Productor</h2>

                            <input
                                type="text"
                                placeholder="Nombre completo *"
                                value={formModal.nombre}
                                onChange={(e) => setFormModal({ ...formModal, nombre: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    marginBottom: '16px',
                                    borderRadius: '6px',
                                    border: '1px solid #b8860b',
                                    background: '#f0ebdc',
                                    fontSize: '14px',
                                    boxSizing: 'border-box'
                                }}
                            />

                            <input
                                type="tel"
                                placeholder="Teléfono +52..."
                                value={formModal.telefono}
                                onChange={(e) => setFormModal({ ...formModal, telefono: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    marginBottom: '16px',
                                    borderRadius: '6px',
                                    border: '1px solid #b8860b',
                                    background: '#f0ebdc',
                                    fontSize: '14px',
                                    boxSizing: 'border-box'
                                }}
                            />

                            <div style={{ marginBottom: '16px' }}>
                                <p style={{ color: '#f0ebdc', marginBottom: '8px', fontSize: '14px' }}>Idioma:</p>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {(['es', 'nah'] as const).map(idioma => (
                                        <button
                                            key={idioma}
                                            onClick={() => setFormModal({ ...formModal, idioma })}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                background: formModal.idioma === idioma ? '#6b1a2a' : '#f0ebdc',
                                                color: formModal.idioma === idioma ? '#f0ebdc' : '#2b2620',
                                                border: '2px solid ' + (formModal.idioma === idioma ? '#b8860b' : 'transparent'),
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
                                        >
                                            {idioma === 'es' ? 'Español' : 'Náhuatl'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <p style={{ color: '#f0ebdc', marginBottom: '8px', fontSize: '14px' }}>Cultivos *:</p>
                                {zonaSeleccionada.cultivos_sugeridos?.map((cultivo, i) => (
                                    <label
                                        key={i}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '10px',
                                            marginBottom: '8px',
                                            background: formModal.cultivosSeleccionados.includes(cultivo) ? '#6b1a2a' : '#f0ebdc',
                                            color: formModal.cultivosSeleccionados.includes(cultivo) ? '#f0ebdc' : '#2b2620',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            border: '2px solid ' + (formModal.cultivosSeleccionados.includes(cultivo) ? '#b8860b' : 'transparent')
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formModal.cultivosSeleccionados.includes(cultivo)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setFormModal({
                                                        ...formModal,
                                                        cultivosSeleccionados: [...formModal.cultivosSeleccionados, cultivo]
                                                    });
                                                } else {
                                                    setFormModal({
                                                        ...formModal,
                                                        cultivosSeleccionados: formModal.cultivosSeleccionados.filter(c => c !== cultivo)
                                                    });
                                                }
                                            }}
                                            style={{ marginRight: '10px' }}
                                        />
                                        {cultivo}
                                    </label>
                                ))}
                            </div>

                            {mensajeModal && (
                                <div style={{
                                    background: mensajeModal.includes('✅') ? '#E1F5EE' : '#FCEBEB',
                                    color: mensajeModal.includes('✅') ? '#085041' : '#791F1F',
                                    padding: '12px',
                                    borderRadius: '6px',
                                    marginBottom: '16px',
                                    fontSize: '13px',
                                    whiteSpace: 'pre-line'
                                }}>
                                    {mensajeModal}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={registrarProductorEnZona}
                                    disabled={enviandoModal}
                                    style={{
                                        flex: 1,
                                        background: '#1D9E75',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '12px',
                                        borderRadius: '6px',
                                        cursor: enviandoModal ? 'not-allowed' : 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        opacity: enviandoModal ? 0.6 : 1
                                    }}
                                >
                                    {enviandoModal ? 'Registrando...' : 'Registrar'}
                                </button>
                                <button
                                    onClick={() => {
                                        setMostrarModal(false);
                                        setMensajeModal('');
                                        setFormModal({
                                            nombre: '',
                                            telefono: '',
                                            idioma: 'es',
                                            tipoAcceso: 'smartphone',
                                            cultivosSeleccionados: []
                                        });
                                    }}
                                    disabled={enviandoModal}
                                    style={{
                                        flex: 1,
                                        background: '#6b1a2a',
                                        color: '#f0ebdc',
                                        border: 'none',
                                        padding: '12px',
                                        borderRadius: '6px',
                                        cursor: enviandoModal ? 'not-allowed' : 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        opacity: enviandoModal ? 0.6 : 1
                                    }}
                                >
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

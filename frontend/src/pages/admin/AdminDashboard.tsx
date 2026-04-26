// src/pages/admin/AdminDashboard.tsx
// ============================================================
// TLAPIANI — Panel de Administración
// ============================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
// @ts-ignore
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
    // Datos de monitoreo
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
        con_alertas: 0
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
        zoom: 9
    });

    // Formulario modal
    const [formModal, setFormModal] = useState({
        nombre: '',
        telefono: '',
        idioma: 'es' as 'es' | 'nah',
        tipoAcceso: 'smartphone' as 'smartphone' | 'sms' | 'sin_celular',
        cultivosSeleccionados: [] as string[]
    });
    const [mensajeModal, setMensajeModal] = useState('');
    const [enviandoModal, setEnviandoModal] = useState(false);

    // Verificar sesión — BUG FIX: usar clave 'usuario' (la que usa Login.tsx)
    useEffect(() => {
        const sesion = localStorage.getItem('usuario');
        if (!sesion) {
            navigate('/login');
            return;
        }

        const datos = JSON.parse(sesion);
        // BUG FIX: redirigir no-admin a /productor/dashboard
        if (datos.rol !== 'admin') {
            navigate('/productor/dashboard');
            return;
        }

        setAdminNombre(datos.nombre);
        setAdminMunicipioId(datos.municipio_id || null);
    }, [navigate]);

    useEffect(() => {
        if (!cargando && adminNombre === 'Administrador' && !adminMunicipioId) return; // Wait for session
        cargarDatos();
    }, [adminMunicipioId]);

    async function cargarDatos() {
        setCargando(true);

        // 1. Cargar productores con sus parcelas y monitoreo
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

        if (adminMunicipioId) {
            queryProds.eq('municipio_id', adminMunicipioId);
        }

        const { data: prods, error: errorProds } = await queryProds;

        if (errorProds) {
            console.error('Error cargando productores:', errorProds);
        } else {
            // Procesar datos de monitoreo
            const productoresConMonitoreo = (prods || []).map(p => {
                let alertasActivas = 0;
                let lotesEnRiesgo = 0;
                let cultivosAfectados = new Set<string>();
                let ultimaAlerta = '';

                // Analizar todas las parcelas y lotes
                p.parcelas?.forEach((parcela: any) => {
                    parcela.lotes_cultivo?.forEach((lote: any) => {
                        // Obtener el monitoreo más reciente
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

                // Determinar estado de riesgo general
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

            // Calcular estadísticas
            const total = productoresConMonitoreo.length;
            const activos = productoresConMonitoreo.filter(p => p.activo).length;
            const inactivos = total - activos;
            const nahuatl = productoresConMonitoreo.filter(p => p.idioma_preferido === 'nah').length;
            const en_riesgo_alto = productoresConMonitoreo.filter(p => p.estado_riesgo === 'alto').length;
            const con_alertas = productoresConMonitoreo.filter(p => (p.alertas_activas || 0) > 0).length;

            setStats({ total, activos, inactivos, nahuatl, en_riesgo_alto, con_alertas });
        }

        // 2. Cargar zonas de restauración
        let queryZonas = supabase
            .from('zonas_restauracion')
            .select('*, municipios(nombre)');
            
        if (adminMunicipioId) {
            queryZonas = queryZonas.eq('municipio_id', adminMunicipioId);
        }

        const { data: zonasData, error: errorZonas } = await queryZonas;

        if (!errorZonas && zonasData && zonasData.length > 0) {
            setZonas(zonasData);

            // Centrar mapa en la primera zona disponible
            const primeraZona = zonasData[0];
            setViewState({
                latitude: primeraZona.latitud,
                longitude: primeraZona.longitud,
                zoom: 9
            });
        }

        setCargando(false);
    }

    // Filtrar productores por búsqueda
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
            console.error('Error actualizando productor:', error);
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

        // Validación
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
            // 1. Generar folio
            const timestamp = Date.now().toString(36).toUpperCase();
            const folio = `TLP-${timestamp}`;

            // 2. Crear productor
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

            // 3. Crear parcela
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

            // 4. Crear lotes de cultivo
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

            // 5. Actualizar zona a asignada
            await supabase
                .from('zonas_restauracion')
                .update({ estado: 'asignada' })
                .eq('id', zonaSeleccionada.id);

            setMensajeModal(`✅ Productor registrado exitosamente.\n\nFolio: ${folio}\nContraseña temporal: cambiame123\n\nEl productor ya puede iniciar sesión y comenzará a recibir monitoreo satelital automático.`);

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
            }, 4000);

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
                color: '#f0ebdc'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌾</div>
                    <p>Cargando panel de administración...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            background: 'linear-gradient(135deg, #2d1a0a 0%, #1a0a05 100%)',
            minHeight: '100vh',
            padding: '20px',
            fontFamily: 'Georgia, serif'
        }}>
            <style>
                {`
                    .admin-table-container { overflow-x: auto; }
                    .admin-map-container { height: clamp(400px, 60vh, 600px); }
                    @media (max-width: 768px) {
                        .admin-map-container { height: 250px !important; }
                    }
                `}
            </style>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

                {/* ========== ENCABEZADO ========== */}
                <div style={{
                    background: '#f0ebdc',
                    border: '2px solid #b8860b',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '24px',
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
                                margin: '0 0 4px 0',
                                letterSpacing: '1px'
                            }}>
                                TLAPIANI
                            </h1>
                            <p style={{ color: '#2b2620', margin: 0, fontSize: 'clamp(12px, 2vw, 14px)' }}>
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

                {/* ========== TABS ========== */}
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
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                        }}
                    >
                        📊 Productores
                    </button>
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
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                        }}
                    >
                        🌳 Zonas de Restauración
                    </button>
                </div>

                {/* ========== VISTA PRODUCTORES ========== */}
                {vistaActual === 'productores' && (
                    <>
                        {/* ESTADÍSTICAS */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '16px',
                            marginBottom: '24px'
                        }}>
                            <div style={{
                                background: '#f0ebdc',
                                border: '2px solid #b8860b',
                                borderRadius: '12px',
                                padding: '20px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: 'clamp(28px, 5vw, 36px)', fontWeight: 'bold', color: '#6b1a2a', marginBottom: '8px' }}>
                                    {stats.total}
                                </div>
                                <div style={{ fontSize: 'clamp(11px, 2vw, 13px)', color: '#2b2620', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Total Productores
                                </div>
                            </div>

                            <div style={{
                                background: '#f0ebdc',
                                border: '2px solid #b8860b',
                                borderRadius: '12px',
                                padding: '20px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: 'clamp(28px, 5vw, 36px)', fontWeight: 'bold', color: '#1D9E75', marginBottom: '8px' }}>
                                    {stats.activos}
                                </div>
                                <div style={{ fontSize: 'clamp(11px, 2vw, 13px)', color: '#2b2620', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Activos
                                </div>
                            </div>

                            <div style={{
                                background: '#f0ebdc',
                                border: '2px solid #b8860b',
                                borderRadius: '12px',
                                padding: '20px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: 'clamp(28px, 5vw, 36px)', fontWeight: 'bold', color: '#D85A30', marginBottom: '8px' }}>
                                    {stats.en_riesgo_alto}
                                </div>
                                <div style={{ fontSize: 'clamp(11px, 2vw, 13px)', color: '#2b2620', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    🚨 En Riesgo Alto
                                </div>
                            </div>

                            <div style={{
                                background: '#f0ebdc',
                                border: '2px solid #b8860b',
                                borderRadius: '12px',
                                padding: '20px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: 'clamp(28px, 5vw, 36px)', fontWeight: 'bold', color: '#BA7517', marginBottom: '8px' }}>
                                    {stats.con_alertas}
                                </div>
                                <div style={{ fontSize: 'clamp(11px, 2vw, 13px)', color: '#2b2620', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    ⚠️ Con Alertas
                                </div>
                            </div>

                            <div style={{
                                background: '#f0ebdc',
                                border: '2px solid #b8860b',
                                borderRadius: '12px',
                                padding: '20px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: 'clamp(28px, 5vw, 36px)', fontWeight: 'bold', color: '#b8860b', marginBottom: '8px' }}>
                                    {stats.nahuatl}
                                </div>
                                <div style={{ fontSize: 'clamp(11px, 2vw, 13px)', color: '#2b2620', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    En Náhuatl
                                </div>
                            </div>

                            <div style={{
                                background: '#f0ebdc',
                                border: '2px solid #b8860b',
                                borderRadius: '12px',
                                padding: '20px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: 'clamp(28px, 5vw, 36px)', fontWeight: 'bold', color: '#555', marginBottom: '8px' }}>
                                    {stats.inactivos}
                                </div>
                                <div style={{ fontSize: 'clamp(11px, 2vw, 13px)', color: '#2b2620', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Inactivos
                                </div>
                            </div>
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
                            alignItems: 'center',
                            flexWrap: 'wrap'
                        }}>
                            <input
                                type="text"
                                placeholder="Buscar por nombre, folio, municipio o cultivo..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                style={{
                                    flex: '1 1 300px',
                                    padding: '10px 14px',
                                    border: '1px solid #b8860b',
                                    borderRadius: '6px',
                                    fontFamily: 'Georgia, serif',
                                    fontSize: 'clamp(12px, 2vw, 14px)'
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
                                    fontSize: 'clamp(12px, 2vw, 14px)',
                                    fontWeight: 'bold'
                                }}
                            >
                                🔄 Recargar
                            </button>
                        </div>

                        {/* TABLA DE PRODUCTORES */}
                        <div className="admin-table-container" style={{
                            background: '#f0ebdc',
                            border: '2px solid #b8860b',
                            borderRadius: '12px',
                        }}>
                            <div style={{ minWidth: '800px' }}>
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    fontSize: 'clamp(12px, 2vw, 14px)'
                                }}>
                                    <thead>
                                        <tr style={{ background: '#6b1a2a', color: '#f0ebdc' }}>
                                            <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Nombre</th>
                                            <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Folio</th>
                                            <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Municipio</th>
                                            <th style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Estado Cultivos</th>
                                            <th style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Alertas</th>
                                            <th style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Idioma</th>
                                            <th style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Acceso</th>
                                            <th style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Estado</th>
                                            <th style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productoresFiltrados.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                                                    {busqueda ? 'No se encontraron productores con ese criterio' : 'No hay productores registrados'}
                                                </td>
                                            </tr>
                                        ) : (
                                            productoresFiltrados.map((p, index) => (
                                                <tr key={p.id} style={{
                                                    background: index % 2 === 0 ? '#fff' : '#f9f9f9',
                                                    borderBottom: '1px solid #e0e0e0'
                                                }}>
                                                    <td style={{ padding: '12px', color: '#2b2620' }}>{p.nombre}</td>
                                                    <td style={{ padding: '12px', color: '#6b1a2a', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '12px' }}>
                                                        {p.folio}
                                                    </td>
                                                    <td style={{ padding: '12px', color: '#2b2620' }}>
                                                        {p.municipios?.nombre || 'Sin municipio'}
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                                        <div style={{
                                                            display: 'inline-block',
                                                            padding: '6px 12px',
                                                            borderRadius: '12px',
                                                            fontSize: '11px',
                                                            fontWeight: 'bold',
                                                            background:
                                                                p.estado_riesgo === 'alto' ? '#FCEBEB' :
                                                                    p.estado_riesgo === 'medio' ? '#FAEEDA' :
                                                                        '#E1F5EE',
                                                            color:
                                                                p.estado_riesgo === 'alto' ? '#D85A30' :
                                                                    p.estado_riesgo === 'medio' ? '#BA7517' :
                                                                        '#1D9E75'
                                                        }}>
                                                            {p.estado_riesgo === 'alto' ? '🔴 Riesgo Alto' :
                                                                p.estado_riesgo === 'medio' ? '🟡 Vigilar' :
                                                                    '🟢 Normal'}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                                        {(p.alertas_activas || 0) > 0 ? (
                                                            <div style={{ fontSize: '11px' }}>
                                                                <div style={{ fontWeight: 'bold', color: '#D85A30', marginBottom: '2px' }}>
                                                                    {p.alertas_activas} {p.alertas_activas === 1 ? 'alerta' : 'alertas'}
                                                                </div>
                                                                {p.cultivos_afectados && p.cultivos_afectados.length > 0 && (
                                                                    <div style={{ color: '#666' }}>
                                                                        {p.cultivos_afectados.join(', ')}
                                                                    </div>
                                                                )}
                                                                {p.ultima_alerta && (
                                                                    <div style={{ color: '#999', fontSize: '10px', marginTop: '2px' }}>
                                                                        {p.ultima_alerta}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: '#999', fontSize: '11px' }}>Sin alertas</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            padding: '4px 10px',
                                                            borderRadius: '12px',
                                                            fontSize: '11px',
                                                            fontWeight: 'bold',
                                                            background: p.idioma_preferido === 'nah' ? '#b8860b' : '#ccc',
                                                            color: p.idioma_preferido === 'nah' ? '#fff' : '#000'
                                                        }}>
                                                            {p.idioma_preferido === 'es' ? 'ES' : p.idioma_preferido === 'nah' ? 'NAH' : 'TOT'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '18px' }}>
                                                        {p.tipo_acceso === 'smartphone' ? '📱' :
                                                            p.tipo_acceso === 'sms' ? '📞' : '❌'}
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            padding: '5px 12px',
                                                            borderRadius: '12px',
                                                            fontSize: '11px',
                                                            fontWeight: 'bold',
                                                            background: p.activo ? '#E1F5EE' : '#FCEBEB',
                                                            color: p.activo ? '#1D9E75' : '#D85A30'
                                                        }}>
                                                            {p.activo ? '✓ Activo' : '✗ Inactivo'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => toggleActivoProductor(p.id, p.activo)}
                                                            style={{
                                                                background: p.activo ? '#D85A30' : '#1D9E75',
                                                                color: '#fff',
                                                                border: 'none',
                                                                padding: '6px 14px',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer',
                                                                fontSize: '11px',
                                                                fontWeight: 'bold',
                                                                whiteSpace: 'nowrap'
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

                {/* ========== VISTA ZONAS DE RESTAURACIÓN ========== */}
                {vistaActual === 'zonas' && (
                    <>
                        <h2 style={{ color: '#f0ebdc', fontSize: 'clamp(20px, 4vw, 24px)', marginBottom: '16px' }}>
                            🌳 Zonas de Restauración Forestal
                        </h2>

                        {zonas.length === 0 ? (
                            <div style={{
                                background: '#f0ebdc',
                                border: '2px solid #b8860b',
                                borderRadius: '12px',
                                padding: '60px 20px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌲</div>
                                <p style={{ color: '#2b2620', fontSize: 'clamp(14px, 2vw, 16px)', marginBottom: '12px' }}>
                                    No hay zonas de restauración disponibles.
                                </p>
                                <p style={{ color: '#666', fontSize: 'clamp(12px, 2vw, 14px)' }}>
                                    Para agregar zonas, ejecuta el script seed_zonas_restauracion.sql en Supabase.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* MAPA */}
                                <div className="admin-map-container" style={{
                                    background: '#f0ebdc',
                                    border: '3px solid #b8860b',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    marginBottom: '20px',
                                }}>
                                    <Map
                                        {...viewState}
                                        onMove={(evt: any) => setViewState(evt.viewState)}
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
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                                        transition: 'transform 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
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
                                                <div style={{ padding: '12px', fontFamily: 'Georgia, serif' }}>
                                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#2b2620' }}>
                                                        {zonaSeleccionada.nombre}
                                                    </h3>
                                                    <p style={{ margin: '4px 0', fontSize: '13px', color: '#555' }}>
                                                        <strong>Programa:</strong> {zonaSeleccionada.programa}
                                                    </p>
                                                    <p style={{ margin: '4px 0', fontSize: '13px', color: '#555' }}>
                                                        <strong>Organización:</strong> {zonaSeleccionada.organizacion}
                                                    </p>
                                                    <p style={{ margin: '4px 0', fontSize: '13px', color: '#555' }}>
                                                        <strong>Hectáreas:</strong> {zonaSeleccionada.hectareas} ha
                                                    </p>
                                                    <p style={{ margin: '4px 0', fontSize: '13px', color: '#555' }}>
                                                        <strong>Apoyo mensual:</strong> ${zonaSeleccionada.apoyo_mensual_estimado?.toLocaleString('es-MX')} MXN
                                                    </p>
                                                    <p style={{ margin: '8px 0 4px 0', fontSize: '13px', color: '#555' }}>
                                                        <strong>Actividades:</strong>
                                                    </p>
                                                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
                                                        {zonaSeleccionada.actividades}
                                                    </p>
                                                    <p style={{ margin: '8px 0 4px 0', fontSize: '13px', color: '#555' }}>
                                                        <strong>Cultivos sugeridos:</strong>
                                                    </p>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                                                        {zonaSeleccionada.cultivos_sugeridos?.map((c, i) => (
                                                            <span key={i} style={{
                                                                display: 'inline-block',
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
                                                    <div style={{
                                                        padding: '8px',
                                                        background: zonaSeleccionada.estado === 'disponible' ? '#E1F5EE' : '#FCEBEB',
                                                        borderRadius: '6px',
                                                        marginBottom: '8px'
                                                    }}>
                                                        <p style={{
                                                            margin: 0,
                                                            fontSize: '12px',
                                                            fontWeight: 'bold',
                                                            color: zonaSeleccionada.estado === 'disponible' ? '#1D9E75' : '#D85A30'
                                                        }}>
                                                            {zonaSeleccionada.estado === 'disponible' ? '✓ Disponible' : '✗ Ya asignada'}
                                                        </p>
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
                                                                fontFamily: 'Georgia, serif',
                                                                fontSize: '13px',
                                                                fontWeight: 'bold'
                                                            }}
                                                        >
                                                            Registrar productor aquí
                                                        </button>
                                                    )}
                                                </div>
                                            </Popup>
                                        )}
                                    </Map>
                                </div>

                                {/* LEYENDA */}
                                <div style={{
                                    background: '#f0ebdc',
                                    border: '2px solid #b8860b',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '24px',
                                    alignItems: 'center',
                                    fontSize: 'clamp(12px, 2vw, 14px)'
                                }}>
                                    <span style={{ fontWeight: 'bold', color: '#2b2620' }}>Leyenda:</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            background: '#22c55e',
                                            border: '2px solid white'
                                        }} />
                                        <span>Disponible</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            background: '#ef4444',
                                            border: '2px solid white'
                                        }} />
                                        <span>Asignada</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* ========== MODAL DE REGISTRO ========== */}
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
                        padding: '20px',
                        overflowY: 'auto'
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #2d1a0a 0%, #1a0a05 100%)',
                            border: '3px solid #b8860b',
                            borderRadius: '16px',
                            padding: 'clamp(20px, 4vw, 30px)',
                            maxWidth: '500px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflowY: 'auto'
                        }}>
                            <h2 style={{
                                color: '#f0ebdc',
                                fontSize: 'clamp(18px, 4vw, 22px)',
                                marginBottom: '8px',
                                fontFamily: 'Georgia, serif'
                            }}>
                                Registrar Productor
                            </h2>
                            <p style={{ color: '#b8860b', marginBottom: '20px', fontSize: 'clamp(12px, 2vw, 14px)' }}>
                                {zonaSeleccionada.nombre}
                            </p>

                            {/* Nombre */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{
                                    display: 'block',
                                    color: '#f0ebdc',
                                    marginBottom: '6px',
                                    fontSize: 'clamp(12px, 2vw, 14px)',
                                    fontWeight: 'bold'
                                }}>
                                    Nombre completo *
                                </label>
                                <input
                                    type="text"
                                    value={formModal.nombre}
                                    onChange={(e) => setFormModal({ ...formModal, nombre: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        border: '1px solid #b8860b',
                                        background: '#f0ebdc',
                                        fontFamily: 'Georgia, serif',
                                        fontSize: 'clamp(12px, 2vw, 14px)',
                                        boxSizing: 'border-box'
                                    }}
                                    placeholder="Ej: Juan Pérez López"
                                />
                            </div>

                            {/* Teléfono */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{
                                    display: 'block',
                                    color: '#f0ebdc',
                                    marginBottom: '6px',
                                    fontSize: 'clamp(12px, 2vw, 14px)',
                                    fontWeight: 'bold'
                                }}>
                                    Teléfono (opcional)
                                </label>
                                <input
                                    type="tel"
                                    value={formModal.telefono}
                                    onChange={(e) => setFormModal({ ...formModal, telefono: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        border: '1px solid #b8860b',
                                        background: '#f0ebdc',
                                        fontFamily: 'Georgia, serif',
                                        fontSize: 'clamp(12px, 2vw, 14px)',
                                        boxSizing: 'border-box'
                                    }}
                                    placeholder="+52XXXXXXXXXX"
                                />
                            </div>

                            {/* Idioma */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{
                                    display: 'block',
                                    color: '#f0ebdc',
                                    marginBottom: '8px',
                                    fontSize: 'clamp(12px, 2vw, 14px)',
                                    fontWeight: 'bold'
                                }}>
                                    Idioma preferido
                                </label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => setFormModal({ ...formModal, idioma: 'es' })}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            background: formModal.idioma === 'es' ? '#6b1a2a' : '#f0ebdc',
                                            color: formModal.idioma === 'es' ? '#f0ebdc' : '#2b2620',
                                            border: '2px solid ' + (formModal.idioma === 'es' ? '#b8860b' : 'transparent'),
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontFamily: 'Georgia, serif',
                                            fontSize: 'clamp(12px, 2vw, 14px)',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Español
                                    </button>
                                    <button
                                        onClick={() => setFormModal({ ...formModal, idioma: 'nah' })}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            background: formModal.idioma === 'nah' ? '#6b1a2a' : '#f0ebdc',
                                            color: formModal.idioma === 'nah' ? '#f0ebdc' : '#2b2620',
                                            border: '2px solid ' + (formModal.idioma === 'nah' ? '#b8860b' : 'transparent'),
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontFamily: 'Georgia, serif',
                                            fontSize: 'clamp(12px, 2vw, 14px)',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Náhuatl
                                    </button>
                                </div>
                            </div>

                            {/* Tipo de acceso */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{
                                    display: 'block',
                                    color: '#f0ebdc',
                                    marginBottom: '8px',
                                    fontSize: 'clamp(12px, 2vw, 14px)',
                                    fontWeight: 'bold'
                                }}>
                                    Tipo de celular
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {(['smartphone', 'sms', 'sin_celular'] as const).map(tipo => (
                                        <button
                                            key={tipo}
                                            onClick={() => setFormModal({ ...formModal, tipoAcceso: tipo })}
                                            style={{
                                                padding: '10px',
                                                background: formModal.tipoAcceso === tipo ? '#6b1a2a' : '#f0ebdc',
                                                color: formModal.tipoAcceso === tipo ? '#f0ebdc' : '#2b2620',
                                                border: '2px solid ' + (formModal.tipoAcceso === tipo ? '#b8860b' : 'transparent'),
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontFamily: 'Georgia, serif',
                                                fontSize: 'clamp(11px, 2vw, 13px)',
                                                fontWeight: 'bold',
                                                textAlign: 'left'
                                            }}
                                        >
                                            {tipo === 'smartphone' ? '📱 Smartphone (WhatsApp)' :
                                                tipo === 'sms' ? '📞 Teléfono básico (SMS)' :
                                                    '❌ Sin celular'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Cultivos */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    color: '#f0ebdc',
                                    marginBottom: '8px',
                                    fontSize: 'clamp(12px, 2vw, 14px)',
                                    fontWeight: 'bold'
                                }}>
                                    Cultivos a sembrar (mínimo 1) *
                                </label>
                                {zonaSeleccionada.cultivos_sugeridos?.map((cultivo, i) => (
                                    <label
                                        key={i}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px',
                                            background: formModal.cultivosSeleccionados.includes(cultivo) ? '#6b1a2a' : '#f0ebdc',
                                            color: formModal.cultivosSeleccionados.includes(cultivo) ? '#f0ebdc' : '#2b2620',
                                            borderRadius: '6px',
                                            marginBottom: '8px',
                                            cursor: 'pointer',
                                            fontSize: 'clamp(12px, 2vw, 14px)',
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
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        {cultivo}
                                    </label>
                                ))}
                            </div>

                            {/* Mensaje */}
                            {mensajeModal && (
                                <div style={{
                                    background: mensajeModal.includes('✅') ? '#E1F5EE' : '#FCEBEB',
                                    color: mensajeModal.includes('✅') ? '#085041' : '#791F1F',
                                    padding: '12px',
                                    borderRadius: '6px',
                                    marginBottom: '16px',
                                    fontSize: 'clamp(11px, 2vw, 13px)',
                                    whiteSpace: 'pre-line',
                                    lineHeight: '1.5'
                                }}>
                                    {mensajeModal}
                                </div>
                            )}

                            {/* Botones */}
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={registrarProductorEnZona}
                                    disabled={enviandoModal}
                                    style={{
                                        flex: '1 1 150px',
                                        background: '#1D9E75',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '12px',
                                        borderRadius: '6px',
                                        cursor: enviandoModal ? 'not-allowed' : 'pointer',
                                        fontFamily: 'Georgia, serif',
                                        fontSize: 'clamp(12px, 2vw, 14px)',
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
                                        flex: '1 1 150px',
                                        background: '#6b1a2a',
                                        color: '#f0ebdc',
                                        border: 'none',
                                        padding: '12px',
                                        borderRadius: '6px',
                                        cursor: enviandoModal ? 'not-allowed' : 'pointer',
                                        fontFamily: 'Georgia, serif',
                                        fontSize: 'clamp(12px, 2vw, 14px)',
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

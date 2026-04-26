// frontend/src/components/ZonasRestauracion.tsx
import { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '../lib/supabase';

// @ts-ignore
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface Zona {
    id: string;
    nombre: string;
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

export function ZonasRestauracion() {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [zonas, setZonas] = useState<Zona[]>([]);
    const [zonaSeleccionada, setZonaSeleccionada] = useState<Zona | null>(null);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '',
        idioma: 'es' as 'es' | 'nah',
        tipoAcceso: 'smartphone' as 'smartphone' | 'sms',
        cultivosSeleccionados: [] as string[]
    });
    const [cargando, setCargando] = useState(false);
    const [mensaje, setMensaje] = useState('');

    // Cargar zonas
    useEffect(() => {
        cargarZonas();
    }, []);

    async function cargarZonas() {
        const { data, error } = await supabase
            .from('zonas_restauracion')
            .select('*, municipios(nombre)');

        if (error) {
            console.error('Error cargando zonas:', error);
            return;
        }

        setZonas(data || []);
    }

    // Inicializar mapa
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/satellite-streets-v12',
            center: [-97.5, 19.0], // Centro de Puebla
            zoom: 8
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    }, []);

    // Agregar marcadores
    useEffect(() => {
        if (!map.current || zonas.length === 0) return;

        zonas.forEach(zona => {
            const el = document.createElement('div');
            el.className = 'marker';
            el.style.width = '30px';
            el.style.height = '30px';
            el.style.borderRadius = '50%';
            el.style.cursor = 'pointer';
            el.style.border = '3px solid white';
            el.style.backgroundColor = zona.estado === 'disponible' ? '#1D9E75' : '#D85A30';

            new mapboxgl.Marker(el)
                .setLngLat([zona.longitud, zona.latitud])
                .addTo(map.current!);

            el.addEventListener('click', () => {
                setZonaSeleccionada(zona);
            });
        });
    }, [zonas]);

    async function registrarProductor() {
        if (!zonaSeleccionada) return;
        if (!formData.nombre || !formData.telefono || formData.cultivosSeleccionados.length === 0) {
            setMensaje('Por favor completa todos los campos');
            return;
        }

        setCargando(true);
        setMensaje('');

        try {
            // 1. Generar folio
            const año = new Date().getFullYear();
            const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
            const folio = `TLP-${año}-${random}`;

            // 2. Crear productor
            const { data: productor, error: errorProductor } = await supabase
                .from('productores')
                .insert({
                    folio,
                    nombre: formData.nombre,
                    telefono: formData.telefono,
                    idioma_preferido: formData.idioma,
                    tipo_acceso: formData.tipoAcceso,
                    password: 'cambiame123',
                    activo: true,
                    registrado_por: 'admin_zona_restauracion'
                })
                .select()
                .single();

            if (errorProductor) throw errorProductor;

            // 3. Crear parcela
            const { data: parcela, error: errorParcela } = await supabase
                .from('parcelas')
                .insert({
                    productor_id: productor.id,
                    nombre: `Parcela ${zonaSeleccionada.nombre}`,
                    latitud: zonaSeleccionada.latitud,
                    longitud: zonaSeleccionada.longitud,
                    hectareas: zonaSeleccionada.hectareas,
                    zona_id: zonaSeleccionada.id
                })
                .select()
                .single();

            if (errorParcela) throw errorParcela;

            // 4. Crear lotes
            const hectareasPorCultivo = zonaSeleccionada.hectareas / formData.cultivosSeleccionados.length;
            const lotesPromises = formData.cultivosSeleccionados.map(cultivo =>
                supabase.from('lotes_cultivo').insert({
                    parcela_id: parcela.id,
                    cultivo: cultivo.toLowerCase(),
                    hectareas: Math.round(hectareasPorCultivo * 100) / 100,
                    etapa_fenologica: 'vegetativa'
                })
            );

            await Promise.all(lotesPromises);

            // 5. Actualizar zona a asignada
            await supabase
                .from('zonas_restauracion')
                .update({ estado: 'asignada' })
                .eq('id', zonaSeleccionada.id);

            setMensaje(`✅ Productor registrado exitosamente.\n\nFolio: ${folio}\nContraseña temporal: cambiame123`);
            setTimeout(() => {
                setMostrarModal(false);
                cargarZonas(); // Recargar para actualizar colores
                setZonaSeleccionada(null);
                setFormData({
                    nombre: '',
                    telefono: '',
                    idioma: 'es',
                    tipoAcceso: 'smartphone',
                    cultivosSeleccionados: []
                });
            }, 3000);

        } catch (error: any) {
            setMensaje(`❌ Error: ${error.message}`);
        } finally {
            setCargando(false);
        }
    }

    return (
        <div style={{
            background: 'linear-gradient(135deg, #2b2620 0%, #1a0a05 100%)',
            minHeight: '100vh',
            padding: '20px'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{
                    fontFamily: 'Georgia, serif',
                    color: '#f0ebdc',
                    fontSize: '28px',
                    marginBottom: '10px'
                }}>
                    🌳 Zonas de Restauración
                </h1>
                <p style={{ color: '#b8860b', marginBottom: '20px', fontSize: '14px' }}>
                    Programas de reforestación con incentivos económicos para productores
                </p>

                {/* Mapa */}
                <div style={{
                    background: '#f0ebdc',
                    border: '2px solid #b8860b',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    marginBottom: '20px'
                }}>
                    <div ref={mapContainer} style={{ height: '500px', width: '100%' }} />
                </div>

                {/* Info de zona seleccionada */}
                {zonaSeleccionada && !mostrarModal && (
                    <div style={{
                        background: '#f0ebdc',
                        border: '2px solid #b8860b',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '20px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div style={{ flex: 1 }}>
                                <h2 style={{
                                    fontFamily: 'Georgia, serif',
                                    color: '#2b2620',
                                    fontSize: '22px',
                                    marginBottom: '8px'
                                }}>
                                    {zonaSeleccionada.nombre}
                                </h2>
                                <p style={{ color: '#6b1a2a', fontSize: '14px', marginBottom: '15px' }}>
                                    📍 {zonaSeleccionada.municipios?.nombre || 'Sin municipio'}
                                </p>

                                <div style={{ marginBottom: '12px' }}>
                                    <span style={{ fontWeight: 'bold', color: '#2b2620' }}>Programa:</span>
                                    <span style={{ marginLeft: '8px', color: '#444' }}>{zonaSeleccionada.programa}</span>
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <span style={{ fontWeight: 'bold', color: '#2b2620' }}>Organización:</span>
                                    <span style={{ marginLeft: '8px', color: '#444' }}>{zonaSeleccionada.organizacion}</span>
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <span style={{ fontWeight: 'bold', color: '#2b2620' }}>Hectáreas:</span>
                                    <span style={{ marginLeft: '8px', color: '#444' }}>{zonaSeleccionada.hectareas} ha</span>
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <span style={{ fontWeight: 'bold', color: '#2b2620' }}>Apoyo mensual estimado:</span>
                                    <span style={{ marginLeft: '8px', color: '#1D9E75', fontWeight: 'bold' }}>
                                        ${zonaSeleccionada.apoyo_mensual_estimado?.toLocaleString('es-MX') || 0} MXN
                                    </span>
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <span style={{ fontWeight: 'bold', color: '#2b2620' }}>Cultivos sugeridos:</span>
                                    <div style={{ marginTop: '6px' }}>
                                        {zonaSeleccionada.cultivos_sugeridos?.map((c, i) => (
                                            <span key={i} style={{
                                                display: 'inline-block',
                                                background: '#1D9E75',
                                                color: 'white',
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                marginRight: '6px',
                                                marginBottom: '6px'
                                            }}>
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <p style={{ color: '#444', fontSize: '14px', lineHeight: '1.6', marginTop: '15px' }}>
                                    {zonaSeleccionada.descripcion}
                                </p>
                            </div>

                            <div style={{ marginLeft: '20px' }}>
                                <div style={{
                                    background: zonaSeleccionada.estado === 'disponible' ? '#1D9E75' : '#D85A30',
                                    color: 'white',
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    marginBottom: '12px',
                                    textAlign: 'center'
                                }}>
                                    {zonaSeleccionada.estado === 'disponible' ? 'DISPONIBLE' : 'ASIGNADA'}
                                </div>

                                {zonaSeleccionada.estado === 'disponible' && (
                                    <button
                                        onClick={() => setMostrarModal(true)}
                                        style={{
                                            background: '#6b1a2a',
                                            color: '#f0ebdc',
                                            border: 'none',
                                            padding: '12px 20px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontFamily: 'Georgia, serif',
                                            fontSize: '14px',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Asignar Productor
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de registro */}
                {mostrarModal && zonaSeleccionada && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <div style={{
                            background: '#f0ebdc',
                            border: '3px solid #b8860b',
                            borderRadius: '16px',
                            padding: '30px',
                            maxWidth: '500px',
                            width: '90%',
                            maxHeight: '90vh',
                            overflow: 'auto'
                        }}>
                            <h2 style={{
                                fontFamily: 'Georgia, serif',
                                color: '#2b2620',
                                marginBottom: '20px',
                                fontSize: '22px'
                            }}>
                                Registrar Productor - {zonaSeleccionada.nombre}
                            </h2>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#2b2620' }}>
                                    Nombre completo:
                                </label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #b8860b',
                                        fontSize: '14px'
                                    }}
                                    placeholder="Ej: Juan Pérez López"
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#2b2620' }}>
                                    Teléfono (con +52):
                                </label>
                                <input
                                    type="tel"
                                    value={formData.telefono}
                                    onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #b8860b',
                                        fontSize: '14px'
                                    }}
                                    placeholder="+5212221234567"
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#2b2620' }}>
                                    Idioma preferido:
                                </label>
                                <select
                                    value={formData.idioma}
                                    onChange={e => setFormData({ ...formData, idioma: e.target.value as 'es' | 'nah' })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #b8860b',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="es">Español</option>
                                    <option value="nah">Náhuatl</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#2b2620' }}>
                                    Tipo de celular:
                                </label>
                                <select
                                    value={formData.tipoAcceso}
                                    onChange={e => setFormData({ ...formData, tipoAcceso: e.target.value as any })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #b8860b',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="smartphone">Smartphone (WhatsApp)</option>
                                    <option value="sms">Teléfono básico (SMS)</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#2b2620' }}>
                                    Cultivos a sembrar (selecciona al menos 1):
                                </label>
                                {zonaSeleccionada.cultivos_sugeridos?.map((cultivo, i) => (
                                    <label key={i} style={{ display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.cultivosSeleccionados.includes(cultivo)}
                                            onChange={e => {
                                                if (e.target.checked) {
                                                    setFormData({ ...formData, cultivosSeleccionados: [...formData.cultivosSeleccionados, cultivo] });
                                                } else {
                                                    setFormData({ ...formData, cultivosSeleccionados: formData.cultivosSeleccionados.filter(c => c !== cultivo) });
                                                }
                                            }}
                                            style={{ marginRight: '8px' }}
                                        />
                                        {cultivo}
                                    </label>
                                ))}
                            </div>

                            {mensaje && (
                                <div style={{
                                    background: mensaje.includes('✅') ? '#E1F5EE' : '#FCEBEB',
                                    color: mensaje.includes('✅') ? '#085041' : '#791F1F',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    fontSize: '14px',
                                    whiteSpace: 'pre-line'
                                }}>
                                    {mensaje}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={registrarProductor}
                                    disabled={cargando}
                                    style={{
                                        flex: 1,
                                        background: '#1D9E75',
                                        color: 'white',
                                        border: 'none',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        cursor: cargando ? 'not-allowed' : 'pointer',
                                        fontFamily: 'Georgia, serif',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        opacity: cargando ? 0.6 : 1
                                    }}
                                >
                                    {cargando ? 'Registrando...' : 'Registrar'}
                                </button>
                                <button
                                    onClick={() => {
                                        setMostrarModal(false);
                                        setMensaje('');
                                    }}
                                    disabled={cargando}
                                    style={{
                                        flex: 1,
                                        background: '#6b1a2a',
                                        color: '#f0ebdc',
                                        border: 'none',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        cursor: cargando ? 'not-allowed' : 'pointer',
                                        fontFamily: 'Georgia, serif',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        opacity: cargando ? 0.6 : 1
                                    }}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Leyenda */}
                <div style={{
                    background: '#f0ebdc',
                    border: '2px solid #b8860b',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    gap: '20px',
                    alignItems: 'center',
                    fontSize: '14px'
                }}>
                    <span style={{ fontWeight: 'bold', color: '#2b2620' }}>Leyenda:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#1D9E75', border: '2px solid white' }} />
                        <span>Disponible</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#D85A30', border: '2px solid white' }} />
                        <span>Asignada</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

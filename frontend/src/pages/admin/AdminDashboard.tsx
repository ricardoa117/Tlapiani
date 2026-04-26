// src/pages/admin/AdminDashboard.tsx
// ============================================================
// TLAPIANI — Panel de Administración (Opción B: consulta robusta)
// ============================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import './AdminDashboard.css';
import ZonasRestauracion from './ZonasRestauracion';

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

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [adminNombre, setAdminNombre] = useState('Administrador');
    const [productores, setProductores] = useState<Productor[]>([]);
    const [productoresFiltrados, setProductoresFiltrados] = useState<Productor[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(true);
    const [adminMunicipioId, setAdminMunicipioId] = useState<number | null>(null);

    const [stats, setStats] = useState({
        total: 0,
        activos: 0,
        inactivos: 0,
        nahuatl: 0,
        en_riesgo_alto: 0,
        con_alertas: 0,
    });

    const [vistaActual, setVistaActual] = useState<'productores' | 'zonas'>('productores');

    // Auth Guard (sin Supabase Auth)
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
            cargarDatos(muniId);
        } catch {
            navigate('/login');
        }
    }, [navigate]);

    async function cargarDatos(mId: number | null) {
        setCargando(true);

        // 1. Productores (igual que antes)
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

        setCargando(false);
    }

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

    if (cargando) {
        return (
            <div className="admin-loading">
                <div className="admin-loading-icon">🌾</div>
                <p>Cargando panel de administración...</p>
            </div>
        );
    }

    return (
        <div className="admin-wrapper">
            <div className="admin-container">
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
                        <button onClick={cerrarSesion} className="admin-btn-logout">Cerrar sesión</button>
                    </div>
                </header>

                <div className="admin-tabs">
                    <button className={`admin-tab ${vistaActual === 'productores' ? 'active' : ''}`} onClick={() => setVistaActual('productores')}>📊 Productores</button>
                    <button className={`admin-tab ${vistaActual === 'zonas' ? 'active' : ''}`} onClick={() => setVistaActual('zonas')}>🌳 Zonas de Restauración</button>
                </div>

                {vistaActual === 'productores' && (
                    <>
                        <div className="admin-stats-grid">
                            <div className="admin-stat-card"><span className="admin-stat-num">{stats.total}</span><span>Total</span></div>
                            <div className="admin-stat-card"><span className="admin-stat-num" style={{ color: '#1D9E75' }}>{stats.activos}</span><span>Activos</span></div>
                            <div className="admin-stat-card"><span className="admin-stat-num" style={{ color: '#D85A30' }}>{stats.en_riesgo_alto}</span><span>🚨 Riesgo Alto</span></div>
                            <div className="admin-stat-card"><span className="admin-stat-num" style={{ color: '#BA7517' }}>{stats.con_alertas}</span><span>⚠️ Con Alertas</span></div>
                            <div className="admin-stat-card"><span className="admin-stat-num" style={{ color: '#b8860b' }}>{stats.nahuatl}</span><span>Náhuatl</span></div>
                            <div className="admin-stat-card"><span className="admin-stat-num" style={{ color: '#555' }}>{stats.inactivos}</span><span>Inactivos</span></div>
                        </div>
                        <div className="admin-search-bar">
                            <input type="text" placeholder="Buscar por nombre, folio, municipio o cultivo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="admin-search-input" />
                            <button onClick={() => cargarDatos(adminMunicipioId)} className="admin-btn-reload">🔄 Recargar</button>
                        </div>
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead><tr><th>Nombre</th><th>Folio</th><th>Municipio</th><th>Estado Cultivos</th><th>Alertas</th><th>Idioma</th><th>Acceso</th><th>Estado</th><th>Acción</th></tr></thead>
                                <tbody>
                                    {productoresFiltrados.length === 0 ? (
                                        <tr><td colSpan={9} className="admin-empty-table">{busqueda ? 'Sin resultados' : 'No hay productores registrados'}</td></tr>
                                    ) : (
                                        productoresFiltrados.map((p, i) => (
                                            <tr key={p.id} className={i % 2 === 0 ? 'even' : 'odd'}>
                                                <td>{p.nombre}</td>
                                                <td className="folio">{p.folio}</td>
                                                <td>{p.municipios?.nombre || '—'}</td>
                                                <td><span className={`badge riesgo-${p.estado_riesgo}`}>{p.estado_riesgo === 'alto' ? '🔴 Alto' : p.estado_riesgo === 'medio' ? '🟡 Medio' : '🟢 Normal'}</span></td>
                                                <td>{(p.alertas_activas || 0) > 0 ? <div className="alertas-cell"><strong>{p.alertas_activas} {p.alertas_activas === 1 ? 'alerta' : 'alertas'}</strong><br />{p.cultivos_afectados?.join(', ')}</div> : '—'}</td>
                                                <td><span className={`badge idioma-${p.idioma_preferido}`}>{p.idioma_preferido.toUpperCase()}</span></td>
                                                <td className="acceso-icon">{p.tipo_acceso === 'smartphone' ? '📱' : p.tipo_acceso === 'sms' ? '📞' : '❌'}</td>
                                                <td><span className={`badge ${p.activo ? 'activo' : 'inactivo'}`}>{p.activo ? '✓ Activo' : '✗ Inactivo'}</span></td>
                                                <td><button onClick={() => toggleActivoProductor(p.id, p.activo)} className={`btn-toggle ${p.activo ? 'desactivar' : 'activar'}`}>{p.activo ? 'Desactivar' : 'Activar'}</button></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {vistaActual === 'zonas' && <ZonasRestauracion />}
            </div>
        </div>
    );
}
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Registro.css'

// ─── CONFIGURACIÓN DE PASOS ──────────────────────────────────────────────────
const PASOS_PRODUCTOR = ['Tipo de cuenta', 'Datos personales', 'Mi parcela', 'Mis cultivos']
const PASOS_ADMIN = ['Tipo de cuenta', 'Registro Admin', 'Confirmación']

type TipoCuenta = 'productor' | 'administrador' | null

function Stepper({ pasoActual, pasos }: { pasoActual: number, pasos: string[] }) {
    return (
        <div className="topbar-stepper">
            {pasos.map((_, index) => {
                const estado = index < pasoActual ? 'done' : index === pasoActual ? 'active' : 'pending'
                return (
                    <div key={index} className="step-container">
                        <div className={`step step--${estado}`}>
                            {index === pasoActual && <div className="camion-icon" />}
                        </div>
                        {index < pasos.length - 1 && <div className="step-line" />}
                    </div>
                )
            })}
        </div>
    )
}

function IconoProductor() { return <svg className="account-card-icon" viewBox="0 0 64 64" fill="currentColor"><circle cx="32" cy="18" r="10" /><path d="M16 52c0-8.8 7.2-16 16-16s16 7.2 16 16H16z" /><ellipse cx="32" cy="13" rx="18" ry="4" opacity="0.9" /><rect x="24" y="5" width="16" height="9" rx="3" /></svg> }
function IconoAdministrador() { return <svg className="account-card-icon" viewBox="0 0 64 64" fill="currentColor"><circle cx="28" cy="18" r="10" /><path d="M12 52c0-8.8 7.2-16 16-16s16 7.2 16 16H12z" /><ellipse cx="28" cy="13" rx="18" ry="4" opacity="0.9" /><rect x="20" y="5" width="16" height="9" rx="3" /><circle cx="50" cy="46" r="6" opacity="0.85" /><circle cx="50" cy="46" r="3" fill="#f0ebdc" /></svg> }

export default function Registro() {
    const navigate = useNavigate()
    const [pasoActual, setPasoActual] = useState(0)
    const [tipoCuenta, setTipoCuenta] = useState<TipoCuenta>(null)

    const pasosAMostrar = tipoCuenta === 'administrador' ? PASOS_ADMIN : PASOS_PRODUCTOR

    const siguientePaso = () => setPasoActual(prev => prev + 1)
    const anteriorPaso = () => {
        if (pasoActual === 0) navigate('/login')
        else setPasoActual(prev => prev - 1)
    }

    return (
        <div className="registro-wrapper">
            <div className="registro-overlay" />
            <div className="registro-content">

                <div className="registro-topbar">
                    <div className="topbar-logo" />
                    <div className="topbar-brand"><span className="topbar-brand-name">Tlatoani</span></div>
                    <div className="topbar-divider" />
                    <Stepper pasoActual={pasoActual} pasos={pasosAMostrar} />
                </div>

                <div className="form-card-container">

                    {pasoActual === 0 && (
                        <>
                            <h1 className="registro-section-title">Tipo de Cuenta</h1>
                            <div className="registro-cards-grid">
                                <button className="account-card" onClick={() => { setTipoCuenta('productor'); siguientePaso(); }}>
                                    <span className="account-card-title">Productores</span>
                                    <IconoProductor />
                                </button>
                                <button className="account-card" onClick={() => { setTipoCuenta('administrador'); siguientePaso(); }}>
                                    <span className="account-card-title">Administradores</span>
                                    <IconoAdministrador />
                                </button>
                            </div>
                        </>
                    )}

                    {/* ──── FLUJO DE PRODUCTORES ──── */}
                    {tipoCuenta === 'productor' && (
                        <>
                            {pasoActual === 1 && (
                                <div className="form-box">
                                    <h2>Datos personales</h2>
                                    <p className="step-indicator">Paso 1 de 4</p>
                                    <div className="input-group"><label>NOMBRE COMPLETO</label><input type="text" placeholder="Ej: María Sánchez" /></div>
                                    <div className="input-group"><label>TELÉFONO (opcional)</label><input type="text" placeholder="+52 222 000 0000" /></div>

                                    {/* NUEVOS CAMPOS DE CONTRASEÑA PARA PRODUCTOR */}
                                    <div className="row">
                                        <div className="input-group flex-1"><label>CONTRASEÑA</label><input type="password" placeholder="********" /></div>
                                        <div className="input-group flex-1"><label>CONFIRMAR</label><input type="password" placeholder="********" /></div>
                                    </div>

                                    <div className="input-group"><label>MUNICIPIO</label><select><option>Tehuacán</option></select></div>
                                    <div className="row-options"><label>IDIOMA</label><div className="btn-group-2"><button className="opt-btn active">Español</button><button className="opt-btn">Náhuatl</button></div></div>
                                    <div className="row-options" style={{ marginTop: '1rem' }}><label>TIPO DE ACCESO</label><div className="btn-group-3"><button className="opt-btn">Smartphone</button><button className="opt-btn">Solo SMS</button><button className="opt-btn">Sin celular</button></div></div>
                                    <div className="row-btns"><button className="btn-atras-inline" onClick={anteriorPaso}>← Atrás</button><button className="btn-siguiente-inline" onClick={siguientePaso}>Siguiente →</button></div>
                                </div>
                            )}

                            {pasoActual === 2 && (
                                <div className="form-box">
                                    <h2>Mi parcela</h2>
                                    <p className="step-indicator">Paso 2 de 4</p>
                                    <div className="input-group"><label>NOMBRE DE LA PARCELA</label><input type="text" placeholder="Ej: La Esperanza" /></div>
                                    <button className="btn-location"><span>📍 Usar mi ubicación actual</span></button>
                                    <div className="row">
                                        <div className="input-group flex-1"><label>LATITUD</label><input type="text" defaultValue="18.4615" /></div>
                                        <div className="input-group flex-1"><label>LONGITUD</label><input type="text" defaultValue="-97.3897" /></div>
                                    </div>
                                    <div className="input-group"><label>HECTÁREAS TOTALES</label><input type="number" defaultValue="1" /></div>
                                    <div className="row-btns"><button className="btn-atras-inline" onClick={anteriorPaso}>← Atrás</button><button className="btn-siguiente-inline" onClick={siguientePaso}>Siguiente →</button></div>
                                </div>
                            )}

                            {pasoActual === 3 && (
                                <div className="form-box">
                                    <h2>Mis cultivos</h2>
                                    <p className="step-indicator">Paso 3 de 4</p>
                                    <div className="row"><div className="input-group flex-2"><label>CULTIVO</label><select><option>Maíz</option></select></div><div className="input-group flex-1"><label>HECTÁREAS</label><input type="number" defaultValue="1" /></div></div>
                                    <div className="input-group"><label>ETAPA FENOLÓGICA</label><select><option>Vegetativa</option></select></div>
                                    <button className="btn-add">+ Agregar otro cultivo</button>
                                    <div className="row-btns"><button className="btn-atras-inline" onClick={anteriorPaso}>← Atrás</button><button className="btn-siguiente-inline" onClick={() => alert('¡Registro Productor completado!')}>Finalizar →</button></div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ──── FLUJO DE ADMINISTRADORES ──── */}
                    {tipoCuenta === 'administrador' && (
                        <>
                            {pasoActual === 1 && (
                                <div className="form-box">
                                    <h2>Registro de Administrador</h2>
                                    <p className="step-indicator">Paso 1 de 3</p>

                                    <div className="row">
                                        <div className="input-group flex-1"><label>FOLIO</label><input type="text" placeholder="ID-001" /></div>
                                        <div className="input-group flex-2"><label>NOMBRE COMPLETO</label><input type="text" placeholder="Nombre del admin" /></div>
                                    </div>

                                    {/* CAMPOS DE CONTRASEÑA PARA ADMIN */}
                                    <div className="row">
                                        <div className="input-group flex-1"><label>CONTRASEÑA</label><input type="password" placeholder="********" /></div>
                                        <div className="input-group flex-1"><label>CONFIRMAR CONTRASEÑA</label><input type="password" placeholder="********" /></div>
                                    </div>

                                    <div className="input-group"><label>TELÉFONO (Notificaciones)</label><input type="text" placeholder="+52 222..." /></div>

                                    <div className="input-group"><label>MUNICIPIO DE COBERTURA</label><select><option>Tehuacán</option><option>Puebla</option></select></div>

                                    <div className="row-options"><label>IDIOMA PREFERIDO</label>
                                        <div className="btn-group-2"><button className="opt-btn active">Español (es)</button><button className="opt-btn">Náhuatl (nah)</button></div>
                                    </div>

                                    <div className="row-btns">
                                        <button className="btn-atras-inline" onClick={anteriorPaso}>← Atrás</button>
                                        <button className="btn-siguiente-inline" onClick={siguientePaso}>Siguiente →</button>
                                    </div>
                                </div>
                            )}

                            {pasoActual === 2 && (
                                <div className="form-box">
                                    <h2>Confirmación de Rol</h2>
                                    <p className="step-indicator">Paso 2 de 3</p>
                                    <div className="input-group">
                                        <label>ROL ASIGNADO</label>
                                        <input type="text" value="ADMINISTRADOR (admin)" readOnly style={{ opacity: 0.7 }} />
                                    </div>
                                    <div className="input-group">
                                        <label>TIPO DE ACCESO</label>
                                        <input type="text" value="Smartphone / Gestión Web" readOnly style={{ opacity: 0.7 }} />
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '1rem' }}>
                                        Como administrador, tendrás acceso a la gestión de productores y revisión de cultivos de tu municipio asignado.
                                    </p>
                                    <div className="row-btns">
                                        <button className="btn-atras-inline" onClick={anteriorPaso}>← Atrás</button>
                                        <button className="btn-siguiente-inline" onClick={() => alert('¡Registro Admin completado!')}>Finalizar →</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {pasoActual === 0 && (
                    <button className="registro-back-btn" onClick={anteriorPaso}>Regresar</button>
                )}
            </div>
        </div>
    )
}
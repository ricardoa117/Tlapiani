// ============================================================
// TLAPIANI - Script 05: Módulo de Biodigestor
// 
// DOS USOS:
//   1. Como módulo Node.js importable por el backend
//   2. Como script de verificación: node 05_biodigestor.js
//
// FÓRMULAS (fuente: SENER/FIRCO, México):
//   Biogás = (vacas * 1.5) + (cerdos * 0.5) + (aves * 0.02)  m³/día
//   Ahorro  = biogás * 30 * precio_gas_lp   MXN/mes
//   ROI     = costo_biodigestor / ahorro_mensual   meses
// ============================================================

// ── Constantes calibradas para Puebla ──────────────────────
const CONFIG = {
  // Producción de biogás por animal (m³/día)
  BIOGAS_POR_VACA:   1.50,
  BIOGAS_POR_CERDO:  0.50,
  BIOGAS_POR_AVE:    0.02,

  // Precio gas LP en Puebla (promedio 2026, MXN/m³)
  PRECIO_GAS_LP_MXN: 8.50,

  // Costo referencia de un biodigestor familiar básico (MXN)
  // Fuente: Programa FIRCO-SADER, modelo tubular geomembrana
  COSTO_BIODIGESTOR_BASICO: 25000,

  // Emisiones CO₂ evitadas por m³ de biogás (kg CO₂eq)
  KG_CO2_POR_M3: 2.5,
}

// ── Función principal de cálculo ───────────────────────────
export function calcularBiodigestor({ vacas = 0, cerdos = 0, aves = 0 }) {
  // Validaciones
  vacas  = Math.max(0, Math.floor(vacas))
  cerdos = Math.max(0, Math.floor(cerdos))
  aves   = Math.max(0, Math.floor(aves))

  const totalAnimales = vacas + cerdos + aves
  if (totalAnimales === 0) {
    return {
      viable: false,
      motivo: 'Se necesitan al menos 2 animales para un biodigestor rentable',
      biogas_m3_dia: 0,
      ahorro_mensual_mxn: 0,
      roi_meses: null,
      co2_evitado_kg_mes: 0
    }
  }

  // Cálculo
  const biogas_m3_dia =
    (vacas  * CONFIG.BIOGAS_POR_VACA)  +
    (cerdos * CONFIG.BIOGAS_POR_CERDO) +
    (aves   * CONFIG.BIOGAS_POR_AVE)

  const biogas_m3_mes = biogas_m3_dia * 30
  const ahorro_mensual_mxn = biogas_m3_mes * CONFIG.PRECIO_GAS_LP_MXN
  const roi_meses = ahorro_mensual_mxn > 0
    ? Math.ceil(CONFIG.COSTO_BIODIGESTOR_BASICO / ahorro_mensual_mxn)
    : null
  const co2_evitado_kg_mes = biogas_m3_mes * CONFIG.KG_CO2_POR_M3

  // Viabilidad mínima: al menos $200/mes de ahorro
  const viable = ahorro_mensual_mxn >= 200

  return {
    viable,
    // Datos de producción
    biogas_m3_dia:      redondear(biogas_m3_dia, 3),
    biogas_m3_mes:      redondear(biogas_m3_mes, 1),
    // Económicos
    ahorro_mensual_mxn: redondear(ahorro_mensual_mxn, 2),
    ahorro_anual_mxn:   redondear(ahorro_mensual_mxn * 12, 2),
    roi_meses,
    costo_biodigestor:  CONFIG.COSTO_BIODIGESTOR_BASICO,
    // Ambiental
    co2_evitado_kg_mes: redondear(co2_evitado_kg_mes, 1),
    co2_evitado_ton_año: redondear(co2_evitado_kg_mes * 12 / 1000, 3),
    // Input para referencia
    animales: { vacas, cerdos, aves }
  }
}

// ── Actualizar inventario en Supabase ───────────────────────
// Llama esto cuando el productor reporta una muerte de animal
export async function actualizarInventario(supabase, productorId, cambios) {
  // cambios = { vacas_mueren: 1 } o { cerdos_mueren: 2 }, etc.

  // 1. Obtener inventario actual
  const { data: inv, error } = await supabase
    .from('inventario_animal')
    .select('*')
    .eq('productor_id', productorId)
    .single()

  if (error || !inv) return { error: 'Inventario no encontrado' }

  // 2. Aplicar cambios
  const nuevo = {
    vacas:  Math.max(0, inv.vacas  - (cambios.vacas_mueren  || 0)),
    cerdos: Math.max(0, inv.cerdos - (cambios.cerdos_mueren || 0)),
    aves:   Math.max(0, inv.aves   - (cambios.aves_mueren   || 0)),
  }

  // 3. Recalcular biodigestor
  const resultado = calcularBiodigestor(nuevo)

  // 4. Guardar
  const { error: errUpdate } = await supabase
    .from('inventario_animal')
    .update({
      ...nuevo,
      biogas_m3_dia:       resultado.biogas_m3_dia,
      ahorro_mensual_mxn:  resultado.ahorro_mensual_mxn,
      roi_meses:           resultado.roi_meses,
      ultima_actualizacion: new Date().toISOString()
    })
    .eq('productor_id', productorId)

  if (errUpdate) return { error: errUpdate.message }
  return { ok: true, resultado }
}

// ── Helpers ─────────────────────────────────────────────────
function redondear(num, decimales) {
  return Math.round(num * Math.pow(10, decimales)) / Math.pow(10, decimales)
}

// ── Script de verificación / demostración ──────────────────
// Se ejecuta cuando corres: node 05_biodigestor.js
if (process.argv[1].endsWith('05_biodigestor.js')) {
  console.log('\n🐄 TLAPIANI - Verificación de Fórmulas del Biodigestor')
  console.log('========================================================\n')

  const casosDePrueba = [
    { label: 'Demo principal (María Sánchez)',  vacas: 2, cerdos: 3, aves: 0 },
    { label: 'Carlos (grande)',                 vacas: 3, cerdos: 5, aves: 20 },
    { label: 'Juana (medio)',                   vacas: 2, cerdos: 3, aves: 0 },
    { label: 'Pedro (solo cerdos y aves)',       vacas: 0, cerdos: 8, aves: 50 },
    { label: 'Rosa (vacas grandes)',             vacas: 5, cerdos: 0, aves: 30 },
    { label: 'Miguel (pequeño)',                 vacas: 1, cerdos: 2, aves: 15 },
    { label: 'Sin animales (borde)',             vacas: 0, cerdos: 0, aves: 0 },
  ]

  for (const caso of casosDePrueba) {
    const { label, ...animales } = caso
    const r = calcularBiodigestor(animales)

    console.log(`📋 ${label}`)
    console.log(`   Animales: ${animales.vacas}v + ${animales.cerdos}c + ${animales.aves}a`)
    if (!r.viable) {
      console.log(`   ⚠️  No viable: ${r.motivo}\n`)
      continue
    }
    console.log(`   Biogás:   ${r.biogas_m3_dia} m³/día (${r.biogas_m3_mes} m³/mes)`)
    console.log(`   Ahorro:   $${r.ahorro_mensual_mxn.toLocaleString('es-MX')} MXN/mes`)
    console.log(`   ROI:      ${r.roi_meses} meses`)
    console.log(`   CO₂:      ${r.co2_evitado_kg_mes} kg CO₂eq/mes evitados`)
    console.log(`   Viable:   ${r.viable ? '✓ Sí' : '✗ No'}\n`)
  }

  // Caso especial: muerte de animal (simulación)
  console.log('🔄 Simulación de muerte de animal:')
  const antes = calcularBiodigestor({ vacas: 2, cerdos: 3, aves: 0 })
  const despues = calcularBiodigestor({ vacas: 2, cerdos: 2, aves: 0 }) // murió 1 cerdo
  console.log(`   Antes:  $${antes.ahorro_mensual_mxn} MXN/mes`)
  console.log(`   Después (−1 cerdo): $${despues.ahorro_mensual_mxn} MXN/mes`)
  console.log(`   Diferencia: $${redondear(antes.ahorro_mensual_mxn - despues.ahorro_mensual_mxn, 2)} MXN/mes\n`)

  function redondear(n, d) { return Math.round(n * Math.pow(10,d)) / Math.pow(10,d) }
}

#!/usr/bin/env node
// ============================================================
// TLAPIANI - Script 03: NASA POWER API
// Consulta datos climáticos para todas las parcelas demo
// y calcula ET₀ (evapotranspiración de referencia) por cultivo
//
// USO: node 03_nasa_power.js
// REQUIERE: npm install @supabase/supabase-js node-fetch dotenv
// ============================================================

import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // usa SERVICE key (no anon) para insertar
)

// ── Parámetros NASA POWER que necesitamos ──────────────────
const NASA_PARAMS = [
  'T2M_MAX',        // Temperatura máxima (°C)
  'T2M_MIN',        // Temperatura mínima (°C)
  'RH2M',           // Humedad relativa media (%)
  'ALLSKY_SFC_SW_DWN', // Radiación solar global (MJ/m²/día)
  'WS2M',           // Velocidad del viento a 2m (m/s)
  'PRECTOTCORR'     // Precipitación (mm/día)
].join(',')

// ── Demanda hídrica por cultivo (Kc según etapa fenológica) ─
// Fuente: FAO-56 Penman-Monteith
const KC_TABLE = {
  maiz: {
    germinacion: 0.3, vegetativa: 0.7, floracion: 1.2,
    fructificacion: 1.0, maduracion: 0.6, permanente: 0.7
  },
  frijol: {
    germinacion: 0.4, vegetativa: 0.7, floracion: 1.1,
    fructificacion: 0.9, maduracion: 0.5, permanente: 0.7
  },
  aguacate: {
    germinacion: 0.5, vegetativa: 0.6, floracion: 0.9,
    fructificacion: 0.9, maduracion: 0.8, permanente: 0.85
  },
  cafe: {
    germinacion: 0.5, vegetativa: 0.6, floracion: 0.9,
    fructificacion: 0.9, maduracion: 0.8, permanente: 0.9
  },
  calabaza: {
    germinacion: 0.4, vegetativa: 0.7, floracion: 1.0,
    fructificacion: 0.8, maduracion: 0.6, permanente: 0.7
  },
  default: {
    germinacion: 0.4, vegetativa: 0.7, floracion: 1.0,
    fructificacion: 0.9, maduracion: 0.6, permanente: 0.8
  }
}

// ── Calcular ET₀ con Hargreaves-Samani (simplificado FAO) ──
// Requiere solo Tmax, Tmin y Radiación extraterrestre
// Hargreaves: ET₀ = 0.0023 * (Tmean+17.8) * (Tmax-Tmin)^0.5 * Rs
function calcularETO(tmax, tmin, rs) {
  if (!tmax || !tmin || !rs) return null
  const tmean = (tmax + tmin) / 2
  const eto = 0.0023 * (tmean + 17.8) * Math.pow(tmax - tmin, 0.5) * rs
  return Math.max(0, Math.round(eto * 100) / 100)
}

// ── Calcular días para próximo riego ────────────────────────
// Simplificado: ETc = ET₀ * Kc; días_riego = capacidad_campo / ETc
// Capacidad de campo asumida: 50mm (suelo franco típico)
function calcularDiasRiego(eto, cultivo, etapa, precipitacion) {
  const kc = (KC_TABLE[cultivo] || KC_TABLE.default)[etapa] || 0.7
  const etc = eto * kc  // Evapotranspiración del cultivo (mm/día)
  const agua_disponible = 50 - (precipitacion || 0) // mm disponibles
  const dias = Math.round(agua_disponible / etc)
  return Math.max(0, Math.min(dias, 14)) // Entre 0 y 14 días
}

// ── Estado semáforo basado en días para riego ───────────────
function calcularSemaforo(diasRiego, ndviEstado) {
  if (diasRiego <= 1 || ndviEstado === 'estres_severo') return 'rojo'
  if (diasRiego <= 3 || ndviEstado === 'estres_leve')   return 'amarillo'
  return 'verde'
}

// ── Generar texto de recomendación ──────────────────────────
function generarRecomendacion(diasRiego, cultivo, semaforo) {
  const cultivoNombre = {
    maiz: 'maíz', frijol: 'frijol', aguacate: 'aguacate',
    cafe: 'café', calabaza: 'calabaza'
  }[cultivo] || cultivo

  const es = diasRiego === 0
    ? `⚠️ Riegue su ${cultivoNombre} HOY. Estrés hídrico detectado.`
    : diasRiego === 1
    ? `Riegue su ${cultivoNombre} mañana.`
    : `Su ${cultivoNombre} puede esperar ${diasRiego} días para el próximo riego.`

  const nah = diasRiego === 0
    ? `⚠️ Axan xaltetili mo${cultivo === 'maiz' ? 'tlayol' : 'xochitl'}.`
    : diasRiego === 1
    ? `Mostla xaltetili mo${cultivo === 'maiz' ? 'tlayol' : 'xochitl'}.`
    : `Mo${cultivo === 'maiz' ? 'tlayol' : 'xochitl'} ipan ${diasRiego} tonal.`

  return { es, nah }
}

// ── Consultar NASA POWER API ────────────────────────────────
async function consultarNASAPower(lat, lon) {
  // Fechas: últimos 7 días
  const hoy = new Date()
  const hace7 = new Date(hoy)
  hace7.setDate(hoy.getDate() - 8)

  const formatFecha = (d) =>
    `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`

  const url = `https://power.larc.nasa.gov/api/temporal/daily/point` +
    `?parameters=${NASA_PARAMS}` +
    `&community=AG` +
    `&longitude=${lon}` +
    `&latitude=${lat}` +
    `&start=${formatFecha(hace7)}` +
    `&end=${formatFecha(hoy)}` +
    `&format=JSON`

  console.log(`  → Consultando NASA POWER para (${lat}, ${lon})...`)

  const res = await fetch(url)
  if (!res.ok) {
    console.error(`  ✗ Error NASA POWER: ${res.status}`)
    return null
  }

  const data = await res.json()
  const props = data?.properties?.parameter

  if (!props) {
    console.error('  ✗ Respuesta inesperada de NASA POWER')
    return null
  }

  // Promediar los últimos 3 días disponibles
  const fechas = Object.keys(props.T2M_MAX || {}).slice(-3)
  if (fechas.length === 0) return null

  const promedio = (campo) => {
    const vals = fechas.map(f => props[campo]?.[f]).filter(v => v != null && v !== -999)
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }

  return {
    temperatura_max: Math.round(promedio('T2M_MAX') * 10) / 10,
    temperatura_min: Math.round(promedio('T2M_MIN') * 10) / 10,
    humedad_relativa: Math.round(promedio('RH2M') * 10) / 10,
    radiacion_solar:  Math.round(promedio('ALLSKY_SFC_SW_DWN') * 1000) / 1000,
    precipitacion:    Math.round(promedio('PRECTOTCORR') * 10) / 10
  }
}

// ── Guardar en Supabase ─────────────────────────────────────
async function guardarMonitoreo(loteId, climatico, ndviData) {
  const eto = calcularETO(
    climatico.temperatura_max,
    climatico.temperatura_min,
    climatico.radiacion_solar
  )

  const dias = calcularDiasRiego(
    eto,
    ndviData.cultivo,
    ndviData.etapa,
    climatico.precipitacion
  )

  const textos = generarRecomendacion(dias, ndviData.cultivo, null)
  const semaforo = calcularSemaforo(dias, ndviData.ndvi_estado)

  const { error } = await supabase
    .from('monitoreo_lote')
    .upsert({
      lote_id: loteId,
      fecha: new Date().toISOString().split('T')[0],
      temperatura_max: climatico.temperatura_max,
      temperatura_min: climatico.temperatura_min,
      humedad_relativa: climatico.humedad_relativa,
      radiacion_solar: climatico.radiacion_solar,
      eto,
      ndvi: ndviData.ndvi,
      ndvi_estado: ndviData.ndvi_estado || 'sin_dato',
      dias_para_riego: dias,
      recomendacion_texto_es: textos.es,
      recomendacion_texto_nah: textos.nah,
      estado_semaforo: semaforo,
      alerta_plaga: false
    }, { onConflict: 'lote_id,fecha' })

  if (error) {
    console.error(`  ✗ Error guardando en Supabase: ${error.message}`)
    return false
  }
  return true
}

// ── MAIN ────────────────────────────────────────────────────
async function main() {
  console.log('\n🌾 TLAPIANI - Script NASA POWER')
  console.log('================================\n')

  // 1. Obtener todos los lotes con su parcela y coordenadas
  const { data: lotes, error } = await supabase
    .from('lotes_cultivo')
    .select(`
      id, cultivo, etapa_fenologica,
      parcela:parcelas(latitud, longitud, nombre)
    `)

  if (error) {
    console.error('Error obteniendo lotes:', error.message)
    process.exit(1)
  }

  console.log(`Procesando ${lotes.length} lotes de cultivo...\n`)

  // 2. Obtener datos NDVI de Supabase (pre-cargados por script 04)
  const { data: monitoreos } = await supabase
    .from('monitoreo_lote')
    .select('lote_id, ndvi, ndvi_estado')
    .eq('fecha', new Date().toISOString().split('T')[0])

  const ndviPorLote = {}
  monitoreos?.forEach(m => { ndviPorLote[m.lote_id] = m })

  // 3. Por cada lote, consultar NASA y calcular
  let exitosos = 0
  for (const lote of lotes) {
    const { latitud, longitud, nombre } = lote.parcela
    console.log(`📍 ${nombre} - ${lote.cultivo} (${lote.etapa_fenologica})`)

    const climatico = await consultarNASAPower(latitud, longitud)
    if (!climatico) {
      console.log('  ⚠️  Sin datos climáticos, saltando...\n')
      continue
    }

    console.log(`  ET₀: ${calcularETO(climatico.temperatura_max, climatico.temperatura_min, climatico.radiacion_solar)} mm/día`)

    const ndviInfo = ndviPorLote[lote.id] || { ndvi: null, ndvi_estado: 'sin_dato' }

    const ok = await guardarMonitoreo(lote.id, climatico, {
      ...ndviInfo,
      cultivo: lote.cultivo,
      etapa: lote.etapa_fenologica
    })

    if (ok) {
      console.log('  ✓ Guardado en Supabase\n')
      exitosos++
    }

    // Delay de 1s entre peticiones para no sobrecargar la API
    await new Promise(r => setTimeout(r, 1000))
  }

  console.log(`\n✅ Completado: ${exitosos}/${lotes.length} lotes procesados`)
}

main().catch(console.error)

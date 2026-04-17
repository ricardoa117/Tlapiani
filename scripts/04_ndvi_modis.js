#!/usr/bin/env node
// ============================================================
// TLAPIANI - Script 04: NDVI real con NASA AppEEARS + MODIS
// 
// FLUJO:
//   1. Enviar petición a AppEEARS con todas las coordenadas
//   2. Esperar a que procese (5-30 min)
//   3. Descargar resultados
//   4. Guardar en Supabase
//
// EJECUTAR la noche del 24 de abril (ANTES del hackatón)
// USO: node 04_ndvi_modis.js
//
// REQUIERE:
//   - Cuenta NASA Earthdata (earthdata.nasa.gov) ← crear HOY
//   - npm install @supabase/supabase-js node-fetch dotenv
//   - Variables en .env: SUPABASE_URL, SUPABASE_SERVICE_KEY,
//                        NASA_EARTHDATA_USER, NASA_EARTHDATA_PASS
// ============================================================

import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// AppEEARS base URL
const APPEEARS_BASE = 'https://appeears.earthdatacloud.nasa.gov/api'

// ── Parcelas demo con sus coordenadas ──────────────────────
// Si agregas parcelas nuevas, ponlas aquí también
const PARCELAS_DEMO = [
  { id: '22222222-0000-0000-0000-000000000001', nombre: 'La Esperanza',   lat: 18.4615, lon: -97.3897 },
  { id: '22222222-0000-0000-0000-000000000002', nombre: 'El Cerrito',     lat: 18.4890, lon: -97.4100 },
  { id: '22222222-0000-0000-0000-000000000003', nombre: 'Parcela Norte',  lat: 18.9053, lon: -98.4386 },
  { id: '22222222-0000-0000-0000-000000000004', nombre: 'Las Milpas',     lat: 19.1570, lon: -98.4100 },
  { id: '22222222-0000-0000-0000-000000000005', nombre: 'El Huerto',      lat: 19.1800, lon: -98.4300 },
  { id: '22222222-0000-0000-0000-000000000006', nombre: 'Tierra Grande',  lat: 19.4478, lon: -97.6878 },
  { id: '22222222-0000-0000-0000-000000000007', nombre: 'San José',       lat: 18.4200, lon: -97.3500 },
  { id: '22222222-0000-0000-0000-000000000008', nombre: 'La Loma',        lat: 18.4400, lon: -97.3700 },
]

// ── Estado NDVI según valor ─────────────────────────────────
function clasificarNDVI(valor) {
  if (valor === null || valor < -0.1) return 'sin_dato'
  if (valor >= 0.5)  return 'saludable'
  if (valor >= 0.3)  return 'estres_leve'
  return 'estres_severo'
}

// ── PASO 1: Login en AppEEARS ───────────────────────────────
async function loginAppEEARS() {
  console.log('🔐 Autenticando en NASA AppEEARS...')

  const credentials = Buffer.from(
    `${process.env.NASA_EARTHDATA_USER}:${process.env.NASA_EARTHDATA_PASS}`
  ).toString('base64')

  const res = await fetch(`${APPEEARS_BASE}/login`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials}` }
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Login fallido (${res.status}): ${body}`)
  }

  const data = await res.json()
  console.log('  ✓ Login exitoso\n')
  return data.token
}

// ── PASO 2: Enviar tarea a AppEEARS ────────────────────────
async function enviarTarea(token) {
  console.log('📡 Enviando tarea a AppEEARS...')

  // Fechas: periodo reciente de 30 días (MODIS actualiza cada 16 días)
  const hoy = new Date()
  const hace30 = new Date(hoy)
  hace30.setDate(hoy.getDate() - 30)

  const formatFecha = (d) =>
    `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${d.getFullYear()}`

  // Construir puntos de muestra (una coordenada por parcela)
  const coordinates = PARCELAS_DEMO.map(p => ({
    id: p.id,
    longitude: p.lon,
    latitude: p.lat,
    category: p.nombre
  }))

  const tarea = {
    task_type: 'point',
    task_name: `tlapiani_ndvi_${Date.now()}`,
    params: {
      dates: [{
        startDate: formatFecha(hace30),
        endDate: formatFecha(hoy)
      }],
      layers: [{
        product: 'MOD13Q1.061',       // MODIS Terra Vegetation Indices 16-Day 250m
        layer: '_250m_16_days_NDVI'
      }],
      coordinates
    }
  }

  const res = await fetch(`${APPEEARS_BASE}/task`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(tarea)
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Error enviando tarea (${res.status}): ${body}`)
  }

  const data = await res.json()
  console.log(`  ✓ Tarea enviada. ID: ${data.task_id}\n`)
  return data.task_id
}

// ── PASO 3: Esperar resultado ───────────────────────────────
async function esperarResultado(token, taskId) {
  console.log('⏳ Esperando procesamiento de AppEEARS...')
  console.log('   (Puede tardar entre 5 y 30 minutos. Polling cada 30 segundos)\n')

  let intentos = 0
  const MAX_INTENTOS = 60 // 30 minutos máximo

  while (intentos < MAX_INTENTOS) {
    const res = await fetch(`${APPEEARS_BASE}/task/${taskId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    const data = await res.json()
    const status = data.status

    if (status === 'done') {
      console.log('  ✓ Procesamiento completado\n')
      return true
    } else if (status === 'error') {
      throw new Error(`AppEEARS reportó error en la tarea: ${JSON.stringify(data)}`)
    }

    intentos++
    const progreso = data.params?.status?.progress?.summary || 'procesando...'
    process.stdout.write(`\r  Estado: ${status} (${progreso}) - ${intentos * 30}s`)
    await new Promise(r => setTimeout(r, 30000))
  }

  throw new Error('Timeout: AppEEARS tardó más de 30 minutos')
}

// ── PASO 4: Descargar y parsear resultados ──────────────────
async function descargarResultados(token, taskId) {
  console.log('📥 Descargando resultados...')

  // Listar archivos del resultado
  const resFiles = await fetch(`${APPEEARS_BASE}/bundle/${taskId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const { files } = await resFiles.json()

  // Buscar el CSV con los datos (hay otros archivos auxiliares)
  const csvFile = files.find(f => f.file_name.endsWith('.csv') && f.file_name.includes('NDVI'))
  if (!csvFile) {
    throw new Error('No se encontró archivo CSV en los resultados')
  }

  const resData = await fetch(`${APPEEARS_BASE}/bundle/${taskId}/${csvFile.file_id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  const csv = await resData.text()
  console.log('  ✓ CSV descargado\n')
  return parsearCSV(csv)
}

// ── Parser CSV manual (sin dependencias) ───────────────────
function parsearCSV(csv) {
  const lineas = csv.trim().split('\n')
  if (lineas.length < 2) return {}

  const headers = lineas[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const idxId = headers.findIndex(h => h === 'id' || h === 'ID' || h === 'Category')
  const idxNDVI = headers.findIndex(h => h.includes('NDVI'))
  const idxQC = headers.findIndex(h => h.includes('pixel_reliability') || h.includes('QC'))
  const idxDate = headers.findIndex(h => h.includes('Date'))

  if (idxNDVI === -1) {
    throw new Error(`No se encontró columna NDVI en: ${headers.join(', ')}`)
  }

  // Agrupar por parcela, quedarse con el valor más reciente de buena calidad
  const porParcela = {}

  for (let i = 1; i < lineas.length; i++) {
    const cols = lineas[i].split(',').map(c => c.trim().replace(/"/g, ''))
    const parcelaId = cols[idxId]
    const ndviRaw = parseFloat(cols[idxNDVI])
    const fecha = cols[idxDate] || ''
    const qc = idxQC >= 0 ? parseInt(cols[idxQC]) : 0

    // MODIS NDVI viene en escala 0-10000, convertir a -1 a 1
    const ndvi = isNaN(ndviRaw) ? null :
      ndviRaw > 1 ? ndviRaw / 10000 : ndviRaw // ya normalizado o sin normalizar

    // Filtrar datos de mala calidad (QC > 1 = nubes o datos malos)
    if (qc > 1 || ndvi === null) continue

    if (!porParcela[parcelaId] || fecha > porParcela[parcelaId].fecha) {
      porParcela[parcelaId] = { ndvi, fecha }
    }
  }

  return porParcela
}

// ── PASO 5: Guardar en Supabase ─────────────────────────────
async function guardarNDVI(resultados) {
  console.log('💾 Guardando NDVI en Supabase...\n')

  const hoy = new Date().toISOString().split('T')[0]
  let guardados = 0

  for (const parcela of PARCELAS_DEMO) {
    const resultado = resultados[parcela.id] || resultados[parcela.nombre]
    const ndvi = resultado?.ndvi ?? null
    const estado = clasificarNDVI(ndvi)

    // Obtener lotes de esta parcela
    const { data: lotes } = await supabase
      .from('lotes_cultivo')
      .select('id, cultivo')
      .eq('parcela_id', parcela.id)

    if (!lotes || lotes.length === 0) {
      console.log(`  ⚠️  ${parcela.nombre}: sin lotes en BD`)
      continue
    }

    // Guardar NDVI en monitoreo de cada lote
    for (const lote of lotes) {
      const { error } = await supabase
        .from('monitoreo_lote')
        .upsert({
          lote_id: lote.id,
          fecha: hoy,
          ndvi: ndvi ? Math.round(ndvi * 10000) / 10000 : null,
          ndvi_estado: estado
        }, { onConflict: 'lote_id,fecha' })

      if (!error) {
        guardados++
        const ndviStr = ndvi ? ndvi.toFixed(4) : 'sin_dato'
        console.log(`  ✓ ${parcela.nombre} - ${lote.cultivo}: NDVI=${ndviStr} (${estado})`)
      } else {
        console.error(`  ✗ Error: ${error.message}`)
      }
    }
  }

  console.log(`\n✅ NDVI guardado para ${guardados} lotes`)
}

// ── Modo de rescate: NDVI simulado si AppEEARS falla ───────
// Úsalo si el API no responde el día del hackatón
// Los valores son realistas para la región de Puebla en abril
async function guardarNDVISimulado() {
  console.log('⚠️  MODO RESCATE: Cargando NDVI simulado (valores realistas)\n')

  const ndviSimulado = {
    '22222222-0000-0000-0000-000000000001': 0.62,  // La Esperanza: maíz joven, bueno
    '22222222-0000-0000-0000-000000000002': 0.71,  // El Cerrito: café permanente
    '22222222-0000-0000-0000-000000000003': 0.58,  // Parcela Norte: maíz bueno
    '22222222-0000-0000-0000-000000000004': 0.44,  // Las Milpas: estrés leve
    '22222222-0000-0000-0000-000000000005': 0.67,  // El Huerto: bueno
    '22222222-0000-0000-0000-000000000006': 0.51,  // Tierra Grande: límite
    '22222222-0000-0000-0000-000000000007': 0.29,  // San José: estrés severo (demo!)
    '22222222-0000-0000-0000-000000000008': 0.55,  // La Loma: bueno
  }

  const simulado = {}
  for (const [id, ndvi] of Object.entries(ndviSimulado)) {
    simulado[id] = { ndvi, fecha: new Date().toISOString().split('T')[0] }
  }

  await guardarNDVI(simulado)
}

// ── MAIN ────────────────────────────────────────────────────
async function main() {
  console.log('\n🛰️  TLAPIANI - Script NDVI con MODIS/AppEEARS')
  console.log('===============================================\n')

  const args = process.argv.slice(2)

  // Si pasas --simulado, carga NDVI realista sin llamar a la API
  // Útil para: pruebas, si la API falla, o el día del hackatón como plan B
  if (args.includes('--simulado')) {
    await guardarNDVISimulado()
    return
  }

  try {
    const token    = await loginAppEEARS()
    const taskId   = await enviarTarea(token)
    await esperarResultado(token, taskId)
    const resultados = await descargarResultados(token, taskId)
    await guardarNDVI(resultados)

  } catch (err) {
    console.error('\n❌ Error en AppEEARS:', err.message)
    console.log('\n💡 Prueba con modo simulado: node 04_ndvi_modis.js --simulado')
    process.exit(1)
  }
}

main()

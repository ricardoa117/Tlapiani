#!/usr/bin/env node
// ============================================================
// TLAPIANI - Script 06: Verificación completa del sistema
// 
// Corre esto antes del hackatón para asegurarte de que
// todo está conectado y funcionando correctamente.
//
// USO: node 06_verificar_sistema.js
// ============================================================

import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

let errores = 0
let advertencias = 0

function ok(msg)  { console.log(`  ✅ ${msg}`) }
function warn(msg) { console.log(`  ⚠️  ${msg}`); advertencias++ }
function fail(msg) { console.log(`  ❌ ${msg}`); errores++ }

// ── CHECK 1: Variables de entorno ───────────────────────────
async function checkEnv() {
  console.log('\n📋 Variables de entorno')
  console.log('─────────────────────────')

  const required = [
    'SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'SUPABASE_ANON_KEY',
    'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER',
    'NASA_EARTHDATA_USER', 'NASA_EARTHDATA_PASS'
  ]

  for (const v of required) {
    if (process.env[v]) {
      ok(`${v} definida`)
    } else {
      fail(`${v} NO DEFINIDA`)
    }
  }
}

// ── CHECK 2: Supabase ───────────────────────────────────────
async function checkSupabase() {
  console.log('\n🗄️  Supabase')
  console.log('─────────────────────────')

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    fail('No se puede verificar Supabase sin credenciales')
    return
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const tablas = [
    'municipios', 'productores', 'parcelas',
    'lotes_cultivo', 'monitoreo_lote', 'inventario_animal', 'traducciones'
  ]

  for (const tabla of tablas) {
    const { data, error, count } = await supabase
      .from(tabla)
      .select('*', { count: 'exact', head: false })
      .limit(1)

    if (error) {
      fail(`Tabla '${tabla}': ${error.message}`)
    } else {
      ok(`Tabla '${tabla}' existe y accesible`)
    }
  }

  // Verificar datos demo
  const { data: productores } = await supabase
    .from('productores')
    .select('folio')
    .like('folio', 'TLP-DEMO-%')

  if (!productores || productores.length === 0) {
    fail('No hay datos demo. Ejecuta 02_demo_seed.sql primero')
  } else {
    ok(`${productores.length} productores demo cargados`)
  }

  const { data: monitoreos } = await supabase
    .from('monitoreo_lote')
    .select('id')

  if (!monitoreos || monitoreos.length === 0) {
    warn('No hay datos de monitoreo. Ejecuta 03_nasa_power.js y 04_ndvi_modis.js')
  } else {
    ok(`${monitoreos.length} registros de monitoreo encontrados`)
  }

  // Verificar que hay NDVI cargado
  const { data: conNDVI } = await supabase
    .from('monitoreo_lote')
    .select('id')
    .not('ndvi', 'is', null)

  if (!conNDVI || conNDVI.length === 0) {
    warn('No hay valores NDVI. Ejecuta 04_ndvi_modis.js (o con --simulado)')
  } else {
    ok(`${conNDVI.length} lotes con NDVI satelital cargado`)
  }
}

// ── CHECK 3: NASA POWER API ─────────────────────────────────
async function checkNASA() {
  console.log('\n🛰️  NASA POWER API')
  console.log('─────────────────────────')

  try {
    const url = 'https://power.larc.nasa.gov/api/temporal/daily/point' +
      '?parameters=T2M_MAX,T2M_MIN&community=AG' +
      '&longitude=-97.3897&latitude=18.4615' +
      '&start=20260401&end=20260407&format=JSON'

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })

    if (!res.ok) {
      fail(`NASA POWER respondió con status ${res.status}`)
      return
    }

    const data = await res.json()
    const tmax = Object.values(data?.properties?.parameter?.T2M_MAX || {})[0]

    if (tmax && tmax !== -999) {
      ok(`NASA POWER responde. T_max Tehuacán: ${tmax}°C`)
    } else {
      warn('NASA POWER responde pero los datos parecen inválidos')
    }
  } catch (e) {
    if (e.name === 'TimeoutError') {
      warn('NASA POWER tardó más de 10s. Puede ser lento o sin internet.')
    } else {
      fail(`NASA POWER: ${e.message}`)
    }
  }
}

// ── CHECK 4: Twilio SMS ─────────────────────────────────────
async function checkTwilio() {
  console.log('\n📱 Twilio SMS')
  console.log('─────────────────────────')

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    fail('Credenciales Twilio no definidas')
    return
  }

  try {
    const credentials = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString('base64')

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}.json`,
      { headers: { 'Authorization': `Basic ${credentials}` } }
    )

    const data = await res.json()

    if (res.ok) {
      ok(`Cuenta Twilio activa: ${data.friendly_name}`)
      ok(`Número configurado: ${process.env.TWILIO_PHONE_NUMBER}`)

      if (data.type === 'Trial') {
        warn('Cuenta Trial: solo puedes enviar SMS a números verificados. Verifica el número del "productor" en consola Twilio.')
      }
    } else {
      fail(`Twilio auth fallida: ${data.message}`)
    }
  } catch (e) {
    fail(`Twilio: ${e.message}`)
  }
}

// ── CHECK 5: AppEEARS (NASA Earthdata) ──────────────────────
async function checkAppEEARS() {
  console.log('\n🌿 NASA AppEEARS')
  console.log('─────────────────────────')

  if (!process.env.NASA_EARTHDATA_USER || !process.env.NASA_EARTHDATA_PASS) {
    fail('Credenciales NASA Earthdata no definidas')
    return
  }

  try {
    const credentials = Buffer.from(
      `${process.env.NASA_EARTHDATA_USER}:${process.env.NASA_EARTHDATA_PASS}`
    ).toString('base64')

    const res = await fetch('https://appeears.earthdatacloud.nasa.gov/api/login', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${credentials}` },
      signal: AbortSignal.timeout(15000)
    })

    if (res.ok) {
      ok('AppEEARS: login exitoso, credenciales válidas')
    } else {
      fail(`AppEEARS: credenciales inválidas (${res.status})`)
    }
  } catch (e) {
    fail(`AppEEARS: ${e.message}`)
  }
}

// ── RESUMEN FINAL ───────────────────────────────────────────
async function main() {
  console.log('\n🌾 TLAPIANI - Verificación del sistema')
  console.log('========================================')

  await checkEnv()
  await checkSupabase()
  await checkNASA()
  await checkTwilio()
  await checkAppEEARS()

  console.log('\n========================================')
  console.log('RESUMEN:')
  if (errores === 0 && advertencias === 0) {
    console.log('✅ Todo listo para el hackatón!')
  } else {
    if (errores > 0)      console.log(`❌ ${errores} error(es) crítico(s) — deben resolverse`)
    if (advertencias > 0) console.log(`⚠️  ${advertencias} advertencia(s) — revisar antes del evento`)
  }
  console.log()

  process.exit(errores > 0 ? 1 : 0)
}

main()

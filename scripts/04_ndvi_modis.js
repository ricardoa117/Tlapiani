#!/usr/bin/env node
// scripts/03_nasa_power.js
// ============================================================
// TLAPIANI - Pipeline de clima NASA POWER + riesgo de plagas
//
// Orden ideal: primero 04_ndvi_modis.js, luego este script.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { calcularRiesgoPlaga } from './07_plagas.js'

dotenv.config();

// ------------------------------------------------------------
// 1. Inicialización del cliente de Supabase (service role)
//    para poder escribir en la base de datos.
// ------------------------------------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ------------------------------------------------------------
// 2. Función principal: procesa todos los lotes activos.
// ------------------------------------------------------------
async function actualizarClimaYPlagas() {
  console.log('🌤️  Iniciando actualización de clima y riesgo de plagas...\n');

  // 2a. Obtener todos los lotes de cultivo con sus coordenadas.
  //     En una demo asumimos que los lotes tienen latitud y longitud.
  const { data: lotes, error: errorLotes } = await supabase
    .from('lotes_cultivo')
    .select('id, nombre, latitud, longitud, cultivo');

  if (errorLotes) {
    console.error('❌ Error al leer lotes:', errorLotes.message);
    return;
  }

  if (!lotes || lotes.length === 0) {
    console.warn('⚠️  No se encontraron lotes en la base de datos. Ejecuta primero el seed SQL.');
    return;
  }

  // 2b. Para cada lote, descargar clima y evaluar plagas.
  for (const lote of lotes) {
    console.log(`📡 Procesando lote "${lote.nombre}" (${lote.cultivo})...`);
    await procesarLote(lote);
  }

  console.log('✅ Actualización completada para todos los lotes.');
}

// ------------------------------------------------------------
// 3. Procesar un lote individual
// ------------------------------------------------------------
async function procesarLote(lote) {
  const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // 3a. Construir y llamar a la API de NASA POWER
  //     Parámetros: T2M_MAX, T2M_MIN, RH2M, PRECTOT
  //     Comunidad AG (agrícola)
  const url = `https://power.larc.nasa.gov/api/temporal/daily/point` +
    `?parameters=T2M_MAX,T2M_MIN,RH2M,PRECTOT` +
    `&community=AG` +
    `&longitude=${lote.longitud}&latitude=${lote.latitud}` +
    `&start=${hoy}&end=${hoy}` +
    `&format=JSON`;

  let datosClima;
  try {
    const respuesta = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!respuesta.ok) {
      console.error(`  ↳ NASA API respondió con status ${respuesta.status} para lote ${lote.nombre}`);
      return;
    }
    const json = await respuesta.json();

    // Extraemos los valores. La API devuelve un objeto con -999 para datos faltantes.
    const tmax = json?.properties?.parameter?.T2M_MAX?.[hoy] ?? null;
    const tmin = json?.properties?.parameter?.T2M_MIN?.[hoy] ?? null;
    const humedad = json?.properties?.parameter?.RH2M?.[hoy] ?? null;
    const precipitacion = json?.properties?.parameter?.PRECTOT?.[hoy] ?? null;

    if (tmax === -999 || tmin === -999 || humedad === -999 || precipitacion === -999) {
      console.warn(`  ↳ Datos incompletos para ${lote.nombre}. Se omite.`);
      return;
    }

    datosClima = { tmax, tmin, humedad, precipitacion };
  } catch (error) {
    console.error(`  ↳ Error de red o timeout con NASA POWER: ${error.message}`);
    return;
  }

  // 3b. Calcular días consecutivos sin lluvia a partir del histórico local.
  const diasSecos = await calcularDiasSinLluvia(lote.id);

  // 3c. Obtener el NDVI más reciente (inyectado por 04_ndvi_modis.js)
  const ndviActual = await obtenerNdviActual(lote.id);

  // 3d. Ejecutar el motor de plagas
  const riesgo = calcularRiesgoPlaga({
    tmax: datosClima.tmax,
    tmin: datosClima.tmin,
    humedad: datosClima.humedad,
    precipitacion: datosClima.precipitacion,
    ndvi: ndviActual,
    cultivo: lote.cultivo,
    dias_sin_lluvia: diasSecos,
  });

  // 3e. Upsert en monitoreo_lote (combinación única: lote_id + fecha)
  const { error } = await supabase
    .from('monitoreo_lote')
    .upsert(
      {
        lote_id: lote.id,
        fecha: hoy,
        tmax: datosClima.tmax,
        tmin: datosClima.tmin,
        humedad: datosClima.humedad,
        precipitacion: datosClima.precipitacion,
        ndvi: ndviActual,
        riesgo_plaga: riesgo.nivel_riesgo,
        plaga_probable: riesgo.plaga_probable,
        recomendacion_es: riesgo.recomendacion_es,
        recomendacion_nah: riesgo.recomendacion_nah,
        alerta_plaga: riesgo.alerta_plaga,
      },
      { onConflict: 'lote_id, fecha' } // Requiere restricción UNIQUE(lote_id, fecha)
    );

  if (error) {
    console.error(`  ❌ Error al guardar datos de ${lote.nombre}: ${error.message}`);
  } else {
    console.log(`  ✅ ${lote.nombre}: Tmax=${datosClima.tmax}°C, NDVI=${ndviActual}, Riesgo=${riesgo.nivel_riesgo} (${riesgo.plaga_probable})`);
  }
}

// ------------------------------------------------------------
// 4. Calcular días consecutivos sin lluvia (máx. 10 días).
// ------------------------------------------------------------
async function calcularDiasSinLluvia(loteId) {
  const { data, error } = await supabase
    .from('monitoreo_lote')
    .select('precipitacion, fecha')
    .eq('lote_id', loteId)
    .order('fecha', { ascending: false })
    .limit(10);

  if (error || !data) {
    console.warn('  ↳ No se pudo leer histórico de lluvia, asumiendo 0 días secos.');
    return 0;
  }

  let secos = 0;
  for (const registro of data) {
    if (registro.precipitacion === 0) {
      secos++;
    } else {
      break;
    }
  }
  return secos;
}

// ------------------------------------------------------------
// 5. Obtener el NDVI más reciente (de 04_ndvi_modis.js o real)
// ------------------------------------------------------------
async function obtenerNdviActual(loteId) {
  const { data, error } = await supabase
    .from('monitoreo_lote')
    .select('ndvi')
    .eq('lote_id', loteId)
    .order('fecha', { ascending: false })
    .limit(1)
    .single();

  // Si hay un error o no hay dato, usamos un valor por defecto de 0.5
  if (error || !data) {
    console.warn('  ↳ NDVI no disponible, usando 0.5 por defecto.');
    return 0.5;
  }
  return data.ndvi;
}

// ------------------------------------------------------------
// Arranque del script
// ------------------------------------------------------------
actualizarClimaYPlagas()
  .catch(console.error)
  .finally(() => process.exit(0));#!/usr/bin / env node
// scripts/03_nasa_power.js
// ============================================================
// TLAPIANI - Pipeline de clima NASA POWER + riesgo de plagas
//
// Ejecutar una vez al día (o bajo demanda) para actualizar
// la tabla monitoreo_lote con los datos meteorológicos y
// el cálculo de riesgo fitosanitario.
//
// Orden ideal: primero 04_ndvi_modis.js, luego este script.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { calcularRiesgoPlaga } from './07_plagas.js';

dotenv.config();

// ------------------------------------------------------------
// 1. Inicialización del cliente de Supabase (service role)
//    para poder escribir en la base de datos.
// ------------------------------------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ------------------------------------------------------------
// 2. Función principal: procesa todos los lotes activos.
// ------------------------------------------------------------
async function actualizarClimaYPlagas() {
  console.log('🌤️  Iniciando actualización de clima y riesgo de plagas...\n');

  // 2a. Obtener todos los lotes de cultivo con sus coordenadas.
  //     En una demo asumimos que los lotes tienen latitud y longitud.
  const { data: lotes, error: errorLotes } = await supabase
    .from('lotes_cultivo')
    .select('id, nombre, latitud, longitud, cultivo');

  if (errorLotes) {
    console.error('❌ Error al leer lotes:', errorLotes.message);
    return;
  }

  if (!lotes || lotes.length === 0) {
    console.warn('⚠️  No se encontraron lotes en la base de datos. Ejecuta primero el seed SQL.');
    return;
  }

  // 2b. Para cada lote, descargar clima y evaluar plagas.
  for (const lote of lotes) {
    console.log(`📡 Procesando lote "${lote.nombre}" (${lote.cultivo})...`);
    await procesarLote(lote);
  }

  console.log('✅ Actualización completada para todos los lotes.');
}

// ------------------------------------------------------------
// 3. Procesar un lote individual
// ------------------------------------------------------------
async function procesarLote(lote) {
  const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // 3a. Construir y llamar a la API de NASA POWER
  //     Parámetros: T2M_MAX, T2M_MIN, RH2M, PRECTOT
  //     Comunidad AG (agrícola)
  const url = `https://power.larc.nasa.gov/api/temporal/daily/point` +
    `?parameters=T2M_MAX,T2M_MIN,RH2M,PRECTOT` +
    `&community=AG` +
    `&longitude=${lote.longitud}&latitude=${lote.latitud}` +
    `&start=${hoy}&end=${hoy}` +
    `&format=JSON`;

  let datosClima;
  try {
    const respuesta = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!respuesta.ok) {
      console.error(`  ↳ NASA API respondió con status ${respuesta.status} para lote ${lote.nombre}`);
      return;
    }
    const json = await respuesta.json();

    // Extraemos los valores. La API devuelve un objeto con -999 para datos faltantes.
    const tmax = json?.properties?.parameter?.T2M_MAX?.[hoy] ?? null;
    const tmin = json?.properties?.parameter?.T2M_MIN?.[hoy] ?? null;
    const humedad = json?.properties?.parameter?.RH2M?.[hoy] ?? null;
    const precipitacion = json?.properties?.parameter?.PRECTOT?.[hoy] ?? null;

    if (tmax === -999 || tmin === -999 || humedad === -999 || precipitacion === -999) {
      console.warn(`  ↳ Datos incompletos para ${lote.nombre}. Se omite.`);
      return;
    }

    datosClima = { tmax, tmin, humedad, precipitacion };
  } catch (error) {
    console.error(`  ↳ Error de red o timeout con NASA POWER: ${error.message}`);
    return;
  }

  // 3b. Calcular días consecutivos sin lluvia a partir del histórico local.
  const diasSecos = await calcularDiasSinLluvia(lote.id);

  // 3c. Obtener el NDVI más reciente (inyectado por 04_ndvi_modis.js)
  const ndviActual = await obtenerNdviActual(lote.id);

  // 3d. Ejecutar el motor de plagas
  const riesgo = calcularRiesgoPlaga({
    tmax: datosClima.tmax,
    tmin: datosClima.tmin,
    humedad: datosClima.humedad,
    precipitacion: datosClima.precipitacion,
    ndvi: ndviActual,
    cultivo: lote.cultivo,
    dias_sin_lluvia: diasSecos,
  });

  // 3e. Upsert en monitoreo_lote (combinación única: lote_id + fecha)
  const { error } = await supabase
    .from('monitoreo_lote')
    .upsert(
      {
        lote_id: lote.id,
        fecha: hoy,
        tmax: datosClima.tmax,
        tmin: datosClima.tmin,
        humedad: datosClima.humedad,
        precipitacion: datosClima.precipitacion,
        ndvi: ndviActual,
        riesgo_plaga: riesgo.nivel_riesgo,
        plaga_probable: riesgo.plaga_probable,
        recomendacion_es: riesgo.recomendacion_es,
        recomendacion_nah: riesgo.recomendacion_nah,
        alerta_plaga: riesgo.alerta_plaga,
      },
      { onConflict: 'lote_id, fecha' } // Requiere restricción UNIQUE(lote_id, fecha)
    );

  if (error) {
    console.error(`  ❌ Error al guardar datos de ${lote.nombre}: ${error.message}`);
  } else {
    console.log(`  ✅ ${lote.nombre}: Tmax=${datosClima.tmax}°C, NDVI=${ndviActual}, Riesgo=${riesgo.nivel_riesgo} (${riesgo.plaga_probable})`);
  }
}

// ------------------------------------------------------------
// 4. Calcular días consecutivos sin lluvia (máx. 10 días).
// ------------------------------------------------------------
async function calcularDiasSinLluvia(loteId) {
  const { data, error } = await supabase
    .from('monitoreo_lote')
    .select('precipitacion, fecha')
    .eq('lote_id', loteId)
    .order('fecha', { ascending: false })
    .limit(10);

  if (error || !data) {
    console.warn('  ↳ No se pudo leer histórico de lluvia, asumiendo 0 días secos.');
    return 0;
  }

  let secos = 0;
  for (const registro of data) {
    if (registro.precipitacion === 0) {
      secos++;
    } else {
      break;
    }
  }
  return secos;
}

// ------------------------------------------------------------
// 5. Obtener el NDVI más reciente (de 04_ndvi_modis.js o real)
// ------------------------------------------------------------
async function obtenerNdviActual(loteId) {
  const { data, error } = await supabase
    .from('monitoreo_lote')
    .select('ndvi')
    .eq('lote_id', loteId)
    .order('fecha', { ascending: false })
    .limit(1)
    .single();

  // Si hay un error o no hay dato, usamos un valor por defecto de 0.5
  if (error || !data) {
    console.warn('  ↳ NDVI no disponible, usando 0.5 por defecto.');
    return 0.5;
  }
  return data.ndvi;
}

// ------------------------------------------------------------
// Arranque del script
// ------------------------------------------------------------
actualizarClimaYPlagas()
  .catch(console.error)
  .finally(() => process.exit(0));

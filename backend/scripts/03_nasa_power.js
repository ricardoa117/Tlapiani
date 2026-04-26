// backend/scripts/03_nasa_power.js
// ============================================================
// TLAPIANI - Pipeline COMPLETO: Clima + Plagas + Recomendaciones
// ============================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { calcularRiesgoPlaga } from './07_plagas.js';
import { recomendarCultivo } from './08_recomendador.js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function actualizarClimaYPlagas() {
  console.log('🌤️  Iniciando actualización COMPLETA (Clima + Plagas + Recomendaciones)...\n');

  // JOIN completo: lote → parcela → municipio
  const { data: lotes, error: errorLotes } = await supabase
    .from('lotes_cultivo')
    .select(`
      id, 
      cultivo,
      parcelas(
        nombre, 
        latitud, 
        longitud,
        tipo_suelo,
        ph_suelo,
        municipios(
          nombre,
          precipitacion_anual_mm,
          temperatura_promedio_anual
        )
      )
    `);

  if (errorLotes) {
    console.error('❌ Error al leer lotes:', errorLotes.message);
    return;
  }

  console.log(`📊 Procesando ${lotes.length} lotes...\n`);

  for (const lote of lotes) {
    await procesarLote(lote);
  }

  console.log('\n✅ Actualización completada para todos los lotes.');
}

async function procesarLote(lote) {
  const fechaSegura = '20240420';
  const hoy = new Date().toISOString().slice(0, 10);

  const parcela = lote.parcelas;
  const municipio = parcela?.municipios;

  if (!parcela || !municipio) {
    console.error(`  ❌ Lote ${lote.id}: Sin parcela/municipio`);
    return;
  }

  const { latitud, longitud, tipo_suelo, ph_suelo } = parcela;
  console.log(`📡 ${parcela.nombre} (${lote.cultivo})...`);

  if (!latitud || !longitud) {
    console.error(`  ❌ Sin coordenadas`);
    return;
  }

  // ========== 1. CLIMA NASA POWER ==========
  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,RH2M,PRECTOTCORR&community=AG&longitude=${longitud}&latitude=${latitud}&start=${fechaSegura}&end=${fechaSegura}&format=JSON`;

  let datosClima;
  try {
    const respuesta = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!respuesta.ok) throw new Error('NASA falló');

    const json = await respuesta.json();
    datosClima = {
      tmax: json?.properties?.parameter?.T2M_MAX?.[fechaSegura] ?? 33.5,
      tmin: json?.properties?.parameter?.T2M_MIN?.[fechaSegura] ?? 15.2,
      humedad: json?.properties?.parameter?.RH2M?.[fechaSegura] ?? 45.0,
      precipitacion: json?.properties?.parameter?.PRECTOTCORR?.[fechaSegura] ?? 0
    };
  } catch {
    console.warn(`  ⚠️ NASA falló, usando simulados`);
    datosClima = { tmax: 33.5, tmin: 15.2, humedad: 45.0, precipitacion: 0 };
  }

  // ========== 2. RIESGO DE PLAGAS ==========
  const ndviActual = await obtenerNdviActual(lote.id);
  const diasSecos = datosClima.precipitacion === 0 ? 6 : 0;

  const riesgo = calcularRiesgoPlaga({
    tmax: datosClima.tmax,
    tmin: datosClima.tmin,
    humedad: datosClima.humedad,
    precipitacion: datosClima.precipitacion,
    ndvi: ndviActual,
    cultivo: lote.cultivo,
    dias_sin_lluvia: diasSecos,
  });

  const estadoSemaforo = riesgo.nivel_riesgo === 'alto' ? 'rojo' :
    riesgo.nivel_riesgo === 'medio' ? 'amarillo' : 'verde';

  // ========== 3. GUARDAR MONITOREO ==========
  const { error } = await supabase.from('monitoreo_lote').upsert({
    lote_id: lote.id,
    fecha: hoy,
    temperatura_max: datosClima.tmax,
    temperatura_min: datosClima.tmin,
    humedad_relativa: datosClima.humedad,
    precipitacion: datosClima.precipitacion,
    ndvi: ndviActual,
    recomendacion_texto_es: riesgo.recomendacion_es,
    recomendacion_texto_nah: riesgo.recomendacion_nah,
    estado_semaforo: estadoSemaforo,
    alerta_plaga: riesgo.alerta_plaga,
    plaga_probable: riesgo.plaga_probable
  }, { onConflict: 'lote_id, fecha' });

  if (error) {
    console.error(`  ❌ Error BD: ${error.message}`);
  } else {
    console.log(`  ✅ T=${datosClima.tmax}°C | ${riesgo.plaga_probable}`);
  }

  // ========== 4. RECOMENDACIÓN DE CULTIVO (NUEVO) ==========
  const paramsReco = {
    tmax: municipio.temperatura_promedio_anual + 5,
    tmin: municipio.temperatura_promedio_anual - 5,
    precipitacion_anual: municipio.precipitacion_anual_mm,
    ph_suelo: ph_suelo || 6.5,
    tipo_suelo: tipo_suelo || 'franco',
  };

  try {
    const recomendacion = recomendarCultivo(paramsReco);

    // Extraer rendimiento numérico (ej: "2.5 toneladas" → 2.5)
    const rendimientoNum = parseFloat(recomendacion.economia.rendimiento_ha);
    const gananciaEstimada = rendimientoNum * recomendacion.economia.precio_estimado_ton;

    await supabase.from('recomendaciones_lote').upsert({
      lote_id: lote.id,
      cultivo_sugerido: recomendacion.cultivo_ideal,
      compatibilidad_porcentaje: parseInt(recomendacion.compatibilidad),
      ganancia_estimada_ha: gananciaEstimada,
      rendimiento_ha: recomendacion.economia.rendimiento_ha,
      precio_ton_mxn: recomendacion.economia.precio_estimado_ton,
      demanda: recomendacion.economia.demanda,
      razon_tecnica: recomendacion.razon,
      ventaja_puebla: recomendacion.economia.ventaja_puebla,
      fecha_generacion: hoy
    }, { onConflict: 'lote_id' });

    console.log(`  💡 Recomendación: ${recomendacion.cultivo_ideal} (${recomendacion.compatibilidad})`);
  } catch (err) {
    console.warn(`  ⚠️ Recomendación falló: ${err.message}`);
  }
}

async function obtenerNdviActual(loteId) {
  const { data } = await supabase
    .from('monitoreo_lote')
    .select('ndvi')
    .eq('lote_id', loteId)
    .order('fecha', { ascending: false })
    .limit(1)
    .single();
  return data?.ndvi || 0.5;
}

actualizarClimaYPlagas()
  .catch(console.error)
  .finally(() => process.exit(0));

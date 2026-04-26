// src/lib/nasaUpdater.ts
import { supabase } from './supabase';
import { calcularRiesgoPlaga } from './motorPlagas';
import { recomendarCultivo } from './motorRecomendacion';

export async function actualizarDatosProductor(productorId: string) {
    try {
        console.log(`[NASA Updater] Iniciando actualización para productor ${productorId}`);
        const hoy = new Date().toISOString().slice(0, 10);
        const fechaSegura = '20240420'; // Usado para data histórica/mock en demo

        // 1. Obtener lotes del productor
        const { data: parcelas, error: errorParcelas } = await supabase
            .from('parcelas')
            .select(`
                nombre, 
                latitud, 
                longitud,
                tipo_suelo,
                ph_suelo,
                municipios(nombre, precipitacion_anual_mm, temperatura_promedio_anual),
                lotes_cultivo(id, cultivo)
            `)
            .eq('productor_id', productorId);

        if (errorParcelas || !parcelas) return;

        for (const parcela of parcelas) {
            const municipio = parcela.municipios as any;
            if (!municipio) continue;

            // 2. Fetch de datos climáticos (NASA)
            let datosClima = { tmax: 33.5, tmin: 15.2, humedad: 45.0, precipitacion: 0 };
            
            if (parcela.latitud && parcela.longitud) {
                const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,RH2M,PRECTOTCORR&community=AG&longitude=${parcela.longitud}&latitude=${parcela.latitud}&start=${fechaSegura}&end=${fechaSegura}&format=JSON`;
                try {
                    const res = await fetch(url);
                    if (res.ok) {
                        const json = await res.json();
                        datosClima = {
                            tmax: json?.properties?.parameter?.T2M_MAX?.[fechaSegura] ?? datosClima.tmax,
                            tmin: json?.properties?.parameter?.T2M_MIN?.[fechaSegura] ?? datosClima.tmin,
                            humedad: json?.properties?.parameter?.RH2M?.[fechaSegura] ?? datosClima.humedad,
                            precipitacion: json?.properties?.parameter?.PRECTOTCORR?.[fechaSegura] ?? datosClima.precipitacion
                        };
                    }
                } catch (e) {
                    console.warn('[NASA Updater] Fallo API, usando fallback:', e);
                }
            }

            // Para simular datos nuevos de NDVI de una forma dinámica:
            // Math.random entre 0.4 y 0.8
            const ndviActual = parseFloat((Math.random() * 0.4 + 0.4).toFixed(2));
            const diasSecos = datosClima.precipitacion === 0 ? 6 : 0;

            for (const lote of parcela.lotes_cultivo || []) {
                // Riesgo Plaga
                const riesgo = calcularRiesgoPlaga({
                    tmax: datosClima.tmax,
                    tmin: datosClima.tmin,
                    humedad: datosClima.humedad,
                    precipitacion: datosClima.precipitacion,
                    ndvi: ndviActual,
                    cultivo: lote.cultivo,
                    dias_sin_lluvia: diasSecos,
                });

                const estadoSemaforo = riesgo.nivel_riesgo === 'alto' ? 'rojo' : riesgo.nivel_riesgo === 'medio' ? 'amarillo' : 'verde';

                // UPSERT Monitoreo
                await supabase.from('monitoreo_lote').upsert({
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

                // UPSERT Recomendaciones
                const paramsReco = {
                    tmax: municipio.temperatura_promedio_anual + 5,
                    tmin: municipio.temperatura_promedio_anual - 5,
                    precipitacion_anual: municipio.precipitacion_anual_mm,
                    ph_suelo: parcela.ph_suelo || 6.5,
                    tipo_suelo: parcela.tipo_suelo || 'franco',
                };

                try {
                    const recomendacion = recomendarCultivo(paramsReco);
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
                } catch (e) {
                    console.error('[NASA Updater] Error generando recomendación:', e);
                }
            }
        }
        console.log(`[NASA Updater] Listo para ${productorId}`);
    } catch (err) {
        console.error('[NASA Updater] Error global:', err);
    }
}

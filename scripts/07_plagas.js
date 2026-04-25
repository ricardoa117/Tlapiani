// scripts/07_plagas.js
// ============================================================
// TLAPIANI - Motor de riesgo de plagas por umbrales estrictos
//
// Este módulo exporta la función calcularRiesgoPlaga(params).
// Es **puro**: no accede a bases de datos ni a APIs externas.
// Solo aplica las reglas fitosanitarias que definiste.
// ============================================================

/**
 * Evalúa el riesgo de plaga a partir de condiciones meteorológicas y de cultivo.
 *
 * @param {Object} p
 * @param {number} p.tmax           - Temperatura máxima (°C)
 * @param {number} p.tmin           - Temperatura mínima (°C)
 * @param {number} p.humedad        - Humedad relativa (%)
 * @param {number} p.precipitacion  - Lluvia reciente (mm)
 * @param {number} p.ndvi           - NDVI actual (0-1)
 * @param {string} p.cultivo        - Nombre del cultivo (maíz, frijol, aguacate, café, calabaza, hortalizas)
 * @param {number} p.dias_sin_lluvia- Días consecutivos sin precipitación > 0
 *
 * @returns {{ nivel_riesgo: 'alto'|'bajo', plaga_probable: string, recomendacion_es: string, recomendacion_nah: string, alerta_plaga: boolean }}
 */
export function calcularRiesgoPlaga({
    tmax,
    tmin,
    humedad,
    precipitacion,
    ndvi,
    cultivo,
    dias_sin_lluvia,
}) {
    // Temperatura promedio para comparar contra los rangos (15-30 según la plaga)
    const tavg = (tmax + tmin) / 2;

    // Simulación de "NDVI cayendo": en la demo, asumimos que valores < 0.5 indican estrés.
    // En producción medirías la tendencia con varios días de NDVI.
    const ndviCayendo = ndvi < 0.5;

    // Definimos las plagas con sus condiciones exactas y mensajes en español y náhuatl
    const plagas = [
        {
            nombre: 'Gusano Cogollero',
            cultivos: ['maíz', 'frijol'],
            condicion: () =>
                cultivos.includes(cultivo) &&
                tavg >= 25 && tavg <= 30 &&
                humedad > 70 &&
                dias_sin_lluvia > 5,
            reco_es: 'Aplicar extracto de neem o liberar Trichogramma. Monitorear base del tallo.',
            reco_nah: 'Xikintlalili neem zo xikintlalti Trichogramma. Xikita in tallo.',
        },
        {
            nombre: 'Roya',
            cultivos: ['aguacate', 'café'],
            condicion: () =>
                cultivos.includes(cultivo) &&
                tavg >= 15 && tavg <= 25 &&
                humedad > 80 &&
                precipitacion > 0,
            reco_es: 'Podar partes afectadas y aplicar fungicida cúprico. Mejorar drenaje.',
            reco_nah: 'Xikinkotona hojas enfermas wan xikintlalili cobre. Xikchihua drenaje.',
        },
        {
            nombre: 'Trips',
            cultivos: ['calabaza', 'frijol', 'hortalizas'],
            condicion: () =>
                cultivos.includes(cultivo) &&
                tmax > 28 &&
                humedad < 50 &&
                ndviCayendo,
            reco_es: 'Colocar trampas azules, usar jabón potásico o aceite de nim. Eliminar maleza.',
            reco_nah: 'Xikintlali trampas azul, xikintlalili jabón potásico o aceite de nim. Xikinkixitili maleza.',
        },
    ];

    // Buscamos la primera plaga que cumpla **todas** sus condiciones
    const plagaActiva = plagas.find((p) => p.condicion());

    // Si encontramos plaga → riesgo alto, si no → bajo
    if (plagaActiva) {
        return {
            nivel_riesgo: 'alto',
            plaga_probable: plagaActiva.nombre,
            recomendacion_es: plagaActiva.reco_es,
            recomendacion_nah: plagaActiva.reco_nah,
            alerta_plaga: true,
        };
    }

    return {
        nivel_riesgo: 'bajo',
        plaga_probable: 'Ninguna',
        recomendacion_es: 'Condiciones normales. Continuar monitoreo semanal.',
        recomendacion_nah: 'Kuali. Xikontinuaro monitoreo cada semana.',
        alerta_plaga: false,
    };
}
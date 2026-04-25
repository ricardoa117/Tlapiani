// scripts/07_plagas.js
// ============================================================
// TLAPIANI - Motor de Resiliencia Climática (Desastres + Plagas)
// ============================================================

export function calcularRiesgoPlaga({
    tmax,
    tmin,
    humedad,
    precipitacion,
    ndvi,
    cultivo,
    dias_sin_lluvia,
}) {
    const tavg = (tmax + tmin) / 2;
    const ndviCayendo = ndvi < 0.5;
    // Aseguramos que cultivo sea un string en minúsculas y exista
    const cultivoActual = cultivo ? cultivo.toLowerCase() : '';

    // ==========================================================
    // NIVEL 1: DESASTRES NATURALES (Prioridad Absoluta)
    // ==========================================================
    if (tmin < 4) {
        return {
            nivel_riesgo: 'alto',
            plaga_probable: 'Alerta de Helada', // Usamos este campo para el nombre del desastre
            recomendacion_es: '¡Peligro de helada! Cubrir cultivos o encender fogatas de protección térmica.',
            recomendacion_nah: '¡Amo kuali tlaceceya! Xikpikika motlayol zo xiktlatika tletl.',
            alerta_plaga: true, // Lo mantenemos en true para que el dashboard lo pinte de rojo
        };
    }

    if (precipitacion > 50) {
        return {
            nivel_riesgo: 'alto',
            plaga_probable: 'Alerta de Inundación',
            recomendacion_es: 'Lluvias torrenciales inminentes. Desazolve canales y resguarde animales.',
            recomendacion_nah: 'Miyak kiawitl witz. Xiktatati apantli wan xikmokwitlawi moyolkawan.',
            alerta_plaga: true,
        };
    }

    if (dias_sin_lluvia > 15 && tmax > 32) {
        return {
            nivel_riesgo: 'alto',
            plaga_probable: 'Sequía Severa',
            recomendacion_es: 'Sequía extrema. Aplique riego de auxilio solo en raíces.',
            recomendacion_nah: 'Wakki tlalmantli. Xiktlali atl san itzintlan motlayol.',
            alerta_plaga: true,
        };
    }

    // ==========================================================
    // NIVEL 2: PLAGAS (Si el clima no es extremo, buscamos plagas)
    // ==========================================================
    const plagas = [
        {
            nombre: 'Gusano Cogollero',
            cultivos: ['maíz', 'frijol', 'maiz'],
            condicion: () =>
                plagas[0].cultivos.includes(cultivoActual) &&
                tavg >= 25 && tavg <= 30 &&
                humedad > 70 &&
                dias_sin_lluvia > 5,
            reco_es: 'Aplicar extracto de neem o liberar Trichogramma. Monitorear base del tallo.',
            reco_nah: 'Xikintlalili neem zo xikintlalti Trichogramma. Xikita in tallo.',
        },
        {
            nombre: 'Roya',
            cultivos: ['aguacate', 'café', 'cafe'],
            condicion: () =>
                plagas[1].cultivos.includes(cultivoActual) &&
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
                plagas[2].cultivos.includes(cultivoActual) &&
                tmax > 28 &&
                humedad < 50 &&
                ndviCayendo,
            reco_es: 'Colocar trampas azules, usar jabón potásico o aceite de nim. Eliminar maleza.',
            reco_nah: 'Xikintlali trampas azul, xikintlalili jabón potásico o aceite de nim. Xikinkixitili maleza.',
        },
    ];

    const plagaActiva = plagas.find((p) => p.condicion());

    if (plagaActiva) {
        return {
            nivel_riesgo: 'alto',
            plaga_probable: plagaActiva.nombre,
            recomendacion_es: plagaActiva.reco_es,
            recomendacion_nah: plagaActiva.reco_nah,
            alerta_plaga: true,
        };
    }

    // ==========================================================
    // NIVEL 3: CONDICIONES NORMALES
    // ==========================================================
    return {
        nivel_riesgo: 'bajo',
        plaga_probable: 'Ninguna',
        recomendacion_es: 'Condiciones normales. Continuar monitoreo.',
        recomendacion_nah: 'Kuali. Xikontinuaro monitoreo.',
        alerta_plaga: false,
    };
}
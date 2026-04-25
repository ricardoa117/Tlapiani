// scripts/08_recomendador.js
// ============================================================
// TLAPIANI - Motor Experto de Recomendación y Rentabilidad
// ============================================================

/**
 * Calcula el cultivo ideal y su proyección económica
 * @param {Object} params - Datos de clima y suelo
 */
export function recomendarCultivo({ tmax, tmin, precipitacion_anual, ph_suelo, tipo_suelo }) {
    const tavg = (tmax + tmin) / 2;
    const suelo = tipo_suelo ? tipo_suelo.toLowerCase() : 'franco';
    const ph = parseFloat(ph_suelo) || 6.5;

    // 1. LÓGICA PARA CAFÉ (Sierra Norte / Teziutlán / Zacatlán)
    if (tavg >= 16 && tavg <= 23 && ph >= 4.5 && ph <= 6.0 && precipitacion_anual > 1000) {
        return {
            cultivo_ideal: 'Café de Especialidad',
            compatibilidad: '95%',
            razon: 'Clima templado-húmedo y suelo ácido ideal para granos de altura.',
            economia: {
                rendimiento_ha: '2.5 toneladas',
                precio_estimado_ton: 14500,
                demanda: 'Alta (Exportación)',
                ventaja_puebla: 'Puebla es 3er productor nacional; gran oportunidad en tostado artesanal.',
                color_id: 'coffee'
            }
        };
    }

    // 2. LÓGICA PARA AGUACATE (Atlixco / Valles Centrales)
    if (tmin > 5 && tmax < 31 && ph >= 6.0 && ph <= 7.5 && (suelo === 'franco' || suelo === 'arenoso')) {
        return {
            cultivo_ideal: 'Aguacate Hass',
            compatibilidad: '88%',
            razon: 'Suelo con buen drenaje y ausencia de heladas críticas.',
            economia: {
                rendimiento_ha: '10 toneladas',
                precio_estimado_ton: 22000,
                demanda: 'Muy Alta (Nacional/EE.UU.)',
                ventaja_puebla: 'Crecimiento exponencial en exportación desde Atlixco.',
                color_id: 'green'
            }
        };
    }

    // 3. LÓGICA PARA MAÍZ (Todo el estado / Resiliencia)
    if (tavg >= 20 && tavg <= 30 && ph >= 5.5 && ph <= 7.8) {
        return {
            cultivo_ideal: 'Maíz Nativo (Azul/Rojo)',
            compatibilidad: '92%',
            razon: 'Suelo con retención de humedad y temperatura óptima para variedades locales.',
            economia: {
                rendimiento_ha: '3.8 toneladas',
                precio_estimado_ton: 8500,
                demanda: 'Alta (Gastronomía Gourmet)',
                ventaja_puebla: 'Gran valor agregado en mercados de especialidad y nixtamalización.',
                color_id: 'yellow'
            }
        };
    }

    // 4. LÓGICA PARA NOPAL (Mixteca / Tehuacán / Zonas Secas)
    return {
        cultivo_ideal: 'Nopal Forrajero / Verdura',
        compatibilidad: '98%',
        razon: 'Máxima resistencia a sequía y suelos alcalinos/pobres.',
        economia: {
            rendimiento_ha: '55 toneladas',
            precio_estimado_ton: 1200,
            demanda: 'Estable (Ganadería y Alimento)',
            ventaja_puebla: 'Bajo costo de mantenimiento y alta resiliencia ante el cambio climático.',
            color_id: 'darkgreen'
        }
    };
}
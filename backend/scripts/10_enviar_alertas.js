// backend/scripts/10_enviar_alertas.js
// ============================================================
// TLAPIANI - Envío automático de alertas por WhatsApp/SMS
// ============================================================
// Ejecutar diariamente (cron) o manualmente después de 03_nasa_power.js
// Requiere: npm install twilio en el backend
// ============================================================

import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// Mensajes multilingües
const MENSAJES = {
    alerta_plaga_alta: {
        es: (plaga, cultivo, folio) =>
            `🚨 ALERTA TLAPIANI\n\nRiesgo ALTO de ${plaga} en tu ${cultivo}.\n\nRevisa tu parcela HOY.\n\nFolio: ${folio}`,
        nah: (plaga, cultivo, folio) =>
            `🚨 TLAPIANI\n\nChikauak ${plaga} itech mo${cultivo}.\n\nXimotatati axan.\n\nFolio: ${folio}`
    },
    evento_climatico: {
        es: (evento, recomendacion, folio) =>
            `⚠️ TLAPIANI - ${evento}\n\n${recomendacion}\n\nFolio: ${folio}`,
        nah: (evento, recomendacion, folio) =>
            `⚠️ TLAPIANI\n\n${evento}\n${recomendacion}\n\nFolio: ${folio}`
    },
    riego_urgente: {
        es: (cultivo, folio) =>
            `💧 TLAPIANI\n\nTu ${cultivo} necesita riego HOY.\n\nFolio: ${folio}`,
        nah: (cultivo, folio) =>
            `💧 TLAPIANI\n\nMo${cultivo} axan xaltetili.\n\nFolio: ${folio}`
    }
};

async function enviarAlertas() {
    console.log('📱 Iniciando envío de alertas...\n');

    const hoy = new Date().toISOString().split('T')[0];

    // 1. Obtener alertas activas con JOIN completo
    const { data: alertas, error } = await supabase
        .from('monitoreo_lote')
        .select(`
      id,
      alerta_plaga,
      plaga_probable,
      estado_semaforo,
      recomendacion_texto_es,
      recomendacion_texto_nah,
      lotes_cultivo (
        cultivo,
        parcelas (
          productores (
            id, folio, nombre, telefono, 
            idioma_preferido, tipo_acceso, activo
          )
        )
      )
    `)
        .eq('fecha', hoy)
        .or('alerta_plaga.eq.true,estado_semaforo.eq.rojo');

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    if (!alertas || alertas.length === 0) {
        console.log('✅ No hay alertas activas.');
        return;
    }

    console.log(`📊 ${alertas.length} alerta(s) encontradas.\n`);

    // 2. Agrupar por productor
    const alertasPorProductor = new Map();

    for (const alerta of alertas) {
        const productor = alerta.lotes_cultivo?.parcelas?.productores;
        if (!productor?.activo || !productor?.telefono) continue;
        if (productor.tipo_acceso === 'sin_celular') continue;

        if (!alertasPorProductor.has(productor.id)) {
            alertasPorProductor.set(productor.id, {
                productor,
                alertas: []
            });
        }

        alertasPorProductor.get(productor.id).alertas.push({
            cultivo: alerta.lotes_cultivo.cultivo,
            plaga: alerta.plaga_probable,
            semaforo: alerta.estado_semaforo,
            recomendacion_es: alerta.recomendacion_texto_es,
            recomendacion_nah: alerta.recomendacion_texto_nah
        });
    }

    // 3. Enviar mensajes
    for (const [_, datos] of alertasPorProductor) {
        await enviarMensaje(datos.productor, datos.alertas);
    }

    console.log('\n✅ Envío completado.');
}

async function enviarMensaje(productor, alertas) {
    const idioma = productor.idioma_preferido || 'es';
    const alerta = alertas[0]; // Tomar la más urgente

    let mensaje = '';

    // Determinar tipo de alerta
    if (alerta.plaga && alerta.plaga !== 'Ninguna') {
        const es_evento = ['Alerta de Helada', 'Alerta de Inundación', 'Sequía Severa'].includes(alerta.plaga);

        if (es_evento) {
            // Evento climático extremo
            const reco = idioma === 'es' ? alerta.recomendacion_es : alerta.recomendacion_nah;
            mensaje = MENSAJES.evento_climatico[idioma](alerta.plaga, reco, productor.folio);
        } else {
            // Plaga
            mensaje = MENSAJES.alerta_plaga_alta[idioma](alerta.plaga, alerta.cultivo, productor.folio);
        }
    } else if (alerta.semaforo === 'rojo') {
        // Riego urgente
        mensaje = MENSAJES.riego_urgente[idioma](alerta.cultivo, productor.folio);
    }

    if (!mensaje) return;

    try {
        const esWhatsApp = productor.tipo_acceso === 'smartphone';

        await twilioClient.messages.create({
            body: mensaje,
            from: esWhatsApp ? `whatsapp:${process.env.TWILIO_PHONE_NUMBER}` : process.env.TWILIO_PHONE_NUMBER,
            to: esWhatsApp ? `whatsapp:${productor.telefono}` : productor.telefono
        });

        console.log(`✅ ${esWhatsApp ? 'WhatsApp' : 'SMS'} → ${productor.nombre}`);

        await new Promise(r => setTimeout(r, 500)); // Rate limit
    } catch (err) {
        console.error(`❌ Error → ${productor.nombre}:`, err.message);
    }
}

enviarAlertas()
    .catch(console.error)
    .finally(() => process.exit(0));

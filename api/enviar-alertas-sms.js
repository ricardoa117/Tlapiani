// api/enviar-alertas-sms.js
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

export default async function handler(req, res) {
    // Seguridad: solo aceptar si el secret coincide
    const secret = req.query.secret;
    if (secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const hoy = new Date().toISOString().split('T')[0];

    // Obtener alertas del día
    const { data: alertas, error } = await supabase
        .from('monitoreo_lote')
        .select(`
            id, alerta_plaga, plaga_probable, estado_semaforo,
            recomendacion_texto_es,
            lotes_cultivo (
                cultivo,
                parcelas (
                    productores (
                        id, folio, nombre, telefono, tipo_acceso, activo
                    )
                )
            )
        `)
        .eq('fecha', hoy)
        .or('alerta_plaga.eq.true,estado_semaforo.eq.rojo');

    if (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }

    if (!alertas || alertas.length === 0) {
        return res.status(200).json({ message: 'No hay alertas hoy' });
    }

    let enviados = 0;
    for (const alerta of alertas) {
        const productor = alerta.lotes_cultivo?.parcelas?.productores;
        if (!productor?.activo || !productor?.telefono || productor.tipo_acceso === 'sin_celular') continue;

        let mensaje = '';
        if (alerta.alerta_plaga) {
            mensaje = `⚠️ TLAPIANI ALERTA\nRiesgo de ${alerta.plaga_probable} en ${alerta.lotes_cultivo.cultivo}.\nFolio: ${productor.folio}`;
        } else if (alerta.estado_semaforo === 'rojo') {
            mensaje = `💧 TLAPIANI\n${alerta.lotes_cultivo.cultivo} necesita riego urgente.\nFolio: ${productor.folio}`;
        }

        if (mensaje) {
            try {
                await twilioClient.messages.create({
                    body: mensaje,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: productor.telefono
                });
                enviados++;
                await new Promise(r => setTimeout(r, 500)); // pausa
            } catch (err) {
                console.error(`Error con ${productor.telefono}:`, err.message);
            }
        }
    }

    res.status(200).json({ enviados });
}
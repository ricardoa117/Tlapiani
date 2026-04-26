import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function simularAlerta() {
    console.log('🔍 Buscando productor con folio TLP-MOFA0PC3 (Ricardo)...');

    // 1. Obtener productor
    const { data: prod, error: errProd } = await supabase
        .from('productores')
        .select('id, nombre')
        .eq('folio', 'TLP-MOFA0PC3')
        .single();

    if (errProd || !prod) {
        console.error('❌ Error buscando productor:', errProd?.message || 'No encontrado');
        return;
    }

    console.log(`✅ Productor encontrado: ${prod.nombre} (ID: ${prod.id})`);

    // 2. Obtener su parcela y lote
    let { data: parcelas, error: errPar } = await supabase
        .from('parcelas')
        .select('id, lotes_cultivo(id, cultivo)')
        .eq('productor_id', prod.id);

    let lote = parcelas?.[0]?.lotes_cultivo?.[0];

    if (!lote) {
        console.log('⚠️ El productor no tiene parcela/lote. Creando datos de prueba...');
        
        const { data: nuevaParcela, error: errInsPar } = await supabase
            .from('parcelas')
            .insert({
                productor_id: prod.id,
                nombre: 'Parcela Demostración',
                latitud: 19.0414,
                longitud: -98.2063,
                hectareas: 2,
                tipo_suelo: 'franco',
                ph_suelo: 6.5
            })
            .select()
            .single();
            
        if (errInsPar) return console.error('Error creando parcela:', errInsPar.message);

        const { data: nuevoLote, error: errInsLote } = await supabase
            .from('lotes_cultivo')
            .insert({
                parcela_id: nuevaParcela.id,
                cultivo: 'maíz',
                hectareas: 2,
                etapa_fenologica: 'floracion'
            })
            .select()
            .single();
            
        if (errInsLote) return console.error('Error creando lote:', errInsLote.message);
        
        lote = nuevoLote;
    }

    console.log(`✅ Lote encontrado/creado: ${lote.cultivo} (ID: ${lote.id})`);

    // 3. Sobrescribir el monitoreo de HOY para que esté en ROJO y con PLAGA
    const hoy = new Date().toISOString().split('T')[0];

    console.log(`⚠️ Forzando alerta roja para la fecha de hoy (${hoy})...`);

    const { error: errMon } = await supabase
        .from('monitoreo_lote')
        .upsert({
            lote_id: lote.id,
            fecha: hoy,
            temperatura_max: 38.5, // Calor extremo
            temperatura_min: 15,
            humedad_relativa: 25,
            precipitacion: 0,
            ndvi: 0.25, // Planta muriendo
            recomendacion_texto_es: 'Riesgo crítico por sequía y calor. Aplicar riego de auxilio inmediatamente y revisar el envés de las hojas por posible plaga.',
            recomendacion_texto_nah: 'Chikauak tonal. Xaltetili axan uan xikita moxochiou.',
            estado_semaforo: 'rojo',
            alerta_plaga: true,
            plaga_probable: 'Sequía Severa'
        }, { onConflict: 'lote_id, fecha' });

    if (errMon) {
        console.error('❌ Error guardando la alerta simulada:', errMon.message);
        return;
    }

    console.log('\n🔥 ¡SIMULACIÓN EXITOSA! 🔥');
    console.log('Se ha inyectado una alerta de Sequía Severa y Semáforo Rojo en la base de datos.');
    console.log('👉 Ahora puedes ejecutar el script de alertas y se enviará el mensaje.');
}

simularAlerta()
    .catch(console.error)
    .finally(() => process.exit(0));

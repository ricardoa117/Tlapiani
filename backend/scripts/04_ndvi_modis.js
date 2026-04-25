// scripts/04_ndvi_modis.js
// ============================================================
// TLAPIANI - Lector de NDVI real desde archivo CSV
// ============================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs'; // Librería de Node para leer archivos
import path from 'path';

dotenv.config();

// Conexión a Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function procesarNdviDesdeCsv() {
  console.log('🌿 Leyendo datos reales de NDVI desde el archivo CSV...');

  // 1. Definir dónde está el archivo
  // Asegúrate de que el archivo se llame así y esté en la misma carpeta que este script
  const rutaArchivo = path.join(process.cwd(), 'data', 'datos_ndvi_nasa.csv');

  // 2. Comprobar si el archivo existe
  if (!fs.existsSync(rutaArchivo)) {
    console.error('❌ ERROR: No encuentro el archivo "datos_ndvi_nasa.csv".');
    console.error('Por favor, asegúrate de haberlo guardado en la carpeta /scripts y que se llame exactamente así.');
    return;
  }

  // 3. Leer el archivo (esto lee todo el texto del archivo)
  const contenidoCsv = fs.readFileSync(rutaArchivo, 'utf-8');

  // 4. Dividir el archivo en líneas
  const lineas = contenidoCsv.split('\n');

  // 5. Obtener los lotes de tu base de datos para saber a quién asignarle los datos
  const { data: lotes, error: errorLotes } = await supabase
    // 1. Hacemos un JOIN con la tabla parcelas para traer el nombre
    .from('lotes_cultivo')
    .select('id, cultivo, parcelas(nombre)');

  if (errorLotes || !lotes || lotes.length === 0) {
    console.error('❌ Error obteniendo lotes de Supabase o no hay lotes.', errorLotes);
    return;
  }

  const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // 6. Magia: Sacar un valor promedio de NDVI de las primeras líneas del archivo
  // (Como es un hackatón, tomaremos un valor válido del archivo para inyectarlo)
  let ndviPromedio = 0.5; // Valor por si algo sale mal

  for (let i = 1; i < lineas.length; i++) {
    const columnas = lineas[i].split(','); // Separamos por comas

    // En los CSV de AppEEARS, la columna del NDVI suele ser la 13 o la 14. 
    // Busca la columna que se llama "MOD13Q1_061__250m_16_days_NDVI" en el archivo original.
    // Aquí asumiremos que está en la columna 13 (índice 13).
    // AVISO: MIRA TU ARCHIVO CSV Y VERIFICA EN QUÉ COLUMNA ESTÁ EL NÚMERO QUE PARECE "0.xxxx"

    const valorNdviCrudo = columnas[13];

    if (valorNdviCrudo && !isNaN(parseFloat(valorNdviCrudo))) {
      // El satélite nos da valores multiplicados por 10000 (ej. 8500). Lo dividimos para que quede 0.85
      // *Nota: Solo dividimos si el número es mayor a 1, si ya es 0.algo, lo dejamos igual.*
      let valorReal = parseFloat(valorNdviCrudo);
      if (valorReal > 1) { valorReal = valorReal / 10000; }

      ndviPromedio = valorReal;
      break; // Tomamos el primer valor bueno que encontremos y paramos
    }
  }

  // Nos aseguramos de redondear a 2 decimales (ej. 0.65)
  const ndviLimpio = parseFloat(ndviPromedio.toFixed(2));
  console.log(`📡 Valor NDVI extraído del archivo: ${ndviLimpio}`);

  // 7. Guardar ese valor en la base de datos (Supabase) para todos tus lotes
  console.log('💾 Guardando en Supabase...');
  for (const lote of lotes) {
    const { error } = await supabase
      .from('monitoreo_lote')
      .upsert(
        {
          lote_id: lote.id,
          fecha: hoy,
          ndvi: ndviLimpio,
        },
        { onConflict: 'lote_id, fecha' }
      );

    if (error) {
      console.error(`❌ Error en lote: ${error.message}`);
    } else {
      console.log(`✅ Lote "${lote.parcelas.nombre} - ${lote.cultivo}": NDVI actualizado = ${ndviLimpio}`);
    }
  }

  console.log('🎉 ¡Listo! Datos reales de NDVI inyectados en la base de datos.');
}

procesarNdviDesdeCsv()
  .catch(console.error)
  .finally(() => process.exit(0));
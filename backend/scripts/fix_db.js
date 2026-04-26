import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'C:/Users/calcifer/Documents/Tlapiani/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
    // Teziutlán (ID: 6)
    await supabase.from('zonas_restauracion').update({ municipio_id: 6 }).ilike('nombre', '%teziutlán%');
    
    // Zacatlán (ID: 7)
    await supabase.from('zonas_restauracion').update({ municipio_id: 7 }).ilike('nombre', '%zacatlán%');
    await supabase.from('zonas_restauracion').update({ municipio_id: 7 }).ilike('nombre', '%sierra norte%');

    // Tehuacán (ID: 1)
    await supabase.from('zonas_restauracion').update({ municipio_id: 1 }).ilike('nombre', '%tehuacán%');
    
    // Atlixco (ID: 2)
    await supabase.from('zonas_restauracion').update({ municipio_id: 2 }).ilike('nombre', '%atlixco%');

    console.log('Done fixing municipio_ids in zonas_restauracion');
}
fix();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'C:/Users/calcifer/Documents/Tlapiani/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: zonas, error } = await supabase.from('zonas_restauracion').select('id, nombre, municipio_id');
    console.log('Zonas:', zonas);
    if (error) console.error('Error:', error);
    
    const { data: admins } = await supabase.from('productores').select('folio, nombre, municipio_id').eq('rol', 'admin');
    console.log('Admins:', admins);
}
check();

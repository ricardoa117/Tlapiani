import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'C:/Users/calcifer/Documents/Tlapiani/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: muns } = await supabase.from('municipios').select('id, nombre').order('id');
    console.log('Municipios:', muns);
}
check();

import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

// Creamos y exportamos el cliente para usarlo en toda la app
export const supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);

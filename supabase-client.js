
// ⚠️ IMPORTANTE: REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO DE SUPABASE
const SUPABASE_URL = 'https://zqdkmdzmxxeuqvexgnmh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JluNOsSSc1WZU5-V-KTfYA_bqvq5QOO';

// Inicializar cliente
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Exportar para usar en otros archivos (si usáramos módulos, pero aquí lo haremos global)
window.supabaseClient = client;
window.SUPABASE_CONFIGURED = true;

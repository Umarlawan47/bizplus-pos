// BizPlus Supabase configuration.
// Add your own Supabase Project URL and Publishable (anon) Key before deployment.
const SUPABASE_URL = "https://elucugeqdcaspbhstqxs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_p0nmxxGraGY8cZA-2-Md-g_h-8iH9De";

const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

const supabaseClient = supabaseConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

window.BizPlus = {
  supabase: supabaseClient,
  configured: supabaseConfigured
};
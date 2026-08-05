// Public project URL + publishable key — safe to expose in the browser.
// Row Level Security policies (set in the database) control what this key
// can actually read/write, not this file. Never put the secret key here.
const SUPABASE_URL = 'https://ntolfldyyipmwhnhivdq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MejkbIepvh2C-FPz-W-hlw_ilZSHixR';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

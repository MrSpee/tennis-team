const { createClient } = require('@supabase/supabase-js');

function createSupabaseClient(requireServiceRole = false) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Supabase URL fehlt in den Umgebungsvariablen.');
  }

  if (requireServiceRole) {
    if (!serviceRoleKey) {
      throw new Error('Für apply-Modus wird SUPABASE_SERVICE_ROLE_KEY benötigt.');
    }
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });
  }

  if (!anonKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY fehlt in den Umgebungsvariablen.');
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false }
  });
}

module.exports = {
  createSupabaseClient
};


const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper to create user-scoped client (for RLS enforcement)
function createUserClient(accessToken) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

module.exports = { supabase, createUserClient };

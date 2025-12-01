const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

// Debug logging
console.log('[SUPABASE CONFIG]');
console.log('URL:', env.SUPABASE_URL);
console.log('Service Key (first 20 chars):', env.SUPABASE_SERVICE_KEY?.substring(0, 20) + '...');

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-my-custom-header': 'backend-service'
    }
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

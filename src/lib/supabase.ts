import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Auto-authenticate with internal system user on load
supabase.auth.signInWithPassword({
  email: import.meta.env.VITE_SUPABASE_APP_EMAIL,
  password: import.meta.env.VITE_SUPABASE_APP_PASS,
}).catch(() => {})

// Service role client — bypasses RLS for delete/admin operations
export const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY
)

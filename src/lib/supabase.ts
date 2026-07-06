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
const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxb3p0enpuc3hodmN6a2Fub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1OTg3NSwiZXhwIjoyMDk1NjM1ODc1fQ.2Jxnj_q9ni2p8H4wuOP-u9QIDTYkkjdenaTPDjjQFmc'
export const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://aqoztzznsxhvczkanorr.supabase.co',
  SERVICE_KEY
)

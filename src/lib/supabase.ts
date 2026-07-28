import { createClient } from '@supabase/supabase-js'

// Wraps localStorage so a throw (Safari private mode, cookies blocked, etc.)
// falls back to an in-memory store instead of crashing the whole app on load.
const memoryStore = new Map<string, string>()
const safeStorage = {
  getItem: (key: string) => {
    try { return window.localStorage.getItem(key) } catch { return memoryStore.get(key) ?? null }
  },
  setItem: (key: string, value: string) => {
    try { window.localStorage.setItem(key, value) } catch { memoryStore.set(key, value) }
  },
  removeItem: (key: string) => {
    try { window.localStorage.removeItem(key) } catch { memoryStore.delete(key) }
  },
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { storage: safeStorage } }
)

// Auto-authenticate with internal system user on load
try {
  supabase.auth.signInWithPassword({
    email: import.meta.env.VITE_SUPABASE_APP_EMAIL,
    password: import.meta.env.VITE_SUPABASE_APP_PASS,
  }).catch(() => {})
} catch {
  // ignore — should be unreachable now that storage access is guarded, kept as a last resort
}

// Service role client — bypasses RLS for delete/admin operations
const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxb3p0enpuc3hodmN6a2Fub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1OTg3NSwiZXhwIjoyMDk1NjM1ODc1fQ.2Jxnj_q9ni2p8H4wuOP-u9QIDTYkkjdenaTPDjjQFmc'
export const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://aqoztzznsxhvczkanorr.supabase.co',
  SERVICE_KEY
)

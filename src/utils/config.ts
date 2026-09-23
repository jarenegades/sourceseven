import { hasSupabaseConfig } from './supabase/info';

// Configuration for data persistence
export const config = {
  // Use the production backend whenever the public Supabase variables are present.
  // This keeps local/demo builds usable when those variables are intentionally omitted.
  useSupabase: hasSupabaseConfig,
  useNeonAuth: Boolean(import.meta.env.VITE_NEON_AUTH_URL),
  
  // Enable this to see detailed logs for API calls
  debugMode: false,
};

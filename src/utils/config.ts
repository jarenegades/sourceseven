// Configuration for data persistence
export const config = {
  useNeonAuth: Boolean(import.meta.env.VITE_NEON_AUTH_URL),
  
  // Enable this to see detailed logs for API calls
  debugMode: false,
};

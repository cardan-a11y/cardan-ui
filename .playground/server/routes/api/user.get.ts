// `mfa_enabled: false` keeps the MFA setup page reachable after signing in
export default defineEventHandler(() => ({
  data: { name: 'Demo User', email: 'demo@example.com', mfa_enabled: false },
}));

// A guest until the sign-in challenge is solved, as a real API answers.
// `mfa_enabled: false` keeps the MFA setup page reachable after signing in
export default defineEventHandler((event) => {
  if (!getCookie(event, DEMO_SESSION_COOKIE)) {
    setResponseStatus(event, 401);
    return { message: 'Unauthenticated.' };
  }

  return {
    data: { name: 'Demo User', email: 'demo@example.com', mfa_enabled: false },
  };
});

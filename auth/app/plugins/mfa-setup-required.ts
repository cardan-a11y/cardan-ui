// Sends a session the API refuses (403) until MFA is set up to `/mfa-setup`
const MFA_SETUP_CODES = ['mfa_setup_required', 'backoffice_mfa_required'];

export default defineNuxtPlugin((nuxtApp) => {
  let redirecting = false;

  nuxtApp.hook('sanctum:error:response', ({ response }) => {
    if (redirecting || response?.status !== 403) return;

    const data = response._data as
      { code?: string; errors?: { code?: string }[] } | undefined;

    const code = data?.code ?? data?.errors?.[0]?.code;
    if (!code || !MFA_SETUP_CODES.includes(code)) return;

    const route = nuxtApp.$router.currentRoute.value;
    if (route.path === '/mfa-setup') return;

    redirecting = true;

    // Not awaited: the client rejects the request only once this hook returns
    void nuxtApp
      .runWithContext(async () => {
        try {
          await useAuth().refreshIdentity();
        } catch {
          // Still to the setup page
        }

        await navigateTo({
          path: '/mfa-setup',
          query: { redirect: route.fullPath },
        });
      })
      .catch(() => {
        // A guard cancelled the navigation
      })
      .finally(() => {
        redirecting = false;
      });
  });
});

// To the setup page, with the destination, while `useMfaSetupReminder()` asks
export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/mfa-setup') return;

  const { isAuthenticated } = useAuth();
  if (!isAuthenticated.value) return;

  const { isMfaSetupRequired, isReminderPending } = useMfaSetupReminder();
  if (!isMfaSetupRequired.value && !isReminderPending.value) return;

  return navigateTo({ path: '/mfa-setup', query: { redirect: to.fullPath } });
});

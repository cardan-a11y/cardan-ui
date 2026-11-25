// `00.`: global middleware runs in file-name order, and the others read the user
export default defineNuxtRouteMiddleware(async (to) => {
  // On the server there is nothing to wait for: the identity plugin is
  // client-only, so `$identityReady` is undefined there
  if (import.meta.server || to.meta.waitForIdentity === false) return;

  await useNuxtApp().$identityReady;
});

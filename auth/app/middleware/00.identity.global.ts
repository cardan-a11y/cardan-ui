// `00.`: global middleware runs in file-name order, and the others read the user
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.meta.waitForIdentity === false) return;

  await useNuxtApp().$identityReady;
});

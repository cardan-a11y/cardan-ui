// vue-axe in development only: the built playground, which the browser tests
// run against, has no axe of its own
export default defineNuxtPlugin(async (nuxtApp) => {
  if (!import.meta.dev) return;

  const { default: VueAxe } = await import('vue-axe');
  nuxtApp.vueApp.use(VueAxe);
});

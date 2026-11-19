// Not in the built playground, which the browser tests check with axe themselves
export default defineNuxtPlugin(async (nuxtApp) => {
  if (!import.meta.dev) return;

  const { default: VueAxe } = await import('vue-axe');
  nuxtApp.vueApp.use(VueAxe);
});

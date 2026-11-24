// The interface's language for the API's messages, not the browser's
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('sanctum:request', (app, ctx) => {
    ctx.options.headers.set('Accept-Language', app.$i18n.locale.value);
  });
});

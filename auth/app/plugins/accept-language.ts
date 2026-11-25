// The interface's language for the API's messages, not the browser's;
// a language the caller set for its own request stays
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('sanctum:request', (app, ctx) => {
    const { headers } = ctx.options;
    if (headers.has('Accept-Language')) return;

    headers.set('Accept-Language', app.$i18n.locale.value);
  });
});

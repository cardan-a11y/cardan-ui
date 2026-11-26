// The identity request is the browser's: on the server there is nothing to wait for
export default defineNuxtPlugin({
  name: 'cardan-auth:identity-server',
  setup: () => ({ provide: { identityReady: Promise.resolve() } }),
});

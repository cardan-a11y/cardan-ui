// For test/auth/layerConfig.test.ts: lists the module again, overrides a
// default. A plain object: the playground's typecheck has no `sanctum` key
export default {
  extends: ['../../..', '../../../auth'],
  modules: ['nuxt-auth-sanctum'],
  sanctum: {
    baseUrl: 'https://api.example.com',
    globalMiddleware: { allow404WithoutAuth: true },
  },
  compatibilityDate: '2026-04-03',
};

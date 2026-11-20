import { defineNuxtModule, createResolver } from 'nuxt/kit';

// A reference to app/types: the consumer's tsconfig excludes the layer in
// node_modules. Not in nuxt.config `modules`: a relative path resolves there
export default defineNuxtModule({
  meta: { name: '@cardan/auth-ui:global-types' },
  setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url);
    const typesPath = resolve('../app/types/index.ts');

    nuxt.hook('prepare:types', ({ references }) => {
      references.push({ path: typesPath });
    });
  },
});

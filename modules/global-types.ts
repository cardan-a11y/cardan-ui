import { defineNuxtModule, createResolver } from 'nuxt/kit';

/**
 * Adds the layer's global types (`app/types/index.ts`) as a reference: Nuxt
 * 4.6's generated tsconfig excludes the consumer's `node_modules`, where the
 * layer lives. Tripwire: test/tripwires.test.ts.
 * Picked up from `modules/`, not listed in `modules`: a relative entry there
 * resolves against the consumer's root.
 */
export default defineNuxtModule({
  meta: { name: '@cardan/ui:global-types' },
  setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url);
    const typesPath = resolve('../app/types/index.ts');

    nuxt.hook('prepare:types', ({ references }) => {
      references.push({ path: typesPath });
    });
  },
});

import { defineNuxtModule, createResolver } from 'nuxt/kit';

/**
 * Registers the layer's ambient global types (`app/types/index.ts`) as a
 * TypeScript reference in consumers' generated `.nuxt` types.
 *
 * The types file declares all shared globals (`MenuItem`, `TabOption`,
 * `ButtonVariant`, `DialogComponent`, `FontSize`, …) via `declare global`, but
 * it is never imported. When a consumer extends this layer, the layer lives
 * under `node_modules`, which the consumer's Nuxt-generated tsconfig excludes,
 * so TypeScript never loads the file and every global fails to resolve. This
 * holds for Nuxt 4.6, whose generated tsconfig excludes the consumer's
 * `node_modules` even though it lists the layer's `app/` in `include`.
 *
 * A reference is resolved regardless of `include`/`exclude`, and because the
 * file stays in place its relative `.vue` imports keep resolving.
 *
 * This module is picked up automatically: Nuxt scans each layer's `modules/`
 * directory and registers what it finds by absolute path, so it runs in both
 * this repo and any consumer that extends the layer. It is deliberately NOT
 * listed in `nuxt.config`'s `modules` array: a relative entry like
 * `'./modules/global-types'` there resolves against the *consumer's* root and
 * fails to load when the layer is extended.
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

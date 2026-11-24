import { defineNuxtModule, directoryToURL, tryResolveModule } from 'nuxt/kit';

/**
 * The packages the layer's components import, which Vite has to prebundle in
 * development (CommonJS, or ESM in many files).
 * test/modules/optimize-deps.test.ts checks the list against the imports in app/.
 */
export const LAYER_DEPENDENCIES = [
  // MarkdownPreview, and the languages in Markdown/highlight.ts
  'markdown-it',
  '@mdit/plugin-attrs',
  '@mdit/plugin-mark',
  'highlight.js/lib/core',
  'highlight.js/lib/languages/xml',
  'highlight.js/lib/languages/css',
  'highlight.js/lib/languages/javascript',
  'highlight.js/lib/languages/typescript',
  'highlight.js/lib/languages/json',
  'highlight.js/lib/languages/bash',
  // DatePicker
  '@vuepic/vue-datepicker',
  'date-fns',
  'date-fns/locale',
  // MultiSelect
  '@vueform/multiselect',
  // FileInput
  'compressorjs',
  // MarkdownEditor
  'md-editor-v3',
];

/**
 * The packages that resolve from the project's own folder. Not from the
 * layer's: in development the layer is `../cardan-ui`, which has every one.
 * A package that does not resolve stays out: Vite warns about it at every start.
 */
export async function projectDependencies(rootDir: string) {
  const from = directoryToURL(rootDir);
  const resolved = await Promise.all(
    LAYER_DEPENDENCIES.map((id) => tryResolveModule(id, from)),
  );
  return LAYER_DEPENDENCIES.filter((_, index) => resolved[index]);
}

/** The project's own entries first, then the layer's, each once */
export function mergeInclude(own: string[] | undefined, layer: string[]) {
  return [...new Set([...(own ?? []), ...layer])];
}

/** Adds the packages of the layer's components to `vite.optimizeDeps.include`. */
export default defineNuxtModule({
  meta: { name: '@cardan/ui:optimize-deps' },
  async setup(_options, nuxt) {
    const found = await projectDependencies(nuxt.options.rootDir);
    const optimizeDeps = (nuxt.options.vite.optimizeDeps ??= {});
    optimizeDeps.include = mergeInclude(optimizeDeps.include, found);
  },
});

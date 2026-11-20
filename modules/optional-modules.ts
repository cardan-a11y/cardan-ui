import { defineNuxtModule, hasNuxtModule, useLogger } from 'nuxt/kit';

/** Names, at startup, the components that need a module the project does not register. */
export default defineNuxtModule({
  meta: { name: '@cardan/ui:optional-modules' },
  setup(_options, nuxt) {
    nuxt.hook('modules:done', () => {
      const logger = useLogger('cardan-ui');

      if (!hasNuxtModule('@nuxt/image', nuxt)) {
        logger.info(
          'VideoPlayer and the videos in MarkdownPreview need @nuxt/image: add it to the modules of a project that shows videos',
        );
      }

      if (!hasNuxtModule('@nuxt/scripts', nuxt)) {
        logger.info(
          'YouTube and CookiesDialog need @nuxt/scripts: add it to the modules of a project that uses them',
        );
      }
    });
  },
});

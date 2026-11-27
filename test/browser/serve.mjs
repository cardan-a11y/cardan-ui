/**
 * Builds the playground and serves it for the browser suite: the web server
 * of playwright.config.ts, on the shared test/config/serve.mjs.
 *
 * The build goes to node_modules/.cache/cardan-ui-browser, not to
 * .playground/.nuxt and .playground/.output, so it runs next to `pnpm dev`.
 * With PLAYGROUND_OUTPUT set to an existing Nitro output (such as
 * `.playground/.output` after `pnpm build`) it serves that instead.
 */
import { serve } from '../config/serve.mjs';

await serve({
  root: new URL('../..', import.meta.url),
  name: 'cardan-ui',
  port: 3013,
  kit: () => import('nuxt/kit'),
  cwd: '.playground',
  // As `nuxt build` does, so `$production` in the config applies, as in CI
  envName: 'production',
  writeTypes: true,
  output: 'PLAYGROUND_OUTPUT',
  serverEnv: ({ origin }) => ({
    // The Auth UI pages talk to the mock endpoints of this server
    NUXT_PUBLIC_SANCTUM_BASE_URL: origin,
    // CookiesDialog registers Tag Manager; the tests answer its request
    NUXT_PUBLIC_GTM_ID: 'GTM-TEST',
  }),
});

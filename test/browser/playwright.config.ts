import { defineConfig, devices } from '@playwright/test';
import { cardanPlaywrightConfig } from '../config/playwright';

/**
 * The browser suite (`pnpm test:browser`): what happy-dom cannot show, in
 * Chromium against the built, server-rendered playground. serve.mjs builds
 * it next to `pnpm dev` and serves it on its own port. The shared parts are
 * in test/config/playwright.ts, which the projects use too.
 */
const config = cardanPlaywrightConfig({
  dir: import.meta.dirname,
  name: 'cardan-ui',
  port: 3013,
  locale: 'en-GB',
});

export default defineConfig({
  ...config,
  use: { ...devices['Desktop Chrome'], ...config.use },
});

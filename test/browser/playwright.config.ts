import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

/**
 * The browser suite (`pnpm test:browser`): what happy-dom cannot show, in
 * Chromium against the built, server-rendered playground. serve.mjs builds
 * it next to `pnpm dev` and serves it on its own port.
 */
const port = Number(process.env.PORT ?? 3013);
const cache = fileURLToPath(
  new URL('../../node_modules/.cache/cardan-ui-browser/', import.meta.url),
);

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  outputDir: `${cache}results`,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  timeout: 60_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${port}`,
    locale: 'en-GB',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium' }],
  webServer: {
    command: 'node serve.mjs',
    env: { PORT: String(port) },
    url: `http://localhost:${port}`,
    timeout: 600_000,
    // A server you started yourself on the port: `node test/browser/serve.mjs`
    reuseExistingServer: !!process.env.REUSE_SERVER,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

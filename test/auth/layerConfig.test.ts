// @vitest-environment node
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildNuxt, loadNuxt } from 'nuxt/kit';
import type { NuxtApp, NuxtOptions } from 'nuxt/schema';

const root = resolve(__dirname, '../..');
const authLayer = resolve(root, 'auth');

type Resolved = {
  options: NuxtOptions;
  app: NuxtApp;
  modules: string[];
};

/**
 * Loads a fixture app as `nuxt prepare` does: the merged config and the
 * resolved app (plugins, middleware), without a bundle.
 */
async function resolveFixture(
  fixture: string,
  apiUrl?: string,
): Promise<Resolved> {
  const saved = process.env.NUXT_PUBLIC_SANCTUM_BASE_URL;
  setApiUrl(apiUrl);

  try {
    const nuxt = await loadNuxt({
      cwd: resolve(root, 'test/fixtures', fixture),
      dev: false,
      overrides: {
        _prepare: true,
        buildDir: resolve(
          root,
          'node_modules/.cache/cardan-ui-auth-app',
          fixture,
        ),
      },
    });
    await buildNuxt(nuxt);
    const resolved = {
      options: nuxt.options,
      app: nuxt.apps.default!,
      modules: nuxt.options._installedModules.map(
        (module) => module.meta?.name ?? '',
      ),
    };
    await nuxt.close();
    return resolved;
  } finally {
    setApiUrl(saved);
  }
}

function setApiUrl(url: string | undefined) {
  if (url === undefined) delete process.env.NUXT_PUBLIC_SANCTUM_BASE_URL;
  else process.env.NUXT_PUBLIC_SANCTUM_BASE_URL = url;
}

/** The global middleware in the order the router runs it */
const globalMiddleware = (app: NuxtApp) =>
  app.middleware.filter((entry) => entry.global);

const inAuthLayer = (path: string) => path.startsWith(`${authLayer}/`);

describe('auth layer configuration', { timeout: 60_000 }, () => {
  it("sets the Sanctum defaults, and an app's own value wins", async () => {
    const { options } = await resolveFixture('auth-app');

    expect(options.runtimeConfig.public.sanctum).toMatchObject({
      baseUrl: 'https://api.example.com',
      endpoints: {
        csrf: '/sanctum/csrf-cookie',
        login: '/api/login',
        logout: '/api/logout',
      },
      client: { initialRequest: false },
      redirect: {
        keepRequestedRoute: true,
        onAuthOnly: '/login',
        onLogout: '/login',
      },
      globalMiddleware: {
        enabled: true,
        prepend: false,
        allow404WithoutAuth: true,
      },
    });
  });

  it('installs nuxt-auth-sanctum once when the app lists it too', async () => {
    const { modules, app } = await resolveFixture('auth-app');

    expect(modules.filter((name) => name === 'nuxt-auth-sanctum')).toHaveLength(
      1,
    );
    expect(
      app.middleware.filter((entry) => entry.name === 'sanctum:auth:global'),
    ).toHaveLength(1);
  });

  it('preconnects to the API with NUXT_PUBLIC_SANCTUM_BASE_URL, and not without', async () => {
    const preconnect = (options: NuxtOptions) =>
      (options.app.head.link ?? []).filter((link) => link.rel === 'preconnect');

    const without = await resolveFixture('auth-app');
    const set = await resolveFixture('auth-app', 'https://api.example.com');

    expect(preconnect(without.options)).toEqual([]);
    expect(preconnect(set.options)).toEqual([
      { rel: 'preconnect', href: 'https://api.example.com' },
    ]);
  });

  it("puts the identity first among the layer's middleware, and the module's after them", async () => {
    const { app } = await resolveFixture('auth-app');
    const order = globalMiddleware(app).map((entry) => entry.path);

    const identity = resolve(authLayer, 'app/middleware/00.identity.global.ts');
    const layer = order.filter(inAuthLayer);
    expect(layer[0]).toBe(identity);
    expect(layer.length).toBeGreaterThan(1);

    const sanctum = globalMiddleware(app).findIndex(
      (entry) => entry.name === 'sanctum:auth:global',
    );
    expect(sanctum).toBeGreaterThan(order.lastIndexOf(layer.at(-1)!));
  });

  it("replaces the layer's identity middleware with an app's own, at the app's place", async () => {
    const { app } = await resolveFixture('auth-app-own-identity');
    const order = globalMiddleware(app).map((entry) => entry.path);

    const own = resolve(
      root,
      'test/fixtures/auth-app-own-identity/app/middleware/00.identity.global.ts',
    );
    expect(order).toContain(own);
    expect(order).not.toContain(
      resolve(authLayer, 'app/middleware/00.identity.global.ts'),
    );

    const lastOfLayer = order.findLastIndex(inAuthLayer);
    expect(lastOfLayer).toBeGreaterThan(-1);
    expect(order.indexOf(own)).toBeGreaterThan(lastOfLayer);
  });
});

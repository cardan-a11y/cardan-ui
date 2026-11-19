// The playground's default locale is English; the layer's is Dutch.
import { expect, test } from '@playwright/test';

for (const [kind, path] of [
  ['a server-rendered page', '/buttons'],
  ['the shell of an ssr: false route', '/login'],
] as const) {
  test(`${kind} is served with the default locale's lang`, async ({
    request,
  }) => {
    const html = await (await request.get(path)).text();

    expect(html.match(/<html[^>]*>/)?.[0]).toMatch(/\slang="en"/);
  });
}

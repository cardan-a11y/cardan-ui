import { globSync, readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const layers = [
  { dir: 'app', prefix: 'cardan-ui:', keyframePrefix: 'cardan-' },
  { dir: 'auth/app', prefix: 'cardan-auth:', keyframePrefix: 'cardan-auth-' },
];

function matches(glob: string, pattern: RegExp) {
  return globSync(glob).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(pattern)].map(([, name]) => ({
      name: name!,
      file,
    })),
  );
}

describe.each(layers)('$dir', ({ dir, prefix, keyframePrefix }) => {
  it(`prefixes every useState key with ${prefix}, so a project's own key never shares its state`, () => {
    const keys = matches(
      `${dir}/**/*.{ts,vue}`,
      /\buseState\s*(?:<[\s\S]*?>)?\(\s*[`'"]([^`'"]+)/g,
    );
    const calls = matches(`${dir}/**/*.{ts,vue}`, /\b(useState)\s*[<(]/g);
    expect(keys, 'every key is a string literal').toHaveLength(calls.length);
    expect(keys.filter(({ name }) => !name.startsWith(prefix))).toEqual([]);
  });

  it(`prefixes every @keyframes name with ${keyframePrefix}: unscoped styles share one name space with a project`, () => {
    const names = matches(`${dir}/**/*.{vue,css}`, /@keyframes\s+([\w-]+)/g);
    expect(names.length).toBeGreaterThan(0);
    expect(
      names.filter(({ name }) => !name.startsWith(keyframePrefix)),
    ).toEqual([]);
  });
});

describe('@keyframes', () => {
  it('are defined once: a shared one lives in app/assets/css/keyframes/', () => {
    const names = matches(
      '{app,auth/app}/**/*.{vue,css}',
      /@keyframes\s+([\w-]+)/g,
    );
    const files = Map.groupBy(names, ({ name }) => name);
    expect([...files].filter(([, defined]) => defined.length > 1)).toEqual([]);
  });
});

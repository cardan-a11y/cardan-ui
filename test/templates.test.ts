import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'vue/compiler-sfc';

const COMMENT = 3;
const files = globSync('{app,auth/app}/**/*.vue', { cwd: process.cwd() });

describe('component templates', () => {
  it('finds the components', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("have no comment at the root, where a production build drops the caller's attributes", () => {
    const offenders = files.filter((file) => {
      const { descriptor } = parse(readFileSync(file, 'utf8'), { filename: file });
      return descriptor.template?.ast?.children.some(
        (node) => node.type === COMMENT,
      );
    });

    expect(offenders).toEqual([]);
  });
});

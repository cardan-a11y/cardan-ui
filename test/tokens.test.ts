import { join, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { checkTokens, describeMissing } from './tokens';

const root = resolve(__dirname, '..');
const layer = join(root, 'app');
const authLayer = join(root, 'auth');

describe('the main.css template', () => {
  it('declares every token the layer and the auth layer read without a fallback', () => {
    const result = checkTokens({
      mainCss: join(layer, 'assets/main.css'),
      sources: [layer, authLayer],
    });

    expect(describeMissing(result, root)).toBe('');
  });
});

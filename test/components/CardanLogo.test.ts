import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { CardanLogo } from '#components';
import { accessibleName, expectNoViolations, roleOf } from '../a11y';

/**
 * The logo is one image with a name, whatever its form; the product of a
 * lockup is part of the name. A decorative logo, next to a visible name, is
 * hidden from assistive technology.
 */
async function mountLogo(props: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(CardanLogo, {
    props,
    attachTo: document.body,
  });
  return wrapper.element as HTMLElement;
}

describe('CardanLogo', () => {
  it.each([
    ['the full logo', {}, 'Logo Cardan'],
    [
      'a lockup, with its product',
      { product: 'academy' },
      'Logo Cardan Academy',
    ],
    [
      'the symbol, without the product',
      { form: 'symbol', product: 'academy' },
      'Logo Cardan',
    ],
    ['the tile', { form: 'tile' }, 'Logo Cardan'],
    [
      'a label of its own',
      { label: 'Cardan home', product: 'auditor' },
      'Cardan home',
    ],
  ])('is an image named for %s', async (_, props, name) => {
    const logo = await mountLogo(props);

    expect(roleOf(logo)).toBe('img');
    expect(accessibleName(logo)).toBe(name);
    await expectNoViolations();
  });

  it('is hidden from assistive technology when decorative', async () => {
    const logo = await mountLogo({ decorative: true, product: 'academy' });

    expect(logo.getAttribute('aria-hidden')).toBe('true');
    expect(logo.hasAttribute('role')).toBe(false);
    expect(logo.hasAttribute('aria-label')).toBe(false);
    await expectNoViolations();
  });

  // The name has its width in Hanken Grotesk and is fitted to it in any font,
  // so the lockup never changes size or clips while the font loads
  it.each([
    ['academy', 133],
    ['auditor', 106.1],
    ['support', 115.7],
    ['UI', 28.9],
    ['All Access', 146.2],
  ])('fits the product name %s to a fixed width', async (product, width) => {
    const logo = await mountLogo({ product });
    const viewBox = logo.querySelector('svg')!.getAttribute('viewBox')!;
    const text = logo.querySelector('text')!;

    expect(Number(text.getAttribute('textLength'))).toBeCloseTo(width, 3);
    expect(text.getAttribute('lengthAdjust')).toBe('spacingAndGlyphs');
    expect(Number(viewBox.split(' ')[2])).toBeCloseTo(292.602 + width, 3);
  });
});

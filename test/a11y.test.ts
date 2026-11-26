import { afterEach, describe, it, expect } from 'vitest';
import { expectNoViolations } from './a11y';

describe('expectNoViolations', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('passes a page without violations', async () => {
    document.body.innerHTML = '<main><button>Save</button></main>';
    await expectNoViolations();
  });

  it('fails on a violation, naming the rule and the element', async () => {
    document.body.innerHTML =
      '<main><button id="unnamed"></button></main>';
    const error = await expectNoViolations().catch((thrown) => thrown);
    expect(error.message).toMatch(/^axe violations/);
    expect(error.actual).toMatch(/^button-name: .*\(#unnamed\)$/);
  });
});

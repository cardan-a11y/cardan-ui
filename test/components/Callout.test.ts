import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Callout } from '#components';
import { accessibleName, checkA11y, roleOf } from '../a11y';

/**
 * The colour and the icon of a callout say how serious it is; a hidden word
 * before the content says it to a screen reader too (WCAG 1.4.1, use of
 * color).
 */
describe('Callout', () => {
  it.each([
    ['red', 'Error'],
    ['orange', 'Warning'],
    ['green', 'Success'],
    ['blue', 'Notice'],
  ] as const)('%s: says "%s" before its content', async (color, severity) => {
    const wrapper = await mountSuspended(Callout, {
      props: { color, content: 'The course starts Monday.' },
      attachTo: document.body,
    });

    // The word is inline, the content a block of its own after it
    expect(wrapper.text()).toMatch(
      new RegExp(`^${severity}\\s*The course starts Monday\\.$`),
    );
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('adds no severity to the neutral accent callout', async () => {
    const wrapper = await mountSuspended(Callout, {
      props: { content: 'The course starts Monday.' },
    });

    expect(wrapper.text()).toBe('The course starts Monday.');
  });

  it('is a region named by aria-label', async () => {
    const wrapper = await mountSuspended(Callout, {
      props: { color: 'blue', ariaLabel: 'Course dates' },
      slots: { default: '<p>The course starts Monday.</p>' },
      attachTo: document.body,
    });

    const section = wrapper.get('section').element;
    expect(roleOf(section)).toBe('region');
    expect(accessibleName(section)).toBe('Course dates');
    expect(await checkA11y()).toHaveNoViolations();
  });
});

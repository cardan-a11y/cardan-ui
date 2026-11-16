import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Breadcrumbs } from '#components';
import { accessibleName, checkA11y, roleOf } from '../a11y';

/**
 * The APG breadcrumb pattern
 * (https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/): a navigation
 * landmark named as a breadcrumb, an ordered list of links, and the current
 * page marked with `aria-current="page"`. Here the current page is text, not
 * a link (the component's docblock).
 */
const items: BreadcrumbItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Knowledge base', to: '/knowledge-base' },
  { label: 'Webinars', to: '/knowledge-base/webinars' },
];

describe('Breadcrumbs', () => {
  it('is a labelled navigation with an ordered list of links to the current page', async () => {
    const wrapper = await mountSuspended(Breadcrumbs, {
      props: { items },
      attachTo: document.body,
    });

    const nav = wrapper.get('nav');
    expect(roleOf(nav)).toBe('navigation');
    expect(accessibleName(nav)).toBe('Breadcrumb');

    // An ordered list, which keeps its list role without bullets
    const list = nav.get('ol');
    expect(roleOf(list)).toBe('list');
    expect(list.findAll('li')).toHaveLength(3);

    const links = wrapper.findAll('a');
    expect(links.map((link) => accessibleName(link))).toEqual([
      'Home',
      'Knowledge base',
    ]);
    expect(links.map((link) => link.attributes('href'))).toEqual([
      '/',
      '/knowledge-base',
    ]);

    // The last item is the current page: text, also when it has a `to`, and
    // the only one marked
    const current = wrapper.findAll('[aria-current]');
    expect(current).toHaveLength(1);
    expect(current[0]!.attributes('aria-current')).toBe('page');
    expect(current[0]!.text()).toBe('Webinars');
    expect(roleOf(current[0]!)).not.toBe('link');

    expect(await checkA11y()).toHaveNoViolations();
  });

  it('shows an item without a link as text, not current, and a language where given', async () => {
    const wrapper = await mountSuspended(Breadcrumbs, {
      props: {
        items: [
          { label: 'Home', to: '/' },
          { label: 'Kennisbank', lang: 'nl' },
          { label: 'Webinars' },
        ],
        label: 'You are here',
      },
      attachTo: document.body,
    });

    expect(accessibleName(wrapper.get('nav'))).toBe('You are here');
    expect(wrapper.findAll('a')).toHaveLength(1);

    const middle = wrapper.findAll('li')[1]!;
    expect(middle.text()).toBe('Kennisbank');
    expect(middle.attributes('lang')).toBe('nl');
    expect(middle.find('a').exists()).toBe(false);
    expect(middle.find('[aria-current]').exists()).toBe(false);

    expect(wrapper.get('[aria-current="page"]').text()).toBe('Webinars');

    expect(await checkA11y()).toHaveNoViolations();
  });

  it('renders no landmark without items', async () => {
    const wrapper = await mountSuspended(Breadcrumbs, {
      props: { items: [] },
    });

    expect(wrapper.find('nav').exists()).toBe(false);
  });
});

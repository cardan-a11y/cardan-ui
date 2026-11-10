import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Breadcrumbs } from '#components';
import { checkA11y } from '../a11y';

const items: BreadcrumbItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Knowledge base', to: '/knowledge-base' },
  { label: 'Webinars', to: '/knowledge-base/webinars' },
];

describe('Breadcrumbs', () => {
  it('links every item but the last, which is the current page', async () => {
    const wrapper = await mountSuspended(Breadcrumbs, {
      props: { items },
      attachTo: document.body,
    });

    const nav = wrapper.get('nav');
    expect(nav.attributes('aria-label')).toBe('Breadcrumb');
    expect(wrapper.findAll('ol > li')).toHaveLength(3);

    const links = wrapper.findAll('a');
    expect(links.map((link) => link.text())).toEqual([
      'Home',
      'Knowledge base',
    ]);
    expect(links.map((link) => link.attributes('href'))).toEqual([
      '/',
      '/knowledge-base',
    ]);

    // The current page is text, also when the item has a `to`
    const current = wrapper.get('[aria-current="page"]');
    expect(current.element.tagName).toBe('SPAN');
    expect(current.text()).toBe('Webinars');
    expect(wrapper.findAll('[aria-current]')).toHaveLength(1);

    expect(await checkA11y()).toHaveNoViolations();

    wrapper.unmount();
  });

  it('shows an item without a link as text, and a language where given', async () => {
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

    expect(wrapper.get('nav').attributes('aria-label')).toBe('You are here');
    expect(wrapper.findAll('a')).toHaveLength(1);

    const middle = wrapper.findAll('li')[1]!;
    expect(middle.attributes('lang')).toBe('nl');
    expect(middle.find('a').exists()).toBe(false);
    expect(middle.find('[aria-current]').exists()).toBe(false);

    expect(await checkA11y()).toHaveNoViolations();

    wrapper.unmount();
  });

  it('renders no landmark without items', async () => {
    const wrapper = await mountSuspended(Breadcrumbs, {
      props: { items: [] },
    });

    expect(wrapper.find('nav').exists()).toBe(false);
  });
});

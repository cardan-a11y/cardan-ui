import { describe, it, expect, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { MenuList } from '#components';
import { accessibleName, checkA11y, roleOf } from '../a11y';
import { addToPage } from '../dom';

/**
 * A navigation landmark with a list of links and buttons: not the ARIA
 * `menu` role, which is for application menus with arrow-key navigation. A
 * list in a list is a group inside the same landmark.
 */
const list: MenuItem[] = [
  { id: 1, label: 'Dashboard', to: '/dashboard' },
  { id: 2, label: 'Sign out' },
];

describe('MenuList', () => {
  it('is a navigation named by its heading, with a list of links and buttons', async () => {
    const wrapper = await mountSuspended(MenuList, {
      props: { list, label: 'Account', hTag: 'h3' },
      attachTo: document.body,
    });

    const nav = wrapper.get('nav');
    expect(roleOf(nav)).toBe('navigation');
    expect(accessibleName(nav)).toBe('Account');

    const heading = nav.get('h3');
    expect(roleOf(heading)).toBe('heading');
    expect(heading.text()).toBe('Account');

    // A list also where a stylesheet takes its bullets off
    const ul = nav.get('ul');
    expect(roleOf(ul)).toBe('list');
    expect(ul.findAll(':scope > li')).toHaveLength(2);

    expect(
      ul
        .findAll('a, button')
        .map((item) => [roleOf(item), accessibleName(item)]),
    ).toEqual([
      ['link', 'Dashboard'],
      ['button', 'Sign out'],
    ]);

    // No menu roles
    expect(wrapper.find('[role^="menu"]').exists()).toBe(false);

    expect(await checkA11y()).toHaveNoViolations();
  });

  it('is named by aria-label, or by the element aria-labelledby names', async () => {
    const wrapper = await mountSuspended(MenuList, {
      props: { list, ariaLabel: 'Components' },
      attachTo: document.body,
    });

    expect(accessibleName(wrapper.get('nav'))).toBe('Components');
    expect(wrapper.find('h1, h2, h3, h4, h5, h6').exists()).toBe(false);

    addToPage('<h2 id="settings-heading">Settings</h2>');
    await wrapper.setProps({ ariaLabelledby: 'settings-heading' });

    expect(accessibleName(wrapper.get('nav'))).toBe('Settings');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('makes a list in a list a group in the same landmark, named by its item', async () => {
    const wrapper = await mountSuspended(MenuList, {
      props: {
        list: [
          { id: 1, label: 'Dashboard', to: '/dashboard' },
          {
            id: 2,
            label: 'Settings',
            items: [
              { id: 3, label: 'Profile', to: '/profile' },
              { id: 4, label: 'Billing', to: '/billing' },
            ],
          },
        ],
        ariaLabel: 'Main navigation',
      },
      attachTo: document.body,
    });

    expect(wrapper.findAll('nav')).toHaveLength(1);

    const group = wrapper.get('[role="group"]');
    expect(roleOf(group)).toBe('group');
    expect(accessibleName(group)).toBe('Settings');
    expect(roleOf(group.get('ul'))).toBe('list');
    expect(group.findAll('a').map((link) => accessibleName(link))).toEqual([
      'Profile',
      'Billing',
    ]);

    expect(await checkA11y()).toHaveNoViolations();
  });

  it('emits the item clicked and runs its onClick, also from a list in a list', async () => {
    const onSignOut = vi.fn();
    const onBilling = vi.fn();
    const signOut: MenuItem = { id: 1, label: 'Sign out', onClick: onSignOut };
    const billing: MenuItem = { id: 3, label: 'Billing', onClick: onBilling };

    const wrapper = await mountSuspended(MenuList, {
      props: {
        list: [signOut, { id: 2, label: 'Settings', items: [billing] }],
        ariaLabel: 'Account',
      },
      attachTo: document.body,
    });

    const button = (name: string) =>
      wrapper.findAll('button').find((b) => accessibleName(b) === name)!;

    await button('Sign out').trigger('click');
    expect(onSignOut).toHaveBeenCalledOnce();

    await button('Billing').trigger('click');
    expect(onBilling).toHaveBeenCalledOnce();

    expect(wrapper.emitted('click')).toEqual([[signOut], [billing]]);
  });

  it('gives a disabled item in a list in a list its tooltip, named after the item', async () => {
    const wrapper = await mountSuspended(MenuList, {
      props: {
        list: [
          {
            id: 1,
            label: 'Reports',
            items: [
              {
                id: 2,
                label: 'Export',
                disabled: true,
                tooltip: 'Exports come with the Pro plan',
              },
              // Enabled: the tooltip is not needed
              { id: 3, label: 'Print', tooltip: 'Prints the report' },
            ],
          },
        ],
        ariaLabel: 'Reports',
      },
      attachTo: document.body,
    });

    const names = wrapper.findAll('button').map((b) => accessibleName(b));
    expect(names).toEqual(['Export', 'More info about Export', 'Print']);

    const exportButton = wrapper
      .findAll('button')
      .find((b) => accessibleName(b) === 'Export')!;
    expect((exportButton.element as HTMLButtonElement).disabled).toBe(true);

    expect(await checkA11y()).toHaveNoViolations();
  });
});

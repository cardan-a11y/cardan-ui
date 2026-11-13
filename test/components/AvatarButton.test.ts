import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { AvatarButton } from '#components';
import { accessibleName, checkA11y } from '../a11y';

/**
 * The button is named by its label; without one, by the visible initials;
 * when an image or an icon hides the initials, by the initials or "Profile
 * picture" in hidden text (the image itself is decorative).
 */
async function nameOf(props: Record<string, unknown>) {
  const wrapper = await mountSuspended(AvatarButton, {
    props,
    attachTo: document.body,
  });
  const button = wrapper.get('button').element;
  expect(await checkA11y()).toHaveNoViolations();
  return accessibleName(button);
}

const avatar = '/avatar.jpg';
const icon = 'material-symbols:person-outline-rounded';

describe('AvatarButton', () => {
  it.each([
    ['the label, over an image', { ariaLabel: 'Account', avatar }, 'Account'],
    ['the label, over an icon', { ariaLabel: 'Account', icon }, 'Account'],
    ['the visible initials', { initials: 'AL' }, 'AL'],
    ['the initials, behind an image', { initials: 'AL', avatar }, 'AL'],
    ['the initials, behind an icon', { initials: 'AL', icon }, 'AL'],
    ['"Profile picture" for an image', { avatar }, 'Profile picture'],
    ['"Profile picture" for an icon', { icon }, 'Profile picture'],
    ['"Profile picture" with nothing to show', {}, 'Profile picture'],
  ])('is named by %s', async (_, props, name) => {
    expect(await nameOf(props)).toBe(name);
  });
});

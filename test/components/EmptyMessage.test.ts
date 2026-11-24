import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { EmptyMessage } from '#components';
import { accessibleName, expectNoViolations, roleOf } from '../a11y';

describe('EmptyMessage', () => {
  it('is a single paragraph with the text of its prop', async () => {
    const wrapper = await mountSuspended(EmptyMessage, {
      props: { text: 'No courses found.' },
      attachTo: document.body,
    });

    expect(wrapper.element.tagName).toBe('P');
    expect(wrapper.text()).toBe('No courses found.');
    await expectNoViolations();
  });

  it('takes its text from the default slot', async () => {
    const wrapper = await mountSuspended(EmptyMessage, {
      slots: { default: () => 'No articles in this category.' },
    });

    expect(wrapper.element.tagName).toBe('P');
    expect(wrapper.text()).toBe('No articles in this category.');
  });

  it('is not a live region', async () => {
    const wrapper = await mountSuspended(EmptyMessage, {
      props: { text: 'No results.' },
    });

    expect(wrapper.element.getAttribute('role')).toBeNull();
    expect(wrapper.find('[aria-live], [role="status"]').exists()).toBe(false);
  });

  it('hides its icon from assistive technology', async () => {
    const wrapper = await mountSuspended(EmptyMessage, {
      props: {
        text: 'No courses found.',
        icon: 'material-symbols:search-off-outline-rounded',
      },
      attachTo: document.body,
    });

    const icon = wrapper.get('.iconify, svg');
    expect(icon.attributes('aria-hidden')).toBe('true');
    expect(accessibleName(wrapper.get('p'))).toBe('No courses found.');
    await expectNoViolations();
  });

  it('puts a named action after the text', async () => {
    const wrapper = await mountSuspended(EmptyMessage, {
      props: { text: 'No courses match these filters.' },
      slots: {
        actions: () => h('button', { type: 'button' }, 'Reset filters'),
      },
      attachTo: document.body,
    });

    const paragraphs = wrapper.findAll('p');
    expect(paragraphs.map((p) => p.text())).toEqual([
      'No courses match these filters.',
    ]);

    const button = wrapper.get('button');
    expect(roleOf(button)).toBe('button');
    expect(accessibleName(button)).toBe('Reset filters');
    expect(button.element.closest('[inert], [hidden], [aria-hidden]')).toBe(
      null,
    );
    const actionFollowsText =
      paragraphs[0]!.element.compareDocumentPosition(button.element) &
      Node.DOCUMENT_POSITION_FOLLOWING;
    expect(actionFollowsText).toBeTruthy();
    await expectNoViolations();
  });
});

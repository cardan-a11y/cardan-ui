import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Table } from '#components';
import { accessibleName, checkA11y } from '../a11y';

const rows = `
  <thead><tr><th scope="col">Name</th><th scope="col">Score</th></tr></thead>
  <tbody><tr><td>Ada</td><td>9</td></tr></tbody>
`;

describe('Table', () => {
  it('is named by a caption from aria-label', async () => {
    const wrapper = await mountSuspended(Table, {
      props: { ariaLabel: 'Results' },
      slots: { default: rows },
      attachTo: document.body,
    });

    const table = wrapper.get('table');
    expect(accessibleName(table.element)).toBe('Results');
    expect(table.get('caption').text()).toBe('Results');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('is busy only while it loads', async () => {
    const wrapper = await mountSuspended(Table, {
      props: { ariaLabel: 'Results', loading: true },
      slots: { default: rows },
      attachTo: document.body,
    });
    const table = wrapper.get('table');
    expect(table.attributes('aria-busy')).toBe('true');

    await wrapper.setProps({ loading: false });
    expect(table.attributes('aria-busy')).toBeUndefined();
  });
});

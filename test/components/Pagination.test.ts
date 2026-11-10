import { describe, it, expect } from 'vitest';
import { nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Pagination } from '#components';
import { checkA11y } from '../a11y';

describe('Pagination', () => {
  it('moves focus on when the button under it is disabled on the last page', async () => {
    const wrapper = await mountSuspended(Pagination, {
      props: {
        lastPage: 2,
        total: 20,
        page: 1,
        'onUpdate:page': (page: number) => wrapper.setProps({ page }),
      },
      attachTo: document.body,
    });

    const next = wrapper.get('.next-page-button').element as HTMLButtonElement;
    next.focus();
    await wrapper.get('.next-page-button').trigger('click');
    await nextTick();

    expect(next.disabled).toBe(true);
    expect(document.activeElement).toBe(
      wrapper.get('.prev-page-button').element,
    );
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('moves focus to the page count on a single page', async () => {
    const wrapper = await mountSuspended(Pagination, {
      props: {
        lastPage: 2,
        total: 20,
        page: 2,
        'onUpdate:page': (page: number) =>
          wrapper.setProps({ page, lastPage: 1 }),
      },
      attachTo: document.body,
    });

    const prev = wrapper.get('.prev-page-button').element as HTMLButtonElement;
    prev.focus();
    await wrapper.get('.prev-page-button').trigger('click');
    await nextTick();

    expect(
      document.activeElement?.classList.contains('current-page-wrapper'),
    ).toBe(true);
  });
});

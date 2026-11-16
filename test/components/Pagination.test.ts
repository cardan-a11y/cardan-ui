import { describe, it, expect } from 'vitest';
import { nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Pagination } from '#components';
import { accessibleName, checkA11y, expectFocused, roleOf } from '../a11y';

async function mountPagination(
  props: { page: number; lastPage: number },
  /** What the parent does with a new page: by default, show it */
  onPage?: (page: number) => Record<string, unknown>,
) {
  const wrapper = await mountSuspended(Pagination, {
    props: {
      total: props.lastPage * 10,
      ...props,
      'onUpdate:page': (page: number) =>
        wrapper.setProps(onPage ? onPage(page) : { page }),
    },
    attachTo: document.body,
  });

  /** The button with this name */
  const button = (name: string) => {
    const found = wrapper
      .findAll('button')
      .find((button) => accessibleName(button) === name);
    if (!found) throw new Error(`No button named ${name}`);
    return found.element as HTMLButtonElement;
  };

  /** The element with the page count */
  const pageCount = () => {
    const found = wrapper
      .findAll('nav *')
      .find((element) => /^page \d+ of \d+$/.test(element.text()));
    if (!found) throw new Error('No page count');
    return found.element as HTMLElement;
  };

  /** Clicks a button that has focus, as a keyboard user does */
  const activate = async (name: string) => {
    button(name).focus();
    button(name).click();
    // The new page, then the focus that follows it
    await nextTick();
    await nextTick();
  };

  return { wrapper, button, pageCount, activate };
}

describe('Pagination', () => {
  it('is a labelled navigation of named buttons around the page count', async () => {
    const { wrapper, button, pageCount } = await mountPagination({
      page: 1,
      lastPage: 3,
    });

    const nav = wrapper.get('nav');
    expect(roleOf(nav)).toBe('navigation');
    expect(accessibleName(nav)).toBe('Pagination');

    expect(
      nav.findAll('button').map((button) => accessibleName(button)),
    ).toEqual(['First page', 'Previous page', 'Next page', 'Last page']);
    expect(pageCount().textContent?.trim()).toBe('page 1 of 3');

    // On the first page the way back is disabled, the way on is not
    expect(button('First page').disabled).toBe(true);
    expect(button('Previous page').disabled).toBe(true);
    expect(button('Next page').disabled).toBe(false);
    expect(button('Last page').disabled).toBe(false);

    // The page size is a named field
    expect(accessibleName(wrapper.get('select'))).toBe('items per page');

    expect(await checkA11y()).toHaveNoViolations();
  });

  it('goes to the page a button names', async () => {
    const { wrapper, pageCount, activate } = await mountPagination({
      page: 2,
      lastPage: 5,
    });

    await activate('Next page');
    expect(pageCount().textContent?.trim()).toBe('page 3 of 5');

    await activate('Last page');
    expect(pageCount().textContent?.trim()).toBe('page 5 of 5');

    await activate('First page');
    expect(pageCount().textContent?.trim()).toBe('page 1 of 5');

    expect(wrapper.emitted('update:page')).toEqual([[3], [5], [1]]);
  });

  it('keeps focus on the button when it still applies', async () => {
    const { button, activate } = await mountPagination({
      page: 2,
      lastPage: 5,
    });

    await activate('Next page');

    expectFocused(button('Next page'));
  });

  it('moves focus to the way back when the button under it is disabled on the last page', async () => {
    const { button, activate } = await mountPagination({
      page: 1,
      lastPage: 2,
    });

    await activate('Next page');
    expect(button('Next page').disabled).toBe(true);
    expectFocused(button('Previous page'));
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('moves focus to the way on when the button under it is disabled on the first page', async () => {
    const { button, activate } = await mountPagination({
      page: 3,
      lastPage: 3,
    });

    await activate('First page');
    expect(button('First page').disabled).toBe(true);
    expectFocused(button('Next page'));
  });

  it('moves focus to the page count when no button applies', async () => {
    // The list shrank to a single page as it went back to the first
    const { button, pageCount, activate } = await mountPagination(
      { page: 2, lastPage: 2 },
      (page) => ({ page, lastPage: 1 }),
    );

    await activate('Previous page');

    for (const name of ['First page', 'Previous page', 'Next page']) {
      expect(button(name).disabled).toBe(true);
    }
    expectFocused(pageCount());
    expect(pageCount().textContent?.trim()).toBe('page 1 of 1');
  });

  it.todo(
    'announces the new page count: it is no status, so after Next with focus kept on the button (revealResults) nothing says the page changed; a role="status" would also speak next to focusResults, the owner decides',
  );
});

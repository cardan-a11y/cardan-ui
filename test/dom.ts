import { beforeAll, onTestFinished, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { useRouter } from '#imports';
import type { Target } from './a11y';

/**
 * A `keydown` on `document.activeElement`, then a tick; returns the event. No
 * default action follows in happy-dom: Tab does not move focus, Enter does not click.
 */
export async function press(
  key: string,
  init: KeyboardEventInit = {},
): Promise<KeyboardEvent> {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  (document.activeElement ?? document.body).dispatchEvent(event);
  await nextTick();
  return event;
}

/**
 * A press and a release on a modal `<dialog>`'s backdrop, as Dialog and
 * MobileMenu want them (`useBackdropClick()`). happy-dom has no layout: the
 * dialog's box is 0 by 0 at the origin, so (10, 10) is outside it. Whether a
 * point in the panel counts is for the browser suite.
 */
export function clickBackdrop(dialog: HTMLDialogElement) {
  const at = { bubbles: true, clientX: 10, clientY: 10 };
  dialog.dispatchEvent(new PointerEvent('pointerdown', at));
  dialog.dispatchEvent(new MouseEvent('click', at));
}

const added = new Set<Element>();

/**
 * Adds one element (`html`) next to the component under test and returns it;
 * removed after the test.
 */
export function addToPage(html: string): HTMLElement {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const [element, ...rest] = Array.from(template.content.children);

  if (!(element instanceof HTMLElement) || rest.length) {
    throw new Error('addToPage takes the html of one element');
  }

  document.body.append(element);
  added.add(element);
  onTestFinished(() => {
    element.remove();
    added.delete(element);
  });
  return element;
}

/** Removes what `addToPage()` added; it already does so after each test. */
export function removeAddedToPage() {
  for (const element of added) element.remove();
  added.clear();
}

/**
 * Fires a popover's `toggle` event, then waits a tick. happy-dom has no Popover
 * API: this proves what the component does on the event, not what the browser does.
 */
export async function toggle(
  target: Target,
  newState: 'open' | 'closed',
): Promise<void> {
  const element = target instanceof Element ? target : target.element;
  const event = new Event('toggle');
  Object.defineProperties(event, {
    newState: { value: newState },
    oldState: { value: newState === 'open' ? 'closed' : 'open' },
  });
  element.dispatchEvent(event);
  await nextTick();
}

/**
 * Fakes the Popover API on `element`: the `:popover-open` state, spied
 * `showPopover()` and `hidePopover()`, and `show()` as the browser opening it.
 * Proves what the component does, not the top layer, anchoring or light dismiss.
 */
export function fakePopover(element: HTMLElement) {
  let open = false;
  const matches = element.matches.bind(element);
  element.matches = ((selector: string) =>
    selector === ':popover-open'
      ? open
      : matches(selector)) as typeof element.matches;

  const showPopover = vi.fn(() => {
    if (open) return;
    open = true;
    void toggle(element, 'open');
  });
  const hidePopover = vi.fn(() => {
    if (!open) return;
    open = false;
    void toggle(element, 'closed');
  });
  element.showPopover = showPopover;
  element.hidePopover = hidePopover;

  return {
    showPopover,
    hidePopover,
    isOpen: () => open,
    async show() {
      open = true;
      await toggle(element, 'open');
      await nextTick();
    },
  };
}

/** A bubbling `focusout` from `from` with `to` as `relatedTarget`; moves no focus. */
export function leave(from: Element, to: Element | null) {
  from.dispatchEvent(
    new FocusEvent('focusout', { relatedTarget: to, bubbles: true }),
  );
}

/**
 * Waits until `useRouteFocus()` has moved focus, after `await useRouter().push(…)`.
 * Not with fake timers.
 */
export async function afterRouteFocus(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve));
  await nextTick();
}

/**
 * Pages of an app at these paths (`'/courses/:id'`), rendering nothing, for
 * the file's tests: a link or a navigation to a path no route matches makes
 * Vue Router warn, which fails the test (test/console-setup.ts). Call it at
 * the top of the file or a `describe`.
 */
export function addRoutes(...paths: string[]) {
  const page = defineComponent({ render: () => null });
  beforeAll(() => {
    const router = useRouter();
    const known = new Set(router.getRoutes().map((route) => route.path));
    for (const path of paths.filter((path) => !known.has(path)))
      router.addRoute({ path, component: page });
  });
}

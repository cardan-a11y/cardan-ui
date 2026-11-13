import { onTestFinished } from 'vitest';
import { nextTick } from 'vue';
import type { Target } from './a11y';

/**
 * Presses a key where focus is: a bubbling, cancelable `keydown` on
 * `document.activeElement` (the body when nothing has focus), then waits a
 * tick for Vue to render. Returns the event, so a test can check
 * `defaultPrevented`.
 *
 * Proves what the component's own key handlers do. No default action
 * follows in happy-dom: Tab does not move focus, Enter and Space do not
 * click, Enter does not submit, arrow keys do not move a caret or a range.
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

const added = new Set<Element>();

/**
 * Adds an element to the page, next to the component under test: a button
 * that had focus before a dialog opened, a field outside a form. `html` is
 * one element (with any content); that element is returned. It is removed
 * again when the test finishes, passed or failed. Not by a setup file's
 * `afterEach`: vitest gives a setup file a module instance of this file of
 * its own, so what a test added was never in the setup's list, and stayed
 * on the page for the next test's axe run.
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

/**
 * Removes what `addToPage()` added and is still on the page, in the module
 * instance it is called from. `addToPage()` removes its own after each test,
 * so a setup file need not call this; the projects' setups still do.
 */
export function removeAddedToPage() {
  for (const element of added) element.remove();
  added.clear();
}

/**
 * Sends the `toggle` event the browser fires after a popover is shown or
 * hidden, then waits a tick. happy-dom has no Popover API (no
 * `showPopover`, no ToggleEvent, no top layer): this proves what the
 * component does on the event, not that the browser opens it, moves it to
 * the top layer or light-dismisses it.
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
 * Waits until `useRouteFocus()` has moved focus after a navigation: a
 * render, then the timeout it waits for the new page. Call it after
 * `await useRouter().push(…)`. Does not work with fake timers.
 */
export async function afterRouteFocus(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve));
  await nextTick();
}

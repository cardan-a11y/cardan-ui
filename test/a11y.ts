import { expect } from 'vitest';
import axeCore from 'axe-core';
import { axe } from 'vitest-axe';

/**
 * axe over the whole document, so a component with several root nodes is
 * checked together with its label, without the landmark rule: a component
 * is not a page.
 *
 * In happy-dom axe sees no component styles and no layout: it never checks
 * contrast, visibility, inert content or focus order. It does pin ARIA
 * validity, names, labels and id references.
 */
export function checkA11y() {
  return axe(document.body, { rules: { region: { enabled: false } } });
}

/** An element, or what `find()` or `get()` of @vue/test-utils returns */
export type Target = Element | { element: Element };

function elementOf(target: Target): Element {
  return target instanceof Element ? target : target.element;
}

/** The parts of axe-core's internals the helpers use, which it does not type */
interface AxeInternals {
  utils: { getNodeFromTree: (node: Element) => unknown };
  commons: {
    text: { accessibleTextVirtual: (node: unknown) => string };
    aria: { getRole: (node: unknown) => string | null };
  };
}

/** Runs one of axe's computations on a tree of the current document. */
function withAxe<T>(target: Target, compute: (node: unknown) => T): T {
  const element = elementOf(target);
  if (!element.isConnected) {
    throw new Error('The element must be in the document: mount with attachTo');
  }

  const internals = axeCore as unknown as AxeInternals;
  axeCore.setup(document.body);
  try {
    return compute(internals.utils.getNodeFromTree(element));
  } finally {
    axeCore.teardown();
  }
}

/**
 * The accessible name, as axe computes it (accname: aria-labelledby,
 * aria-label, a label element, content for the roles named by it, title).
 * Proves what a screen reader would announce as the name, except where the
 * name depends on CSS (content hidden with `display: none` in a component's
 * stylesheet still counts here). The element must be in the document.
 */
export function accessibleName(target: Target): string {
  return withAxe(target, (node) =>
    (axeCore as unknown as AxeInternals).commons.text.accessibleTextVirtual(
      node,
    ),
  );
}

/**
 * The role, explicit or implicit (`button`, `link`, `navigation` …), as axe
 * computes it; null without one. The element must be in the document.
 */
export function roleOf(target: Target): string | null {
  return withAxe(target, (node) =>
    (axeCore as unknown as AxeInternals).commons.aria.getRole(node),
  );
}

/**
 * The accessible description: the texts of the elements that
 * `aria-describedby` names, in its order, joined by a space; '' without it.
 * Throws when an id names no element, so a dangling reference fails the
 * test. Reads `textContent`, so text that CSS hides still counts.
 */
export function description(target: Target): string {
  const element = elementOf(target);
  const ids = (element.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter(Boolean);

  return ids
    .map((id) => {
      const described = element.ownerDocument.getElementById(id);
      if (!described) {
        throw new Error(`aria-describedby names "${id}", which is not there`);
      }
      return (described.textContent ?? '').replace(/\s+/g, ' ').trim();
    })
    .filter(Boolean)
    .join(' ');
}

const focusableSelector = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'iframe',
  'summary',
  '[tabindex]',
  '[contenteditable]:not([contenteditable="false"])',
].join(', ');

/**
 * Focus is on the element, and the element can take focus: focusable by
 * nature or by a tabindex (also -1, a programmatic target), not disabled,
 * and not inside an `[inert]`, `[hidden]` or closed `<dialog>` element.
 *
 * happy-dom focuses anything, so `document.activeElement` alone only proves
 * that the component called `focus()`; this also proves it called it on
 * something a browser would focus. It cannot see CSS (`display: none` from
 * a stylesheet, `visibility`) or whether focus is visible.
 */
export function expectFocused(target: Target) {
  const element = elementOf(target);

  expect(document.activeElement, 'focus is on the element').toBe(element);
  expect(element.matches(focusableSelector), 'the element is focusable').toBe(
    true,
  );
  expect(element.matches(':disabled'), 'the element is not disabled').toBe(
    false,
  );
  expect(
    element.closest('[inert], [hidden], dialog:not([open])'),
    'no inert, hidden or closed dialog around the element',
  ).toBeNull();
}

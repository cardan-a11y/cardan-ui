import { expect } from 'vitest';
import axeCore from 'axe-core';
import { axe } from 'vitest-axe';

/**
 * axe over the whole document, without the landmark rule. In happy-dom it pins
 * ARIA validity, names, labels and id references, not contrast, visibility or focus.
 */
export function checkA11y() {
  return axe(document.body, { rules: { region: { enabled: false } } });
}

/** An element, or what `find()` or `get()` of @vue/test-utils returns */
export type Target = Element | { element: Element };

function elementOf(target: Target): Element {
  return target instanceof Element ? target : target.element;
}

interface AxeInternals {
  utils: { getNodeFromTree: (node: Element) => unknown };
  commons: {
    text: { accessibleTextVirtual: (node: unknown) => string };
    aria: { getRole: (node: unknown) => string | null };
  };
}

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
 * The accessible name, as axe computes it; CSS-hidden content still counts.
 * The element must be in the document.
 */
export function accessibleName(target: Target): string {
  return withAxe(target, (node) =>
    (axeCore as unknown as AxeInternals).commons.text.accessibleTextVirtual(
      node,
    ),
  );
}

/** The role, explicit or implicit, as axe computes it; null without one. In the document only. */
export function roleOf(target: Target): string | null {
  return withAxe(target, (node) =>
    (axeCore as unknown as AxeInternals).commons.aria.getRole(node),
  );
}

/**
 * The texts `aria-describedby` names, in order, joined by a space; '' without it.
 * Throws on an id that names no element. CSS-hidden text still counts.
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
 * Focus is on the element, and a browser would focus it: focusable, not
 * disabled, not in `[inert]`, `[hidden]` or a closed `<dialog>`. Blind to CSS.
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

import { axe } from 'vitest-axe';

/**
 * axe over the whole document, so a component with several root nodes is
 * checked together with its label, without the landmark rule: a component
 * is not a page.
 */
export function checkA11y() {
  return axe(document.body, { rules: { region: { enabled: false } } });
}

import type { Page } from '@playwright/test';
import { expect, test } from './test';
import { gotoHydrated } from './helpers';

/** A button in the panel that reaches past its end */
async function addOverflowingProbe(page: Page, triggerName: string) {
  const trigger = page.getByRole('button', { name: triggerName });
  const id = await trigger.getAttribute('aria-controls');
  await page.locator(`[id="${id}"]`).evaluate((panel) => {
    const holder = document.createElement('div');
    holder.style.height = '0';
    holder.innerHTML =
      '<button type="button" style="display: block; height: 3rem">Past the end</button>';
    (panel.querySelector('.accordion-panel') ?? panel).append(holder);
  });
  return trigger;
}

const probeIsHit = (page: Page) =>
  page.locator('button', { hasText: 'Past the end' }).evaluate((probe) => {
    const { left, width, bottom } = probe.getBoundingClientRect();
    return document.elementFromPoint(left + width / 2, bottom - 4) === probe;
  });

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`Accordion (${reducedMotion} motion): content past an open panel is not cut off`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await gotoHydrated(page, '/accordion');
    const trigger = await addOverflowingProbe(
      page,
      'Accordion with the icon at the start',
    );

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page
      .locator('button', { hasText: 'Past the end' })
      .scrollIntoViewIfNeeded();

    await expect.poll(() => probeIsHit(page)).toBe(true);

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => probeIsHit(page)).toBe(false);
  });
}

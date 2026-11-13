/**
 * Content out of view is out of the tab order too, which only a browser's
 * real tab order shows (happy-dom focuses anything). Where a panel has no
 * control of its own in the playground, the test puts a button in it.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { focusWalk, gotoHydrated, tabOrder } from './helpers';

/** A button added to the end of `container`, for a panel without controls */
async function addButton(container: Locator, name: string) {
  await container.evaluate((el, name) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    el.append(button);
  }, name);
  return container.getByRole('button', { name, includeHidden: true });
}

/** The panel a control points at with `aria-controls` */
function controlled(page: Page, control: Locator) {
  return control
    .getAttribute('aria-controls')
    .then((id) => page.locator(`[id="${id}"]`));
}

test('Accordion: a closed panel is out of the tab order, an open one is in it', async ({
  page,
}) => {
  await gotoHydrated(page, '/accordion');
  const trigger = page.getByRole('button', {
    name: 'Accordion with the icon at the start',
  });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  const probe = await addButton(
    await controlled(page, trigger),
    'In the panel',
  );

  await trigger.focus();
  const closed = await focusWalk(page, 1);
  expect(closed[0]!.label).not.toBe('button "In the panel"');

  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(probe).toBeFocused();
});

test('Tabs: only the selected panel is in the tab order', async ({ page }) => {
  await gotoHydrated(page, '/tabs');
  const tabs = page.getByRole('tab');
  const unselected = tabs.and(page.locator('[aria-selected="false"]')).first();
  const probe = await addButton(
    await controlled(page, unselected),
    'In a hidden panel',
  );

  const stops = await tabOrder(page);
  expect(stops.map((stop) => stop.label)).not.toContain(
    'button "In a hidden panel"',
  );

  // Selected, its panel is reachable
  await unselected.click();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tabpanel')).toBeFocused();
  await expect(probe).toBeVisible();
  expect((await tabOrder(page)).map((stop) => stop.label)).toContain(
    'button "In a hidden panel"',
  );
});

test("AppSidebar: hidden below the app's menu width, its links are out of the tab order", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await gotoHydrated(page, '/layout');
  const sidebar = page.getByRole('complementary', {
    name: 'Sidebar menu',
    includeHidden: true,
  });
  await expect(sidebar).toBeHidden();

  const inSidebar = await sidebar
    .getByRole('link', { includeHidden: true })
    .count();
  expect(inSidebar).toBeGreaterThan(0);
  const stops = await tabOrder(page);
  const sidebarLinks = await sidebar
    .getByRole('link', { includeHidden: true })
    .evaluateAll((links) =>
      links.map((a) => a.textContent?.replace(/\s+/g, ' ').trim()),
    );
  // The same links are in the header's menu, which is closed: none of them
  for (const name of sidebarLinks) {
    expect(stops.map((stop) => stop.label)).not.toContain(`a "${name}"`);
  }
});

test('AppSidebar: collapsed to a rail, its links stay in the tab order with their names', async ({
  page,
}) => {
  await gotoHydrated(page, '/layout');
  const sidebar = page.getByRole('complementary', { name: 'Demo sidebar' });
  const toggle = sidebar.getByRole('button', { name: 'Demo sidebar' });

  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  // The text is out of view only: still the name, still reachable
  const first = sidebar.getByRole('button', { name: 'Dashboard' });
  await expect(first).toBeVisible();
  await first.focus();
  const stops = await focusWalk(page, 3);
  expect(stops.map((stop) => stop.label)).toEqual([
    'button "My progress"',
    'button "Catalog"',
    'button "My account"',
  ]);
});

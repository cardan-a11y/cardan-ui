import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect, test } from './test';
import { gotoHydrated } from './helpers';

/**
 * VideoPlayer and YouTube ask no other origin before the click (the guard in
 * ./network.ts fails the test on any such request); then only the player's frame.
 */

const isPlayer = (url: URL) =>
  url.host === 'www.youtube-nocookie.com' && url.pathname.startsWith('/embed/');

/** Every thumbnail loaded, from the page's own origin */
async function expectOwnThumbnails(page: Page, scope: Locator) {
  const images = scope.locator('img');
  expect(await images.count()).toBeGreaterThan(0);

  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.complete))
      .toBe(true);
    const src = await image.evaluate((img: HTMLImageElement) => img.currentSrc);
    expect(new URL(src).origin).toBe(new URL(page.url()).origin);
  }
}

test('/video asks no other origin before the click, then only the player, which takes focus', async ({
  page,
  otherOrigins,
}) => {
  await gotoHydrated(page, '/video');
  const player = page.locator('.video-player').first();
  await expectOwnThumbnails(page, page.locator('main'));
  expect(otherOrigins.problems()).toEqual([]);

  otherOrigins.answer(
    isPlayer,
    { body: '<!doctype html><title>Player</title>', contentType: 'text/html' },
    'the YouTube player frame',
  );
  await player.getByRole('button', { name: /^Play video/ }).focus();
  await page.keyboard.press('Enter');

  const frame = player.locator('iframe');
  await expect(frame).toHaveAttribute('title', /^Video/);
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.tagName))
    .toBe('IFRAME');
});

test('a bare video link in MarkdownPreview asks no other origin before the click', async ({
  page,
}) => {
  await gotoHydrated(page, '/markdown');
  const player = page.locator('.cardan-markdown-preview .video-player').first();
  await player.scrollIntoViewIfNeeded();
  await expectOwnThumbnails(page, player);
});

test("YouTube's server render links nothing on YouTube's image host, also above the fold", async ({
  request,
}) => {
  const html = await (await request.get('/video')).text();
  const links = html.match(/<link\b[^>]*>/g) ?? [];

  expect(
    links.filter(
      (link) =>
        /i\.ytimg\.com/.test(link) && /rel="(preconnect|preload)"/.test(link),
    ),
  ).toEqual([]);
});

/** How often the suite's fake oEmbed (.playground/server/routes/_fake-oembed) was asked for a YouTube video */
async function oEmbedCount(request: APIRequestContext, id: string) {
  const url = `https://www.youtube.com/watch?v=${id}`;
  const answer = await request.get(
    `/_fake-oembed/count?url=${encodeURIComponent(url)}`,
  );
  return ((await answer.json()) as { count: number }).count;
}

test('the video route answers each video with its own title, also where only the slash differs', async ({
  request,
}) => {
  const titles = [];
  for (const path of ['vimeo/76979871/9', 'vimeo/769798719']) {
    const answer = await request.get(`/_cardan/video/${path}`);
    expect(answer.status(), path).toBe(200);
    titles.push(((await answer.json()) as { title: string }).title);
  }

  expect(titles).toEqual([
    `Fake vimeo: https://vimeo.com/76979871/9`,
    `Fake vimeo: https://vimeo.com/769798719`,
  ]);
});

test('the video route keeps an answer, not a failure', async ({ request }) => {
  const run = Date.now();
  const ok = `ok-${run}`;
  const fails = `fails-${run}`;

  for (let i = 0; i < 2; i++) {
    expect((await request.get(`/_cardan/video/youtube/${ok}`)).status()).toBe(
      200,
    );
    expect(
      (await request.get(`/_cardan/video/youtube/${fails}`)).status(),
    ).toBe(502);
  }

  expect(await oEmbedCount(request, ok)).toBe(1);
  expect(await oEmbedCount(request, fails)).toBe(2);
});

test('the video route gives up on the provider after 3 seconds, without asking again', async ({
  request,
}) => {
  const slow = `slow-${Date.now()}`;
  const start = Date.now();

  const answer = await request.get(`/_cardan/video/youtube/${slow}`);

  expect(answer.status()).toBe(502);
  expect(Date.now() - start).toBeGreaterThanOrEqual(2900);
  expect(Date.now() - start).toBeLessThan(5000);
  expect(await oEmbedCount(request, slow)).toBe(1);
});

test('the video route refuses anything that is no video', async ({
  request,
}) => {
  for (const path of [
    'example/dQw4w9WgXcQ',
    'youtube/dQw4w9WgXcQ/abc',
    'youtube/abc%2F..%2Fx',
    'youtube/abc%22%3E%3Cb%3E',
    'vimeo/abc',
    'vimeo/76979871/82-72',
    'vimeo/76979871/8272103f6e/more',
  ]) {
    const response = await request.get(`/_cardan/video/${path}`);
    expect(response.status(), path).toBe(400);
  }
});

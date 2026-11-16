import { describe, it, expect, vi, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { VideoPlayer } from '#components';
import { accessibleName, checkA11y, expectFocused } from '../a11y';

/**
 * A thumbnail and a play button named with the video's title; after a
 * click the player, with a title, takes focus. The players' single-key
 * shortcuts are off on purpose (WCAG 2.1.4). The oEmbed metadata comes from
 * a stubbed `$fetch`: no network.
 */
const { fetchMetadata } = vi.hoisted(() => ({ fetchMetadata: vi.fn() }));
mockNuxtImport('$fetch', () => fetchMetadata);

async function mountPlayer(url: string, metadata?: VideoMetaData) {
  fetchMetadata.mockImplementation(async () => {
    if (!metadata) throw new Error('offline');
    return metadata;
  });

  const wrapper = await mountSuspended(VideoPlayer, {
    props: { url },
    attachTo: document.body,
  });

  return { wrapper };
}

const metadata = {
  title: 'Cardan intro',
  width: 1280,
  height: 720,
  thumbnail_url: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
} as VideoMetaData;

afterEach(() => {
  fetchMetadata.mockReset();
  clearNuxtData();
});

describe('VideoPlayer', () => {
  it('has a play button and a thumbnail named with the title', async () => {
    const { wrapper } = await mountPlayer(
      'https://youtu.be/dQw4w9WgXcQ',
      metadata,
    );

    const button = wrapper.get('button').element;
    await vi.waitFor(() =>
      expect(accessibleName(button)).toBe('Play video: Cardan intro'),
    );
    expect(fetchMetadata).toHaveBeenCalledOnce();
    expect(wrapper.get('img').attributes('alt')).toBe('Cardan intro');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('starts a titled YouTube player without key shortcuts, and moves focus into it', async () => {
    const { wrapper } = await mountPlayer(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      metadata,
    );
    await vi.waitFor(() =>
      expect(accessibleName(wrapper.get('button').element)).toContain(
        'Cardan intro',
      ),
    );

    await wrapper.get('button').trigger('click');
    await nextTick();

    const iframe = wrapper.get('iframe');
    expect(iframe.attributes('title')).toBe('Video: Cardan intro');
    expectFocused(iframe.element);
    expect(wrapper.find('button').exists()).toBe(false);

    const src = new URL(iframe.attributes('src')!);
    expect(src.hostname).toBe('www.youtube-nocookie.com');
    expect(src.searchParams.get('disablekb')).toBe('1');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('starts a Vimeo player without key shortcuts', async () => {
    const { wrapper } = await mountPlayer('https://vimeo.com/76979871');

    await wrapper.get('button').trigger('click');
    await nextTick();

    const src = new URL(wrapper.get('iframe').attributes('src')!);
    expect(src.hostname).toBe('player.vimeo.com');
    expect(src.searchParams.get('keyboard')).toBe('0');
  });

  it('still names the button and the player without metadata, with a decorative thumbnail', async () => {
    const { wrapper } = await mountPlayer('https://youtu.be/aaaaaaaaaaa');
    await vi.waitFor(() => expect(fetchMetadata).toHaveBeenCalled());
    await nextTick();

    expect(accessibleName(wrapper.get('button').element)).toBe('Play video');
    expect(wrapper.get('img').attributes('alt')).toBe('');
    expect(await checkA11y()).toHaveNoViolations();

    await wrapper.get('button').trigger('click');
    await nextTick();

    expect(wrapper.get('iframe').attributes('title')).toBe('Video');
    expectFocused(wrapper.get('iframe').element);
  });
});

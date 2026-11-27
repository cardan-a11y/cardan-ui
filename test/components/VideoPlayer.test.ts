import { describe, it, expect, vi, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { VideoPlayer } from '#components';
import { accessibleName, expectNoViolations } from '../a11y';

/**
 * A thumbnail and a play button named with the video's title; after a
 * click the player, with a title. The players' single-key shortcuts are off
 * on purpose (WCAG 2.1.4). Title and size come from the layer's own route,
 * through a stubbed `$fetch`; nothing asks the provider before the click.
 * That the player takes focus only a browser shows (test/browser/video.spec.ts).
 */
const { fetchMetadata } = vi.hoisted(() => ({ fetchMetadata: vi.fn() }));
mockNuxtImport('$fetch', () => fetchMetadata);

async function mountPlayer(
  url: string,
  metadata?: VideoMetaData | 'never',
  props: { title?: string } = {},
) {
  fetchMetadata.mockImplementation(() => {
    if (metadata === 'never') return new Promise(() => {});
    if (!metadata) return Promise.reject(new Error('offline'));
    return Promise.resolve(metadata);
  });

  const wrapper = await mountSuspended(VideoPlayer, {
    props: { url, ...props },
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

const options = { timeout: 3500, retry: false };

function expectSameOrigin(src: string | undefined) {
  expect(new URL(src!, window.location.href).origin).toBe(
    window.location.origin,
  );
}

afterEach(() => {
  fetchMetadata.mockReset();
  clearNuxtData();
});

describe('VideoPlayer', () => {
  it('has a play button and a thumbnail named with the title, all from its own origin', async () => {
    const { wrapper } = await mountPlayer(
      'https://youtu.be/dQw4w9WgXcQ',
      metadata,
    );

    const button = wrapper.get('button').element;
    await vi.waitFor(() =>
      expect(accessibleName(button)).toBe('Play video: Cardan intro'),
    );
    expect(fetchMetadata).toHaveBeenCalledExactlyOnceWith(
      '/_cardan/video/youtube/dQw4w9WgXcQ',
      options,
    );
    expect(wrapper.get('img').attributes('alt')).toBe('Cardan intro');
    expectSameOrigin(wrapper.get('img').attributes('src'));
    expect(wrapper.find('iframe').exists()).toBe(false);
    await expectNoViolations();
  });

  it('starts a titled YouTube player without key shortcuts', async () => {
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
    expect(wrapper.find('button').exists()).toBe(false);

    const src = new URL(iframe.attributes('src')!);
    expect(src.hostname).toBe('www.youtube-nocookie.com');
    expect(src.searchParams.get('disablekb')).toBe('1');
    await expectNoViolations();
  });

  it('starts a Vimeo player without key shortcuts, asking for an unlisted one with its hash', async () => {
    const { wrapper } = await mountPlayer(
      'https://vimeo.com/76979871/8272103f6e',
    );
    expect(fetchMetadata).toHaveBeenCalledExactlyOnceWith(
      '/_cardan/video/vimeo/76979871/8272103f6e',
      options,
    );

    await wrapper.get('button').trigger('click');
    await nextTick();

    const src = new URL(wrapper.get('iframe').attributes('src')!);
    expect(src.hostname).toBe('player.vimeo.com');
    expect(src.searchParams.get('keyboard')).toBe('0');
    expect(src.searchParams.get('h')).toBe('8272103f6e');
  });

  it('renders while the request does not answer, with YouTube’s thumbnail from the id', async () => {
    const { wrapper } = await mountPlayer(
      'https://youtu.be/aaaaaaaaaaa',
      'never',
    );

    expect(fetchMetadata).toHaveBeenCalledExactlyOnceWith(
      '/_cardan/video/youtube/aaaaaaaaaaa',
      options,
    );
    expect(accessibleName(wrapper.get('button').element)).toBe('Play video');
    const img = wrapper.get('img');
    expectSameOrigin(img.attributes('src'));
    expect(img.attributes('src')).toContain('aaaaaaaaaaa');
    expect(wrapper.get('figure').attributes('style')).toContain(
      `--video-player-aspect-ratio: ${16 / 9}`,
    );
  });

  it('still names the button and the player without metadata, with a decorative thumbnail', async () => {
    const { wrapper } = await mountPlayer('https://youtu.be/aaaaaaaaaaa');
    await vi.waitFor(() => expect(fetchMetadata).toHaveBeenCalled());
    await nextTick();

    expect(accessibleName(wrapper.get('button').element)).toBe('Play video');
    expect(wrapper.get('img').attributes('alt')).toBe('');
    await expectNoViolations();

    await wrapper.get('button').trigger('click');
    await nextTick();

    expect(wrapper.get('iframe').attributes('title')).toBe('Video');
  });

  it('takes the title from its prop without a request', async () => {
    const { wrapper } = await mountPlayer(
      'https://youtu.be/dQw4w9WgXcQ',
      metadata,
      { title: 'Our own title' },
    );

    expect(accessibleName(wrapper.get('button').element)).toBe(
      'Play video: Our own title',
    );
    expect(fetchMetadata).not.toHaveBeenCalled();
  });

  it('renders a URL that is no video as a link, without a request or a player', async () => {
    const { wrapper } = await mountPlayer('https://example.com/talk', metadata);

    expect(wrapper.get('a').attributes('href')).toBe(
      'https://example.com/talk',
    );
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.find('img').exists()).toBe(false);
    expect(fetchMetadata).not.toHaveBeenCalled();
    await expectNoViolations();
  });

  it('renders nothing for a URL that is no web address', async () => {
    const { wrapper } = await mountPlayer('javascript:alert(1)', metadata);

    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.find('button').exists()).toBe(false);
    expect(fetchMetadata).not.toHaveBeenCalled();
  });
});

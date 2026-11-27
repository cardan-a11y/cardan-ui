import { describe, it, expect } from 'vitest';
import {
  cacheKey,
  OEMBED_FETCH,
  oEmbedUrl,
  pickMetadata,
  videoFromPath,
} from '../../server/lib/video';

// The layer's runtimeConfig.cardanUi, the providers' own endpoints
const endpoints = {
  oembedYoutube: 'https://www.youtube.com/oembed',
  oembedVimeo: 'https://vimeo.com/api/oembed.json',
};

/**
 * VideoPlayer's route `/_cardan/video/<provider>/<id>[/<hash>]` asks the
 * provider only for a video parseVideoUrl() accepts, at an address it builds
 * itself: no open proxy. test/browser/video.spec.ts asks the built route.
 */
describe('the video route', () => {
  it.each([
    [
      'youtube/dQw4w9WgXcQ',
      'https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ&format=json',
    ],
    [
      'youtube/a1_B-c2',
      'https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Da1_B-c2&format=json',
    ],
    [
      'vimeo/76979871',
      'https://vimeo.com/api/oembed.json?url=https%3A%2F%2Fvimeo.com%2F76979871&width=960&height=540',
    ],
    [
      'vimeo/76979871/8272103f6e',
      'https://vimeo.com/api/oembed.json?url=https%3A%2F%2Fvimeo.com%2F76979871%2F8272103f6e&width=960&height=540',
    ],
  ])('asks for %s at %s', (path, url) => {
    const video = videoFromPath(path);

    expect(video).toBeDefined();
    expect(oEmbedUrl(video!, endpoints)).toBe(url);
  });

  it('asks the provider once, for at most 3 seconds', () => {
    expect(OEMBED_FETCH).toStrictEqual({ timeout: 3000, retry: false });
  });

  it('gives paths a key of their own that survives Nitro’s escaping', () => {
    // Nitro's escapeKey() in nitropack's runtime/internal/cache.mjs
    const escape = (key: string) => key.replace(/\W/g, '');
    const paths = [
      'vimeo/76979871/9',
      'vimeo/769798719',
      'youtube/a-b',
      'youtube/ab',
      'youtube/a_b',
    ];
    const keys = paths.map((path) => escape(cacheKey(path)));

    expect(new Set(keys).size).toBe(paths.length);
    expect(keys).toStrictEqual(paths.map(cacheKey));
  });

  it.each([
    ['another provider', 'example/dQw4w9WgXcQ'],
    ['no id', 'youtube'],
    ['an empty id', 'youtube/'],
    ['a YouTube id with a hash', 'youtube/dQw4w9WgXcQ/abc'],
    ['a YouTube id with markup', 'youtube/dQw<b>4w9'],
    ['an encoded slash', 'youtube/abc%2F..%2Fx'],
    ['an encoded query', 'youtube/abc%3Fx%3D1'],
    ['a path up', 'youtube/../vimeo'],
    ['a Vimeo id with letters', 'vimeo/7697abc'],
    ['a Vimeo hash with other characters', 'vimeo/76979871/82721-03f6e'],
    ['an encoded Vimeo hash', 'vimeo/76979871/abc%26url%3Dx'],
    ['an empty Vimeo hash', 'vimeo/76979871/'],
    ['a segment after the hash', 'vimeo/76979871/8272103f6e/x'],
    ['a full URL', 'https://youtu.be/dQw4w9WgXcQ'],
    ['nothing', ''],
  ])('refuses %s', (_, path) => {
    expect(videoFromPath(path)).toBeUndefined();
  });

  it('passes on only what VideoPlayer reads, and a thumbnail from the image domains only', () => {
    expect(
      pickMetadata({
        title: 'Cardan intro',
        width: 1280,
        height: 720,
        thumbnail_url: 'https://i.vimeocdn.com/video/1.jpg',
        html: '<iframe src="https://player.vimeo.com/video/1"></iframe>',
        author_url: 'https://vimeo.com/cardan',
      }),
    ).toStrictEqual({
      title: 'Cardan intro',
      width: 1280,
      height: 720,
      thumbnail_url: 'https://i.vimeocdn.com/video/1.jpg',
    });

    for (const thumbnail of [
      'https://tracker.example.com/1.jpg',
      'http://i.ytimg.com/vi/1/hqdefault.jpg',
      'javascript:alert(1)',
    ]) {
      expect(pickMetadata({ thumbnail_url: thumbnail }).thumbnail_url).toBe(
        undefined,
      );
    }
    expect(pickMetadata({ width: '1280', title: 1 })).toStrictEqual({
      title: undefined,
      width: undefined,
      height: undefined,
      thumbnail_url: undefined,
    });
  });
});

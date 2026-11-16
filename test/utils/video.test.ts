import { describe, it, expect } from 'vitest';
import { parseVideoUrl } from '../../app/utils/video';

/**
 * Which URLs VideoPlayer plays, and with it which bare links in a markdown
 * text become a player instead of a link: only a YouTube or Vimeo video, on
 * the providers' own hosts, with an id that can go into an embed URL.
 */
describe('parseVideoUrl', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['http://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/a1_B-c2', 'a1_B-c2'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('plays %s as YouTube video %s', (url, id) => {
    expect(parseVideoUrl(url)).toEqual({ provider: 'youtube', id });
  });

  it.each([
    ['https://vimeo.com/76979871', '76979871', undefined],
    ['https://www.vimeo.com/76979871', '76979871', undefined],
    ['https://vimeo.com/76979871/8272103f6e', '76979871', '8272103f6e'],
    ['https://player.vimeo.com/video/76979871', '76979871', undefined],
    [
      'https://player.vimeo.com/video/76979871?h=8272103f6e',
      '76979871',
      '8272103f6e',
    ],
  ])('plays %s as Vimeo video %s with hash %s', (url, id, hash) => {
    expect(parseVideoUrl(url)).toStrictEqual({ provider: 'vimeo', id, hash });
  });

  it.each([
    ['a script URL', 'javascript:alert(1)//youtube.com/watch?v=dQw4w9WgXcQ'],
    ['another protocol', 'ftp://youtube.com/watch?v=dQw4w9WgXcQ'],
    ['a data URL', 'data:text/html,https://youtu.be/dQw4w9WgXcQ'],
    [
      'a channel page',
      'https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
    ],
    ['a watch page without a video', 'https://www.youtube.com/watch'],
    ['an id with markup', 'https://www.youtube.com/watch?v=dQw4"><script>'],
    ['an id with markup in the path', 'https://youtu.be/dQw<b>4w9'],
    ['an id with a quote', "https://www.youtube.com/embed/dQw4'onload='x"],
    [
      'a Vimeo id that is not a number',
      'https://vimeo.com/channels/staffpicks',
    ],
    ['a Vimeo id with letters', 'https://player.vimeo.com/video/7697abc'],
    [
      'the host in the path',
      'https://evil.com/youtube.com/watch?v=dQw4w9WgXcQ',
    ],
    [
      'a host that ends elsewhere',
      'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ',
    ],
    [
      'a host that starts elsewhere',
      'https://notyoutube.com/watch?v=dQw4w9WgXcQ',
    ],
    [
      'user info before another host',
      'https://youtube.com@evil.com/watch?v=dQw4w9WgXcQ',
    ],
    ['a relative URL', '/watch?v=dQw4w9WgXcQ'],
    ['an empty string', ''],
    ['no URL', undefined],
  ])('plays nothing for %s', (_, url) => {
    expect(parseVideoUrl(url)).toBeUndefined();
  });
});

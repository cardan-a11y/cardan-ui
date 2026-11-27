// VideoPlayer's route: only a video parseVideoUrl() accepts, so no open proxy.
// Not in server/utils, which Nitro auto-imports into every project's server
import { parseVideoUrl, type VideoSource } from '../../app/utils/video';

export type VideoMetadata = {
  title?: string;
  width?: number;
  height?: number;
  thumbnail_url?: string;
};

/** The video a route path names, or `undefined` for anything else. */
export function videoFromPath(path: string): VideoSource | undefined {
  const [provider, id, hash, ...rest] = path.split('/');

  if (!id || rest.length) return undefined;

  const url =
    provider === 'youtube' && hash === undefined
      ? `https://youtu.be/${id}`
      : provider === 'vimeo'
        ? `https://vimeo.com/${id}${hash === undefined ? '' : `/${hash}`}`
        : undefined;
  const video = parseVideoUrl(url);

  // The same video back, so nothing the parser dropped or normalised slips in
  if (!video) return undefined;
  return video.provider === provider && video.id === id && video.hash === hash
    ? video
    : undefined;
}

/** The cache key of a route path: hex, since Nitro strips every non-word character from a key */
export function cacheKey(path: string): string {
  return Array.from(new TextEncoder().encode(path), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/** The providers' oEmbed endpoints: `runtimeConfig.cardanUi`, which a test server points elsewhere */
export type OEmbedEndpoints = { oembedYoutube: string; oembedVimeo: string };

/** The request to the provider: no retry, as ofetch retries a timeout and would double the wait */
export const OEMBED_FETCH = { timeout: 3000, retry: false } as const;

/** The provider's oEmbed URL for a video. */
export function oEmbedUrl(
  { provider, id, hash }: VideoSource,
  endpoints: OEmbedEndpoints,
): string {
  if (provider === 'vimeo') {
    const page = `https://vimeo.com/${id}${hash ? `/${hash}` : ''}`;
    return `${endpoints.oembedVimeo}?url=${encodeURIComponent(page)}&width=960&height=540`;
  }
  const page = `https://www.youtube.com/watch?v=${id}`;
  return `${endpoints.oembedYoutube}?url=${encodeURIComponent(page)}&format=json`;
}

const THUMBNAIL_HOSTS = ['i.ytimg.com', 'i.vimeocdn.com'];

/** What VideoPlayer reads, and a thumbnail only from a host in the layer's `image.domains`. */
export function pickMetadata(data: unknown): VideoMetadata {
  const raw = (data ?? {}) as Record<string, unknown>;
  const text = (value: unknown) =>
    typeof value === 'string' ? value : undefined;
  const size = (value: unknown) =>
    typeof value === 'number' && value > 0 ? value : undefined;
  const thumbnail = text(raw.thumbnail_url);
  let thumbnailHost: string | undefined;

  try {
    const url = new URL(thumbnail ?? '');
    if (url.protocol === 'https:') thumbnailHost = url.hostname;
  } catch {
    thumbnailHost = undefined;
  }

  return {
    title: text(raw.title),
    width: size(raw.width),
    height: size(raw.height),
    thumbnail_url: THUMBNAIL_HOSTS.includes(thumbnailHost ?? '')
      ? thumbnail
      : undefined,
  };
}

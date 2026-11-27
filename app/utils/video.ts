/** A video VideoPlayer can play: the provider and the video's id. */
export type VideoSource = {
  provider: 'youtube' | 'vimeo';
  id: string;
  /** The privacy hash of an unlisted Vimeo video. */
  hash?: string;
};

const VIMEO_HASH = /^[a-zA-Z0-9]+$/;

/** The video in a YouTube or Vimeo URL, or `undefined` for any other URL. */
export function parseVideoUrl(
  url: string | undefined,
): VideoSource | undefined {
  let parsed: URL;

  try {
    parsed = new URL(url ?? '');
  } catch {
    return undefined;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return undefined;
  }

  const host = parsed.hostname.replace(/^(www|m)\./, '');
  const segments = parsed.pathname.split('/').filter(Boolean);

  if (host === 'youtu.be') {
    return youtube(segments[0]);
  }

  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (segments[0] === 'watch') {
      return youtube(parsed.searchParams.get('v'));
    }

    if (['embed', 'shorts', 'live'].includes(segments[0] ?? '')) {
      return youtube(segments[1]);
    }

    return undefined;
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const index = segments[0] === 'video' ? 1 : 0;
    const id = segments[index];
    const next = segments[index + 1];

    if (!id || !/^\d+$/.test(id)) {
      return undefined;
    }

    const hash = [next, parsed.searchParams.get('h')].find(
      (value) => value && VIMEO_HASH.test(value),
    );

    return { provider: 'vimeo', id, hash: hash ?? undefined };
  }

  return undefined;
}

function youtube(id: string | null | undefined): VideoSource | undefined {
  return id && /^[\w-]+$/.test(id) ? { provider: 'youtube', id } : undefined;
}

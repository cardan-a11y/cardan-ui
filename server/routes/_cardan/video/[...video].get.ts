import {
  cacheKey,
  OEMBED_FETCH,
  oEmbedUrl,
  pickMetadata,
  videoFromPath,
  type OEmbedEndpoints,
} from '../../../lib/video';

// VideoPlayer's title and size, asked by the server on the visitor's behalf
export default defineCachedEventHandler(
  async (event) => {
    const video = videoFromPath(getRouterParam(event, 'video') ?? '');

    if (!video) {
      throw createError({ statusCode: 400, statusMessage: 'Not a video' });
    }

    const endpoints = useRuntimeConfig(event).cardanUi as OEmbedEndpoints;
    const data = await $fetch(oEmbedUrl(video, endpoints), OEMBED_FETCH).catch(
      () => undefined,
    );

    // An error is not cached: the next render asks again
    if (!data) {
      throw createError({ statusCode: 502, statusMessage: 'No metadata' });
    }

    return pickMetadata(data);
  },
  {
    name: 'cardan-video',
    maxAge: 60 * 60 * 24,
    // The path alone, collision-free: a query string adds no entry
    getKey: (event) => cacheKey(getRouterParam(event, 'video') ?? ''),
  },
);

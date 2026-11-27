<script setup lang="ts">
/**
 * A thumbnail and a play button; the provider's player only after a click.
 * Title and size come from the layer's `/_cardan/video` route, never from the provider.
 */
import { parseVideoUrl } from '../utils/video';

const props = defineProps<{
  url: string;
  caption?: string;
  loading?: 'lazy' | 'eager';
  /** The video's title, which skips the request for it. */
  title?: string;
}>();

const { t } = useI18n();

const started = ref(false);

const video = computed(() => parseVideoUrl(props.url));

// Vue does not sanitise `href`: any other URL renders nothing
const isWebUrl = computed(() => /^https?:\/\//i.test(props.url ?? ''));

const metadataPath = computed(() => {
  if (!video.value) return undefined;
  const { provider, id, hash } = video.value;
  return `/_cardan/video/${provider}/${id}${hash ? `/${hash}` : ''}`;
});

const { data: videoData } = await useAsyncData<VideoMetaData | null>(
  () => `video:${metadataPath.value ?? ''}:${props.title ?? ''}`,
  async () => {
    if (!metadataPath.value || props.title) return null;
    // The route caps the provider's answer at 3 s; no retry doubles a timeout
    return $fetch<VideoMetaData>(metadataPath.value, {
      timeout: 3500,
      retry: false,
    }).catch(() => null);
  },
  { lazy: true },
);

const videoTitle = computed(() => props.title || videoData.value?.title);

const ratio = computed(() => {
  if (videoData.value?.width && videoData.value?.height) {
    const ar = videoData.value.width / videoData.value.height;

    if (ar >= 1.76 && ar <= 1.79) {
      return 16 / 9;
    }
    return ar;
  }

  return 16 / 9;
});

const embedUrl = computed(() => {
  if (!video.value) return undefined;
  const { provider, id, hash } = video.value;

  if (provider === 'vimeo') {
    const h = hash ? `&h=${encodeURIComponent(hash)}` : '';
    return `https://player.vimeo.com/video/${id}?autoplay=1&keyboard=0${h}`;
  }
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&disablekb=1`;
});

const thumbFailures = ref(0);

// YouTube's sharpest thumbnail is missing for some videos; hqdefault.jpg never is
const thumbUrl = computed(() => {
  if (!video.value) return undefined;
  const { provider, id } = video.value;
  const fromMetadata = videoData.value?.thumbnail_url;

  if (provider === 'vimeo') return fromMetadata;

  const candidates = [
    `https://i.ytimg.com/vi_webp/${id}/hq720.webp`,
    fromMetadata,
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  ].filter((url) => typeof url === 'string');

  return candidates[Math.min(thumbFailures.value, candidates.length - 1)];
});

function nextThumb() {
  thumbFailures.value += 1;
}

watch(
  () => props.url,
  () => {
    thumbFailures.value = 0;
  },
);

const iframeTitle = computed(() =>
  videoTitle.value
    ? t('video.title', { title: videoTitle.value })
    : t('video.heading'),
);

const iframe = useTemplateRef('iframe');

async function playVideo() {
  started.value = true;
  await nextTick();
  iframe.value?.focus();
}
</script>

<template>
  <figure
    v-if="video"
    class="video-player"
    :style="`--video-player-aspect-ratio: ${ratio}`"
  >
    <NuxtImg
      v-if="!started && thumbUrl"
      :src="thumbUrl"
      :alt="videoTitle || ''"
      :loading="loading"
      :preload="loading === 'eager' ? { fetchPriority: 'high' } : undefined"
      format="webp"
      @click="playVideo"
      @error="nextThumb"
    />
    <div
      v-else-if="!started"
      class="video-player-placeholder"
      @click="playVideo"
    />

    <button v-if="!started" type="button" @click="playVideo">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
      >
        <path
          d="M6.906 4.537A.6.6 0 0 0 6 5.053v13.894a.6.6 0 0 0 .906.516l11.723-6.947a.6.6 0 0 0 0-1.032z"
          aria-hidden="true"
        />
      </svg>

      <span class="visuallyhidden">
        {{ $t('video.play') }}{{ videoTitle ? `: ${videoTitle}` : '' }}
      </span>
    </button>

    <figcaption v-if="!started && caption">{{ caption }}</figcaption>

    <div v-if="started" class="iframe-wrapper">
      <iframe
        ref="iframe"
        :src="embedUrl"
        :title="iframeTitle"
        allow="autoplay *; fullscreen *; encrypted-media *"
        allowfullscreen
      />
    </div>
  </figure>
  <a v-else-if="isWebUrl" :href="url" class="video-player-link">{{
    caption || url
  }}</a>
</template>

<style>
.video-player {
  position: relative;
  display: grid;
  min-width: 240px;
  place-items: center;

  img,
  .video-player-placeholder {
    cursor: pointer;
    background-color: black;
    aspect-ratio: var(--video-player-aspect-ratio);
    width: 100%;
  }

  figcaption {
    font-style: italic;
    font-size: smaller;
    color: var(--color-grey-text);
    padding-block-start: 1rem;
  }

  button {
    background-color: black;
    border: none;
    color: white;
    display: grid;
    place-content: center;
    border-radius: var(--radius-full);
    position: absolute;
    padding: 0.25rem;
    cursor: pointer;
    scale: 0.94;
    transition: scale var(--duration-sm) ease-out;

    svg {
      fill: currentColor;
      padding-inline-start: 0.35rem;
    }

    &:focus-visible {
      outline: 2px solid black;
      outline-offset: 2px;
      box-shadow: 0 0 0 2px white;
    }

    &:hover {
      scale: 1;
    }
  }

  .iframe-wrapper {
    width: 100%;
    aspect-ratio: var(--video-player-aspect-ratio);
  }

  iframe {
    border: 0;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
}

.video-player-link {
  overflow-wrap: anywhere;
}
</style>

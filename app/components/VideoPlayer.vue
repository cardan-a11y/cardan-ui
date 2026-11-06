<script setup lang="ts">
import { parseVideoUrl, type VideoSource } from '../utils/video';

const props = defineProps<{
  url: string;
  caption?: string;
  loading?: 'lazy' | 'eager';
}>();

const started = ref(false);

/** A URL that is no video keeps the YouTube embed with a dummy id, so the figure still renders. */
const video = computed<VideoSource>(
  () => parseVideoUrl(props.url) ?? { provider: 'youtube', id: 'e' },
);

const metadataUrl = computed(() => {
  const { provider, id, hash } = video.value;

  if (provider === 'vimeo') {
    const pageUrl = hash
      ? `https://vimeo.com/${id}/${hash}`
      : `https://vimeo.com/${id}`;
    return `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(pageUrl)}&width=960&height=540`;
  }
  return `https://youtube.com/oembed?url=https://youtube.com/watch?v=${id}&format=json`;
});

const { data: videoData } = await useAsyncData<VideoMetaData>(
  `video:${props.url ?? ''}`,
  () => $fetch(metadataUrl.value),
  {
    lazy: true,
  },
);

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
  const { provider, id, hash } = video.value;

  if (provider === 'vimeo') {
    const h = hash ? `&h=${encodeURIComponent(hash)}` : '';
    return `https://player.vimeo.com/video/${id}?autoplay=1&keyboard=0${h}`;
  }
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&disablekb=1`;
});

const thumbUrl = computed(() => {
  if (video.value.provider === 'vimeo') {
    return videoData.value?.thumbnail_url;
  }
  return `https://i.ytimg.com/vi_webp/${video.value.id}/hq720.webp`;
});

function playVideo() {
  started.value = true;
}
</script>

<template>
  <figure class="video-player" :style="`--aspect-ratio: ${ratio}`">
    <NuxtImg
      v-if="!started"
      :src="thumbUrl"
      :alt="videoData?.title || ''"
      :loading="loading"
      :preload="loading === 'eager' ? { fetchPriority: 'high' } : undefined"
      format="webp"
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

      <span class="visuallyhidden"
        >{{ $t('video.play') }}: {{ videoData?.title }}</span
      >
    </button>

    <figcaption v-if="!started && caption">{{ caption }}</figcaption>

    <div v-if="started" class="iframe-wrapper">
      <iframe
        :src="embedUrl"
        :title="`Video: ${videoData?.title}`"
        allow="autoplay *; fullscreen *; encrypted-media *"
        allowfullscreen
      />
    </div>
  </figure>
</template>

<style>
.video-player {
  position: relative;
  display: grid;
  min-width: 240px;
  place-items: center;

  img {
    cursor: pointer;
    background-color: black;
    aspect-ratio: var(--aspect-ratio);
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
    aspect-ratio: var(--aspect-ratio);
  }

  iframe {
    border: 0;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
}
</style>

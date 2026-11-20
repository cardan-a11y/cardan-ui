<script setup lang="ts">
import { parseVideoUrl } from '../utils/video';

const { url } = defineProps<{
  url: string;
  aboveTheFold?: boolean;
}>();

const youtubeKey = computed(() => {
  const video = parseVideoUrl(url);

  return video?.provider === 'youtube' ? video.id : '';
});
</script>

<template>
  <ScriptYouTubePlayer
    v-if="youtubeKey"
    :video-id="youtubeKey"
    :above-the-fold="aboveTheFold"
    :placeholder-attrs="{ alt: '' }"
    class="youtube-player"
  >
    <template #awaitingLoad>
      <div class="play-button">
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
        <span class="visuallyhidden">{{ $t('video.play') }}</span>
      </div>
    </template>

    <template #loading>
      <div role="status" class="visuallyhidden">
        {{ $t('general.loading') }}
      </div>
    </template>

    <template #error>
      <Callout color="red">{{ $t('error.youtube') }}</Callout>
    </template>
  </ScriptYouTubePlayer>
</template>

<style>
.youtube-player {
  .play-button {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    align-self: center;
    justify-self: center;
    background-color: black;
    border-radius: var(--radius-full);
    width: 4rem;
    height: 4rem;

    svg {
      fill: white;
    }
  }
}
</style>

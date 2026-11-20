<script setup lang="ts">
useHead({ title: 'Video Player' });

const youtube = ref('https://youtube.com/watch?v=PGvgdZuQu6w');
const vimeo = ref('https://vimeo.com/969786906');
const vimeoPrivate = ref('https://vimeo.com/706156113/91b6e7682f');
</script>

<template>
  <div class="demo-page video">
    <h1>Video</h1>

    <p class="mbe-2 fs-lg">
      Component for embedding external videos from YouTube or Vimeo. Initially,
      the component will only load the thumbnail. The actual video will be
      loaded after the user clicks on the play button.
    </p>

    <div class="card-cols">
      <Card>
        <h2>YouTube - Nuxt Scripts</h2>

        <YouTube :url="youtube" />
        <Input v-model="youtube" label="ID" hide-label />
      </Card>
      <Card>
        <h2>YouTube</h2>

        <VideoPlayer :url="youtube" />
        <Input v-model="youtube" label="URL" hide-label />
      </Card>

      <Card>
        <h2>Vimeo</h2>

        <VideoPlayer :url="vimeo" />
        <Input v-model="vimeo" label="URL" hide-label />
      </Card>

      <Card>
        <h2>Vimeo (private)</h2>

        <VideoPlayer :url="vimeoPrivate" />
        <Input v-model="vimeoPrivate" label="URL" hide-label />
      </Card>
    </div>
  </div>
</template>

<style>
.demo-page.video {
  .card {
    display: grid;
    align-content: start;
    gap: 1rem;
    max-width: 640px;

    @media (min-width: 1280px) {
      max-width: 476px;
    }

    h2 {
      margin-block-end: 0;
    }
  }
}
</style>

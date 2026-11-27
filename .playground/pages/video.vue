<script setup lang="ts">
useHead({ title: 'Video Player' });

const youtube = ref('https://youtube.com/watch?v=PGvgdZuQu6w');
const vimeo = ref('https://vimeo.com/969786906');
const vimeoPrivate = ref('https://vimeo.com/706156113/91b6e7682f');
</script>

<template>
  <div class="demo-page video">
    <p class="demo-eyebrow">Content</p>
    <h1>Video</h1>
    <p class="demo-lead">
      Plays a YouTube or Vimeo video: a thumbnail and a play button first, the
      player only after a click.
    </p>

    <section class="demo-section" aria-labelledby="video-player">
      <h2 id="video-player">VideoPlayer</h2>
      <p class="demo-hint">
        <code>url</code> is the link to the video; <code>parseVideoUrl()</code>
        in <code>app/utils/video.ts</code> decides which links it plays, for
        MarkdownPreview too. The project installs <code>@nuxt/image</code>
        for the thumbnail.
      </p>

      <div class="demo-grid">
        <Card>
          <h3>YouTube</h3>

          <VideoPlayer :url="youtube" />
          <Input v-model="youtube" label="URL" hide-label />
        </Card>

        <Card>
          <h3>Vimeo</h3>

          <VideoPlayer :url="vimeo" />
          <Input v-model="vimeo" label="URL" hide-label />
        </Card>

        <Card>
          <h3>Vimeo (private)</h3>

          <VideoPlayer :url="vimeoPrivate" />
          <Input v-model="vimeoPrivate" label="URL" hide-label />
        </Card>
      </div>
    </section>

    <section class="demo-section" aria-labelledby="video-youtube">
      <h2 id="video-youtube">YouTube</h2>
      <p class="demo-hint">
        The YouTube player of Nuxt Scripts (<code>ScriptYouTubePlayer</code>),
        for a YouTube link only. Deprecated for VideoPlayer and removed in the
        next minor version.
      </p>

      <div class="demo-grid">
        <Card>
          <h3>YouTube - Nuxt Scripts</h3>

          <YouTube :url="youtube" above-the-fold />
          <Input v-model="youtube" label="ID" hide-label />
        </Card>
      </div>
    </section>
  </div>
</template>

<style>
.demo-page.video {
  .demo-grid {
    --demo-column: 20rem;
  }

  .card {
    display: grid;
    align-content: start;
    gap: 1rem;
    margin-block-end: 0;

    h3 {
      margin-block: 0;
    }
  }
}
</style>

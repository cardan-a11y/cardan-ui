<script setup lang="ts">
import readme from '~/../README.md?raw';
import { version } from '~/../package.json';

useHead({ title: 'Getting Started' });
</script>

<template>
  <div class="demo-page getting-started-page">
    <div class="getting-started-hero brand-circle">
      <CardanLogo product="UI" height="2rem" decorative />
      <p>Accessible components for Nuxt, in the Cardan brand.</p>
      <Chip :label="`v${version}`" variant="outline" />
    </div>

    <MarkdownPreview :content="readme" font-size="lg" />
  </div>
</template>

<style>
.getting-started-page {
  .getting-started-hero {
    --brand-circle-color: color-mix(
      in srgb,
      var(--color-accent-bg),
      var(--color-text) 6%
    );
    --brand-circle-size: max(28rem, 60%);
    --brand-circle-top: 35%;

    display: grid;
    justify-items: start;
    gap: 1rem;
    margin-block-end: 3rem;
    padding: 2.5rem 1.5rem 5rem;
    border-radius: var(--radius-xl);
    background-color: var(--color-accent-bg);

    @media (min-width: 480px) {
      padding: 3.5rem 3rem 7rem;
    }

    p {
      margin-block: 0;
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-bold);
      line-height: var(--line-height-heading);
    }
  }
}
</style>

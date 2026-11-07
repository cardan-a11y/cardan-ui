<script setup lang="ts">
useHead({ title: 'Colors' });
</script>

<template>
  <div class="demo-page">
    <h1>Colors</h1>

    <Card>
      <h2>Primary</h2>
      <div class="color-swatches-grid">
        <ColorSwatch color="accent" />
        <ColorSwatch color="accent-hover" />
        <ColorSwatch color="accent-bg" />
        <ColorSwatch color="accent-text" />
        <ColorSwatch color="accent-text-hover" />
        <ColorSwatch color="accent-graphic" />
        <!-- <ColorSwatch color="on-accent" /> -->
      </div>

      <h2>Neutral</h2>
      <div class="color-swatches-grid">
        <ColorSwatch color="white" />
        <ColorSwatch color="card-bg" />
        <ColorSwatch color="bg" />
        <ColorSwatch color="grey-bg" />
        <ColorSwatch color="grey-light" />
        <ColorSwatch color="grey-graphic" />
        <ColorSwatch color="grey-text" />
        <ColorSwatch color="text" />
        <ColorSwatch color="black" />
      </div>

      <h2>Base</h2>
      <div class="color-swatches-grid">
        <ColorSwatch color="red" />
        <ColorSwatch color="orange" />
        <ColorSwatch color="yellow" />
        <ColorSwatch color="green" />
        <ColorSwatch color="blue" />
        <ColorSwatch color="purple" />
        <ColorSwatch color="pink" />
      </div>

      <h2>Base background</h2>
      <div class="color-swatches-grid">
        <ColorSwatch color="red-bg" />
        <ColorSwatch color="orange-bg" />
        <ColorSwatch color="yellow-bg" />
        <ColorSwatch color="green-bg" />
        <ColorSwatch color="blue-bg" />
        <ColorSwatch color="purple-bg" />
        <ColorSwatch color="pink-bg" />
      </div>

      <h2>Base text</h2>
      <div class="color-swatches-grid">
        <ColorSwatch color="red-text" />
        <ColorSwatch color="orange-text" />
        <ColorSwatch color="yellow-text" />
        <ColorSwatch color="green-text" />
        <ColorSwatch color="blue-text" />
        <ColorSwatch color="purple-text" />
        <ColorSwatch color="pink-text" />
      </div>

      <h2>Base graphic</h2>
      <div class="color-swatches-grid">
        <ColorSwatch color="red-graphic" />
        <ColorSwatch color="orange-graphic" />
        <ColorSwatch color="yellow-graphic" />
        <ColorSwatch color="green-graphic" />
        <ColorSwatch color="blue-graphic" />
        <ColorSwatch color="purple-graphic" />
        <ColorSwatch color="pink-graphic" />
      </div>
    </Card>

    <section class="gradient-demo" aria-labelledby="gradient-title">
      <Card>
        <h2 id="gradient-title">Gradient</h2>
        <p>
          The brand gradient, <code>--gradient-bg</code>, from
          <code>--color-accent-bg</code> to <code>--color-green-bg</code>:
          once per page, under a card, in both modes.
        </p>
      </Card>
    </section>
  </div>
</template>

<style>
.color-swatches-grid {
  margin-block: 1rem 3rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;

  padding-inline: 1rem;
}

.gradient-demo {
  padding-block: 2.5rem;
  padding-inline: 1rem;
  border-radius: var(--radius-lg);
  background: var(--gradient-bg);

  @media (min-width: 480px) {
    padding: 3rem;
  }

  .card {
    margin-block-end: 0;
  }
}
</style>

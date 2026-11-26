<script setup lang="ts">
useHead({ title: 'Logo' });

const variants: CardanLogoVariant[] = ['color', 'purple', 'black'];
const darkVariants: CardanLogoVariant[] = ['negative', 'white'];

const rules = [
  {
    title: 'Full logo first',
    text: 'Headers, app shells and footers show the full logo.',
  },
  {
    title: 'Tile for icons',
    text: 'Favicons, app icons and profile images. Never in a website header.',
  },
  {
    title: 'It has a name',
    text: '“Logo Cardan”, or “Logo Cardan Academy” for a lockup. Add decorative when a visible name is right next to it.',
  },
  {
    title: 'Never themed',
    text: 'The colors are fixed brand artwork and do not follow the theme tokens.',
  },
];
</script>

<template>
  <div class="demo-page logo-page">
    <p class="demo-eyebrow">Brand</p>
    <h1>Logo</h1>
    <p class="demo-lead">
      <code>{{ `<CardanLogo />` }}</code> renders the Cardan logo: two
      interlocking links, green and purple, with the wordmark to the right.
    </p>

    <ul role="list" class="demo-grid">
      <li v-for="rule in rules" :key="rule.title" class="demo-tile">
        <strong>{{ rule.title }}</strong>
        <span>{{ rule.text }}</span>
      </li>
    </ul>

    <section class="demo-section" aria-labelledby="logo-forms">
      <h2 id="logo-forms">Forms</h2>
      <p class="demo-hint">
        <code>form</code> picks the full logo, the symbol or the tile. The
        white symbol on a purple tile is only a dividing element in social
        media posts.
      </p>

      <Card>
        <div class="logo-demo-row">
          <figure>
            <CardanLogo />
            <figcaption><code>form="full"</code> (default)</figcaption>
          </figure>
          <figure>
            <CardanLogo form="symbol" />
            <figcaption><code>form="symbol"</code></figcaption>
          </figure>
          <figure>
            <CardanLogo form="tile" height="3rem" />
            <figcaption><code>form="tile"</code></figcaption>
          </figure>
          <figure>
            <CardanLogo form="tile" round height="3rem" />
            <figcaption><code>form="tile" round</code></figcaption>
          </figure>
          <figure>
            <CardanLogo form="tile" variant="white" height="3rem" />
            <figcaption><code>form="tile" variant="white"</code></figcaption>
          </figure>
        </div>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="logo-variants">
      <h2 id="logo-variants">Variants</h2>
      <p class="demo-hint">
        The default <code>variant="auto"</code> shows the color logo in light
        mode and the color-negative logo in dark mode. The surfaces below keep
        their own mode.
      </p>

      <div class="demo-grid logo-variants">
        <div class="logo-demo-row logo-demo-surface light-mode">
          <figure v-for="variant in variants" :key="variant">
            <CardanLogo :variant="variant" />
            <figcaption>
              <code>variant="{{ variant }}"</code>
            </figcaption>
          </figure>
        </div>

        <div class="logo-demo-row logo-demo-surface dark-mode">
          <figure v-for="variant in darkVariants" :key="variant">
            <CardanLogo :variant="variant" />
            <figcaption>
              <code>variant="{{ variant }}"</code>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section class="demo-section" aria-labelledby="logo-lockups">
      <h2 id="logo-lockups">Lockups</h2>
      <p class="demo-hint">
        A sub-brand is a lockup, not a new logo: with <code>product</code>, the
        logo gets an upright divider and the product name with a capital, in
        Hanken Grotesk Regular at 0.8 times the logo height. The name is Body
        on light and white on dark, never purple or green.
      </p>

      <Card>
        <div class="logo-demo-row">
          <CardanLogo product="academy" />
          <CardanLogo product="auditor" />
        </div>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="logo-rules">
      <h2 id="logo-rules">Usage rules</h2>

      <Card>
        <ul class="a11y-list">
          <li>
            Keep clear space around the logo of at least its height, and twice
            its height to the edge of a photo, post or slide.
          </li>
          <li>
            The logo is 20px high by default, the brand size for websites. It
            is never smaller than 18px, and never smaller than 20px with a
            product name.
          </li>
          <li>
            In a flex row, such as an app header, a lockup takes the room it
            gets, from 144px (the <code>narrow-width</code> prop) up to its
            height, so it fits in an app header on a 320px screen.
          </li>
          <li>
            Never stretch, recolor or rotate the logo, never put the color logo
            on purple, and never place it on a busy area.
          </li>
          <li>On photos, use the white or black one-color logo only.</li>
        </ul>
      </Card>
    </section>
  </div>
</template>

<style>
.logo-page {
  .card {
    margin-block-end: 0;
  }

  .a11y-list {
    margin-block: 0;
  }

  .logo-demo-row {
    display: flex;
    flex-wrap: wrap;
    align-content: start;
    align-items: end;
    gap: 2rem 3rem;

    figure {
      display: grid;
      justify-items: start;
      gap: 0.75rem;
    }

    figcaption {
      color: var(--color-grey-text);
      font-size: var(--font-size-sm);
    }
  }

  .logo-variants {
    --demo-column: 18rem;
  }

  .logo-demo-surface {
    padding: 1.5rem;
    border: 1px solid var(--card-border-color);
    border-radius: var(--radius-lg);
    background-color: var(--color-bg);
    color: var(--color-text);
    color-scheme: var(--color-scheme);
  }
}
</style>

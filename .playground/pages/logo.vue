<script setup lang="ts">
useHead({ title: 'Logo' });

const variants: CardanLogoVariant[] = ['color', 'purple', 'black'];
const darkVariants: CardanLogoVariant[] = ['negative', 'white'];
</script>

<template>
  <div class="demo-page">
    <h1>Logo</h1>

    <p>
      The <code>{{ `<CardanLogo />` }}</code> component renders the Cardan logo:
      two interlocking links (green and purple) with the wordmark to the right.
      Its colors are fixed brand artwork and never follow the theme tokens. The
      logo has an accessible name ("Logo Cardan", or "Logo Cardan Academy" for a
      lockup); add <code>decorative</code> when a visible name is right next to
      it.
    </p>

    <Card>
      <h2>Forms</h2>

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

      <p>
        Use the full logo everywhere the library shows a brand logo: headers,
        app shells and footers. The tile, the color symbol on a light tile, is
        for favicons, app icons and profile images, never in a website header.
        The white symbol on a purple tile is only a dividing element in social
        media posts.
      </p>
    </Card>

    <Card>
      <h2>Variants</h2>

      <p>
        The default <code>variant="auto"</code> shows the color logo in light
        mode and the color-negative logo in dark mode.
      </p>

      <div class="logo-demo-row logo-demo-light">
        <figure v-for="variant in variants" :key="variant">
          <CardanLogo :variant="variant" />
          <figcaption>
            <code>variant="{{ variant }}"</code>
          </figcaption>
        </figure>
      </div>

      <div class="logo-demo-row logo-demo-dark">
        <figure v-for="variant in darkVariants" :key="variant">
          <CardanLogo :variant="variant" />
          <figcaption>
            <code>variant="{{ variant }}"</code>
          </figcaption>
        </figure>
      </div>
    </Card>

    <Card>
      <h2>Lockups</h2>

      <p>
        Sub-brands are lockups, not new logos: after the logo comes an upright
        divider and the product name with a capital, in Hanken Grotesk Regular
        at 0.8 times the logo height. Both are Body on light and white on dark,
        never purple or green.
      </p>

      <div class="logo-demo-row">
        <CardanLogo product="academy" />
        <CardanLogo product="auditor" />
      </div>
    </Card>

    <Card>
      <h2>Usage rules</h2>

      <ul>
        <li>
          Keep clear space around the logo of at least its height, and twice
          its height to the edge of a photo, post or slide.
        </li>
        <li>
          The logo is 20px high by default, the brand size for websites. It is
          never smaller than 18px, and never smaller than 20px with a product
          name. In a flex row, such as an app header, a lockup takes the room
          it gets, from 144px (the <code>narrow-width</code> prop) up to its
          height, so it fits in an app header on a 320px screen.
        </li>
        <li>
          Never stretch, recolor or rotate the logo, never put the color logo on
          purple, and never place it on a busy area.
        </li>
        <li>On photos, use the white or black one-color logo only.</li>
      </ul>
    </Card>
  </div>
</template>

<style>
.logo-demo-row {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 2rem 3rem;
  margin-block: 1.5rem;

  figure {
    display: grid;
    justify-items: start;
    gap: 0.75rem;
  }

  figcaption {
    font-size: var(--font-size-sm);
    color: var(--color-grey-text);
  }
}

.logo-demo-light,
.logo-demo-dark {
  padding: 1.5rem;
  border-radius: var(--radius-lg);
}

.logo-demo-light {
  background-color: var(--cardan-white);
  border: 1px solid var(--cardan-beige-mid);

  figcaption {
    color: var(--cardan-body-grey);
  }

  code {
    color: var(--cardan-body);
    background-color: var(--cardan-beige-sand);
  }
}

.logo-demo-dark {
  background-color: var(--cardan-black);

  figcaption {
    color: var(--cardan-white);
  }

  code {
    color: var(--cardan-black);
    background-color: var(--cardan-beige-sand);
  }
}
</style>

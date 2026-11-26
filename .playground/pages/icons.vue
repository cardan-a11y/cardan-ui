<script setup lang="ts">
useHead({ title: 'Icons' });

const rules = [
  {
    title: 'One set',
    text: 'Material Symbols, outlined and rounded. No other collection in a component.',
  },
  {
    title: 'Name in this order',
    text: '<name>-outline-rounded first, -rounded for a filled icon, the plain name when neither exists.',
  },
  {
    title: 'Decorative by default',
    text: 'An icon is hidden from screen readers. A control with only an icon gets a label: hide-label on Button, or aria-label.',
  },
  {
    title: 'Bundle the first paint',
    text: 'An icon a component shows on first paint goes in bundledIcons, so the page does not shift.',
  },
];

const brandIcons = [
  { name: 'accessibility-new-rounded', label: 'Accessibility' },
  { name: 'fact-check-outline-rounded', label: 'Audit' },
  { name: 'model-training-outline-rounded', label: 'Training' },
  { name: 'verified-outline-rounded', label: 'Certified' },
  { name: 'monitoring-rounded', label: 'Monitoring' },
  { name: 'gavel-rounded', label: 'Legislation' },
  { name: 'description-outline-rounded', label: 'Report' },
  { name: 'support-agent-rounded', label: 'Expert' },
  { name: 'visibility-outline-rounded', label: 'Visual' },
  { name: 'keyboard-outline-rounded', label: 'Keyboard' },
  { name: 'hearing-rounded', label: 'Auditory' },
  { name: 'school-outline-rounded', label: 'Academy' },
  { name: 'change-history-outline-rounded', label: 'Change' },
  { name: 'cognition-outline-rounded', label: 'Insight' },
  { name: 'grouped-bar-chart-rounded', label: 'Data' },
  { name: 'all-inclusive', label: 'Ongoing' },
];

const shapes = [
  { tone: 'accent', icon: 'check-small-rounded' },
  { tone: 'green', icon: 'check-small-rounded' },
  { tone: 'neutral', icon: 'check-small-rounded' },
  { tone: 'accent', icon: 'cognition-outline-rounded', square: true },
  { tone: 'green', icon: 'verified-outline-rounded', square: true },
  { tone: 'neutral', icon: 'grouped-bar-chart-rounded', square: true },
];

const topics = [
  'Disabilities, barriers and assistive technology',
  'Accessibility and universal design',
];

const services = [
  { icon: 'fact-check-outline-rounded', label: 'WCAG 2.2 audit' },
  { icon: 'model-training-outline-rounded', label: 'Training for your team' },
  { icon: 'monitoring-rounded', label: 'Continuous monitoring' },
];
</script>

<template>
  <div class="demo-page icons-page">
    <p class="demo-eyebrow">Brand</p>
    <h1>Icons</h1>
    <p class="demo-lead">
      <Button
        href="https://icones.js.org/collection/material-symbols"
        label="Material Symbols"
        variant="link"
        target="_blank"
      />
      in the line variant, through
      <Button
        href="https://nuxt.com/modules/icon"
        label="Nuxt Icon"
        variant="link"
        target="_blank"
      />. The same set as the website.
    </p>

    <ul role="list" class="demo-grid">
      <li v-for="rule in rules" :key="rule.title" class="demo-tile">
        <strong>{{ rule.title }}</strong>
        <span>{{ rule.text }}</span>
      </li>
    </ul>

    <pre><code>{{ `<Icon name="material-symbols:fact-check-outline-rounded" />
<Button icon="material-symbols:download-rounded" label="Download" hide-label />` }}</code></pre>

    <section class="demo-section" aria-labelledby="icons-brand">
      <h2 id="icons-brand">Brand set</h2>
      <p class="demo-hint">
        The icons Cardan uses for its themes. Every name starts with
        <code>material-symbols:</code>.
      </p>

      <ul role="list" class="demo-grid icons-grid">
        <li v-for="icon in brandIcons" :key="icon.name" class="demo-tile">
          <Icon :name="`material-symbols:${icon.name}`" />
          <strong>{{ icon.label }}</strong>
          <span class="icons-name">{{ icon.name }}</span>
        </li>
      </ul>
    </section>

    <section class="demo-section" aria-labelledby="icons-color">
      <h2 id="icons-color">Icons in color</h2>
      <p class="demo-hint">
        On a card or the page an icon may sit in a circle or a rounded square:
        the <code>-bg</code> tint as shape, the icon in the same color’s
        <code>-text</code>. On a tint, icon and text are
        <code>--color-text</code>.
      </p>

      <div class="demo-grid icons-color">
        <Card border-radius="xl">
          <p class="icons-verdict">
            <Icon name="material-symbols:check-rounded" />
            On a card: color is fine
          </p>

          <div class="flex-wrapper" style="--gap: 0.75rem">
            <span
              v-for="(shape, index) in shapes"
              :key="index"
              :class="[
                'icons-shape',
                `icons-shape--${shape.tone}`,
                shape.square && 'icons-shape--square',
              ]"
            >
              <Icon :name="`material-symbols:${shape.icon}`" />
            </span>
          </div>

          <ul role="list">
            <li v-for="topic in topics" :key="topic">
              <span class="icons-shape icons-shape--accent icons-shape--sm">
                <Icon name="material-symbols:check-small-rounded" />
              </span>
              {{ topic }}
            </li>
          </ul>
        </Card>

        <Card
          background-color="accent-bg"
          border-color="transparent"
          border-radius="xl"
        >
          <p class="icons-verdict">
            <Icon name="material-symbols:check-rounded" />
            On a tint: always the text color
          </p>

          <ul role="list">
            <li v-for="service in services" :key="service.label">
              <Icon :name="`material-symbols:${service.icon}`" />
              {{ service.label }}
            </li>
          </ul>

          <p class="icons-note">
            No colored icon and no tint on a tint here.
          </p>
        </Card>
      </div>
    </section>

    <section class="demo-section" aria-labelledby="icons-bundled">
      <h2 id="icons-bundled">Bundled icons</h2>
      <p class="demo-hint">
        What the components show on first paint, in the client bundle of every
        project through the layer’s <code>nuxt.config.ts</code>. A listed icon
        comes from Material Symbols or <code>svg-spinners</code>: every project
        installs those.
      </p>

      <ul role="list" class="demo-grid icons-grid">
        <li v-for="icon in bundledIcons" :key="icon" class="demo-tile">
          <Icon :name="icon" />
          <span class="icons-name">{{ icon }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style>
.icons-page {
  pre {
    margin-block: 1.5rem 0;
  }

  .icons-grid {
    --demo-column: 9.5rem;

    .iconify {
      margin-block-end: 0.5rem;
      font-size: var(--font-size-xxl);
    }

    .icons-name {
      font-size: var(--font-size-xs);
      overflow-wrap: anywhere;
      user-select: all;
    }
  }

  .icons-color {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));

    .card {
      display: flex;
      flex-direction: column;
      gap: 1.125rem;
      margin-block-end: 0;
      padding: 1.75rem;
    }

    p {
      margin-block: 0;
    }

    ul {
      display: grid;
      gap: 0.75rem;
    }

    li {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      > .iconify {
        flex: none;
        font-size: var(--font-size-xl);
      }
    }

    .icons-verdict {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
    }

    .icons-note {
      margin-block-start: auto;
      padding-block-start: 0.75rem;
      border-block-start: 1px solid var(--color-accent-graphic);
      font-size: var(--font-size-sm);
    }
  }

  .icons-shape {
    display: grid;
    flex: none;
    place-items: center;
    inline-size: 2.5rem;
    block-size: 2.5rem;
    border-radius: var(--radius-full);
    background-color: var(--icons-shape-bg);
    color: var(--icons-shape-color);
    font-size: var(--font-size-xl);

    &.icons-shape--square {
      border-radius: var(--radius-md);
    }

    &.icons-shape--sm {
      inline-size: 1.75rem;
      block-size: 1.75rem;
      font-size: var(--font-size-md);
    }
  }

  .icons-shape--accent {
    --icons-shape-bg: var(--color-accent-bg);
    --icons-shape-color: var(--color-accent-text);
  }

  .icons-shape--green {
    --icons-shape-bg: var(--color-green-bg);
    --icons-shape-color: var(--color-green-text);
  }

  .icons-shape--neutral {
    --icons-shape-bg: var(--color-secondary);
    --icons-shape-color: var(--color-text);
  }
}
</style>

<script setup lang="ts">
const { kind = 'surface', on = undefined } = defineProps<{
  /** The custom property, such as `--color-bg` */
  token: string;
  /** What the token is for, in a few words */
  use: string;
  /** How the sample shows the color: filled, as text or as a line */
  kind?: 'surface' | 'text' | 'graphic';
  /** The token of the surface under a text or graphic sample */
  on?: string;
}>();

const sample = useTemplateRef('sample');
const hex = ref('');

useModeColors(() => {
  if (!sample.value) return;

  const rgb = parseComputedColor(getComputedStyle(sample.value).color);
  hex.value = rgb ? toHex(rgb) : '';
});
</script>

<template>
  <li class="color-swatch">
    <div
      ref="sample"
      :class="['color-swatch-sample', `color-swatch-sample--${kind}`]"
      :style="{
        '--swatch-color': `var(${token})`,
        '--swatch-on': on && `var(${on})`,
      }"
      aria-hidden="true"
    >
      <template v-if="kind === 'text'">Aa</template>
    </div>

    <div class="color-swatch-body">
      <code>{{ token }}</code>
      <span class="color-swatch-hex">{{ hex }}</span>
      <span>{{ use }}</span>
    </div>
  </li>
</template>

<style>
.color-swatch {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--card-border-color);
  border-radius: var(--radius-xl);
  background-color: var(--color-card-bg);

  .color-swatch-sample {
    display: grid;
    place-items: center;
    block-size: 5.5rem;
    border-block-end: 1px solid var(--card-border-color);
    background-color: var(--swatch-on, var(--color-bg));
    color: var(--swatch-color);
    font-size: var(--font-size-xxl);
    font-weight: var(--font-weight-bold);
  }

  .color-swatch-sample--surface {
    background-color: currentColor;
  }

  .color-swatch-sample--graphic {
    grid-auto-flow: column;
    justify-content: center;
    gap: 0.75rem;

    &::before {
      content: '';
      inline-size: 2rem;
      block-size: 2rem;
      border: 2px solid currentColor;
      border-radius: var(--radius-full);
    }

    &::after {
      content: '';
      inline-size: 3rem;
      block-size: 2px;
      background-color: currentColor;
    }
  }

  .color-swatch-body {
    display: grid;
    gap: 0.25rem;
    padding: 0.875rem;
    font-size: var(--font-size-sm);
    line-height: var(--line-height-ui);
    color: var(--color-grey-text);

    code {
      justify-self: start;
      font-size: var(--font-size-xs);
    }
  }

  .color-swatch-hex {
    min-block-size: 1lh;
    font-size: var(--font-size-xs);
    font-variant-numeric: tabular-nums;
    text-transform: uppercase;
  }
}
</style>

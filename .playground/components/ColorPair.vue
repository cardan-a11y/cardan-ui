<script setup lang="ts">
const { graphic = false } = defineProps<{
  /** The surface's custom property, such as `--color-bg` */
  bg: string;
  /** The custom property of the text or graphic on it */
  fg: string;
  /** Measures against 3:1, and shows a shape instead of text */
  graphic?: boolean;
}>();

const card = useTemplateRef('card');
const sample = useTemplateRef('sample');
const ratio = ref<number>();

useModeColors(() => {
  if (!card.value || !sample.value) return;

  const surface = parseComputedColor(
    getComputedStyle(card.value).backgroundColor,
  );
  const ink = parseComputedColor(getComputedStyle(sample.value).color);

  ratio.value = surface && ink ? contrastRatio(surface, ink) : undefined;
});

const ratioText = computed(() =>
  ratio.value === undefined
    ? ''
    : `${(Math.floor(ratio.value * 10) / 10).toFixed(1)} : 1`,
);

const level = computed(() => {
  if (ratio.value === undefined) return '';
  if (graphic) return ratio.value >= 3 ? 'AA' : 'Fails';
  if (ratio.value >= 7) return 'AAA';

  return ratio.value >= 4.5 ? 'AA' : 'Fails';
});
</script>

<template>
  <li
    ref="card"
    :class="['color-pair', graphic && 'color-pair--graphic']"
    :style="{ '--pair-bg': `var(${bg})`, '--pair-fg': `var(${fg})` }"
  >
    <span ref="sample" class="color-pair-sample" aria-hidden="true">
      <template v-if="!graphic">Aa</template>
    </span>

    <span class="color-pair-tokens">
      <code>{{ fg }}</code> on <code>{{ bg }}</code>
    </span>

    <span class="color-pair-result">
      <span>{{ ratioText }}</span>
      <span v-if="level" class="color-pair-level">{{ level }}</span>
    </span>
  </li>
</template>

<style>
.color-pair {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.125rem;
  border: 1px solid var(--card-border-color);
  border-radius: var(--radius-lg);
  background-color: var(--pair-bg);
  color: var(--pair-fg);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-ui);

  &.color-pair--graphic {
    color: var(--color-text);

    .color-pair-sample {
      inline-size: 2.25rem;
      border: 3px solid currentColor;
      border-radius: var(--radius-full);
    }
  }

  .color-pair-sample {
    block-size: 2.25rem;
    color: var(--pair-fg);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
  }

  code {
    padding: 0;
    background: none;
    color: inherit;
    font-size: var(--font-size-xs);
  }

  .color-pair-result {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    min-block-size: 1.5rem;
    margin-block-start: auto;
    font-weight: var(--font-weight-bold);
    font-variant-numeric: tabular-nums;
  }

  .color-pair-level {
    padding: 0.125rem 0.5rem;
    border-radius: var(--radius-sm);
    background-color: var(--color-white);
    color: var(--color-text);
  }
}
</style>

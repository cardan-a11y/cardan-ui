<script setup lang="ts">
/**
 * A value as a bar under its label: a `meter` (or `progressbar`) that `label`
 * names, visible unless `hideLabel`. The text next to the label says what the
 * bar shows and `aria-valuetext` repeats it, since a meter's children are
 * presentational.
 */
const {
  value,
  min = 0,
  max = 100,
  showPercentage = false,
  size = 'md',
  fontSize = 'sm',
  color = 'accent',
  role = 'meter',
  id = useId(),
} = defineProps<{
  label: string;
  hideLabel?: boolean;
  hideValue?: boolean;
  showPercentage?: boolean;
  value: number;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  fontSize?: FontSize;
  color?: 'accent' | 'green' | 'orange' | 'red';
  role?: 'meter' | 'progressbar';
  id?: string;
}>();

const { t } = useI18n();

/** 0 to 100: how far `value` is on its way from `min` to `max` */
const percentage = computed(() => {
  const fraction = (value - min) / (max - min);
  return Math.round(Math.min(1, Math.max(0, fraction || 0)) * 100);
});

/** What the bar shows, in words: "7 of 10", or "70%" with `showPercentage` */
const valueText = computed(() =>
  showPercentage
    ? `${percentage.value}%`
    : t('meter.value-of-max', { value, max }),
);
</script>

<template>
  <div
    :role="role"
    :aria-valuenow="value"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuetext="valueText"
    :aria-labelledby="id"
    :aria-busy="role === 'progressbar' && value < max"
    :class="['progress-meter-wrapper', `progress-meter-color--${color}`]"
    :style="`--progress-meter-font-size: var(--font-size-${fontSize})`"
  >
    <div :id="id" :class="['meter-label', hideLabel && 'visuallyhidden']">
      {{ label }}
    </div>

    <div :class="['meter-value', hideValue && 'visuallyhidden']">
      {{ valueText }}
    </div>

    <div
      :class="['meter', `meter-size--${size}`]"
      :style="`--progress-meter-width: ${percentage}%`"
    />
  </div>
</template>

<style>
.progress-meter-wrapper {
  display: grid;
  grid-template-columns: 1fr auto;
  justify-items: space-between;
  font-size: var(--progress-meter-font-size);

  .meter-label {
    font-weight: var(--font-weight-medium);
  }

  .meter-value {
    justify-self: end;
  }

  .meter {
    grid-column: 1 / -1;
    position: relative;
    background-color: var(--progress-stroke-bg);
    border-radius: var(--radius-full);
    overflow: hidden;
    display: block;
    width: 100%;
    margin-block-start: 0.25rem;

    &::after {
      content: '';
      height: 100%;
      background-color: var(--progress-stroke-color);
      position: absolute;
      inset: 0;
      width: var(--progress-meter-width);
      transition: width var(--duration-md) var(--cubic-bezier);
    }
  }
}

.meter-size--sm {
  height: 0.25rem;
}

.meter-size--md {
  height: 0.5rem;
}

.meter-size--lg {
  height: 1rem;
}

.progress-meter-color--accent {
  --progress-stroke-color: var(--color-accent-graphic);
  --progress-stroke-bg: var(--color-track);
}

.progress-meter-color--green {
  --progress-stroke-color: var(--color-green-graphic);
  --progress-stroke-bg: var(--color-track);
}

.progress-meter-color--orange {
  --progress-stroke-color: var(--color-orange-graphic);
  --progress-stroke-bg: var(--color-track);
}

.progress-meter-color--red {
  --progress-stroke-color: var(--color-red-graphic);
  --progress-stroke-bg: var(--color-track);
}
</style>

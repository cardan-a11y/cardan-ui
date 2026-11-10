<script setup lang="ts">
/**
 * A value as a ring with the number in it: a `meter` (or `progressbar`) that
 * `label` names for assistive technology, out of sight; "Progress" unless the
 * caller says what it measures. A meter's children are presentational, so the
 * slot is for sighted users (an icon, say) and `aria-valuetext` says what the
 * ring shows.
 */
const {
  value,
  min = 0,
  max = 100,
  label = undefined,
  showValue = false,
  size = 'xl',
  fontSize = 'sm',
  color = 'accent',
  role = 'meter',
  id = useId(),
} = defineProps<{
  value: number;
  max?: number;
  min?: number;
  /** What the ring measures, for assistive technology; "Progress" by default */
  label?: string;
  /** Shows the value instead of the percentage */
  showValue?: boolean;
  fontSize?: FontSize;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
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

/** What the ring shows, in words: "42%", or "7 of 10" with `showValue` */
const valueText = computed(() =>
  showValue ? t('meter.value-of-max', { value, max }) : `${percentage.value}%`,
);

const computedStyle = computed(() => ({
  '--progress-circle-font-size': `var(--font-size-${fontSize})`,
  '--progress-circle-percentage': percentage.value,
}));
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
    :class="[
      'progress-circle-wrapper',
      `progress-circle-size--${size}`,
      `progress-circle-color--${color}`,
    ]"
    :style="computedStyle"
  >
    <span :id="id" class="visuallyhidden">
      {{ label ?? $t('general.progress') }}
    </span>

    <slot />

    <div class="progress-circle-value">
      {{ showValue ? value : percentage + '%' }}
    </div>

    <div class="progress-circle" aria-hidden="true">
      <svg>
        <circle class="bg" />
        <circle class="fg" />
      </svg>
    </div>
  </div>
</template>

<style>
.progress-circle-wrapper {
  --progress-circle-bg: transparent;
  --progress-circle-half-size: calc(var(--progress-circle-size) / 2);
  --progress-circle-radius: calc(
    (var(--progress-circle-size) - var(--progress-stroke-width)) / 2
  );
  --progress-circle-circumference: calc(var(--progress-circle-radius) * pi * 2);
  --progress-circle-dash: calc(
    (var(--progress-circle-percentage) * var(--progress-circle-circumference)) /
      100
  );

  position: relative;
  width: var(--progress-circle-size);
  height: var(--progress-circle-size);
  font-size: var(--progress-circle-font-size);
  font-weight: var(--font-weight-semibold);
  display: grid;
  place-content: center;

  .progress-circle-value {
    color: var(--progress-label-color);
  }

  .progress-circle {
    position: absolute;
    inset: 0;

    svg {
      width: var(--progress-circle-size);
      height: var(--progress-circle-size);
    }

    circle {
      cx: var(--progress-circle-half-size);
      cy: var(--progress-circle-half-size);
      r: var(--progress-circle-radius);
      fill: transparent;
      stroke-width: var(--progress-stroke-width);

      &.bg {
        stroke: var(--progress-stroke-bg);
        fill: var(--progress-circle-bg);
      }

      &.fg {
        stroke: var(--progress-stroke-color);
        stroke-width: var(--progress-stroke-width);
        stroke-dasharray: var(--progress-circle-dash)
          calc(
            var(--progress-circle-circumference) - var(--progress-circle-dash)
          );
        transform: rotate(-90deg);
        transform-origin: var(--progress-circle-half-size)
          var(--progress-circle-half-size);
        transition:
          stroke var(--duration-sm) ease-in-out,
          stroke-dasharray var(--duration-md) var(--cubic-bezier);
      }
    }
  }
}

.progress-circle-color--accent {
  --progress-label-color: var(--color-accent-text);
  --progress-stroke-color: var(--color-accent-graphic);
  --progress-stroke-bg: var(--color-track);
}

.progress-circle-color--green {
  --progress-label-color: var(--color-green-text);
  --progress-stroke-color: var(--color-green-graphic);
  --progress-stroke-bg: var(--color-track);
}

.progress-circle-color--orange {
  --progress-label-color: var(--color-orange-text);
  --progress-stroke-color: var(--color-orange-graphic);
  --progress-stroke-bg: var(--color-track);
}

.progress-circle-color--red {
  --progress-label-color: var(--color-red-text);
  --progress-stroke-color: var(--color-red-graphic);
  --progress-stroke-bg: var(--color-track);
}

.progress-circle-size--xl {
  --progress-circle-size: 8rem;
  --progress-stroke-width: 10px;
}

.progress-circle-size--lg {
  --progress-circle-size: 6rem;
  --progress-stroke-width: 8px;
}

.progress-circle-size--md {
  --progress-circle-size: 4rem;
  --progress-stroke-width: 5px;
}

.progress-circle-size--sm {
  --progress-circle-size: 3rem;
  --progress-stroke-width: 3px;
}

.progress-circle-size--xs {
  --progress-circle-size: 2.5rem;
  --progress-stroke-width: 3px;
}
</style>

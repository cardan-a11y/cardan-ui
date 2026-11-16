<script setup lang="ts">
const model = defineModel<number>();

const {
  min = 0,
  max = 100,
  step = 1,
  id = useId(),
  ticks = undefined,
  name = undefined,
  ariaValuetext = undefined,
  tabindex = undefined,
  variant = 'accent',
} = defineProps<{
  label: string;
  name?: string;
  min?: number;
  max?: number;
  step?: number;
  ticks?: (number | { value: number; label: string })[];
  showTicks?: boolean;
  showOutput?: boolean;
  hideLabel?: boolean;
  disabled?: boolean;
  required?: boolean;
  ariaValuetext?: string;
  tabindex?: string;
  id?: string;
  variant?: 'accent' | 'hue';
}>();

const range = computed(() => max - min);

/**
 * The value on the track; the minimum until there is one. The input shows
 * it too: on its own the browser would put the thumb in the middle
 */
const value = computed(() => Number(model.value ?? min));

function handleInput(event: Event) {
  model.value = Number((event.target as HTMLInputElement).value);
}

const ratio = computed(() => (value.value - min) / range.value);

const ticksLength = computed(() => range.value / step + 1);

// Every tick as { value, label }, whether it was passed as a number or an object
const ticksList = computed(() =>
  (
    ticks ?? Array.from({ length: ticksLength.value }, (_, i) => i * step + min)
  ).map((tick) =>
    typeof tick === 'number' ? { value: tick, label: String(tick) } : tick,
  ),
);

/** The label of the tick at the value, when ticks have labels of their own */
const computedAriaValuetext = computed(() => {
  if (ariaValuetext) return ariaValuetext;

  const tick = ticksList.value.find((tick) => tick.value === value.value);
  return tick && tick.label !== String(tick.value) ? tick.label : undefined;
});
</script>

<template>
  <FormField
    :id="id"
    :class="['range-input-wrapper', `range-input-variant--${variant}`]"
    :style="[
      `--range-input-min: ${min}`,
      `--range-input-range: ${range}`,
      `--range-input-ratio: ${ratio}`,
      `--range-input-value: ${value}`,
    ]"
    :label="label"
    :hide-label="hideLabel"
    :required="required"
    :disabled="disabled"
  >
    <input
      :id="id"
      ref="input"
      :value="value"
      class="range-input"
      :name="name"
      :disabled="disabled"
      :aria-valuetext="computedAriaValuetext"
      :min="min"
      :max="max"
      :step="step"
      :tabindex="tabindex"
      type="range"
      @input="handleInput"
    />

    <ClientOnly>
      <div v-if="showTicks" class="range-input-ticks" aria-hidden="true">
        <span
          v-for="tick in ticksList"
          :key="tick.value"
          :class="['tick', value === tick.value && 'active']"
        >
          {{ tick.label }}
        </span>
      </div>

      <output v-if="showOutput" class="range-output">
        {{ value }}
      </output>
    </ClientOnly>
  </FormField>
</template>

<style>
.range-input-wrapper {
  --range-input-thumb-color: var(--color-accent-graphic);
  --range-input-thumb-width: 1.5rem;
  --range-input-thumb-height: 1.5rem;
  --range-input-thumb-border-size: 2px;
  --range-input-thumb-border-color: var(--color-card-bg);
  --range-input-thumb-radius: var(--radius-full);

  --range-input-track-bg-color: var(--color-track);
  --range-input-track-progress-color: var(--color-accent-graphic);
  --range-input-output-bg-color: var(--color-accent-bg);
  --range-input-track-radius: var(--radius-full);
  --range-input-track-height: 1rem;
  --range-input-track-width: 100%;

  &:has(:disabled) {
    opacity: 35%;
  }

  position: relative;
  width: var(--range-input-track-width);

  label {
    margin-block-end: 0.5rem;
    color: var(--color-text);
  }
}

.range-input-wrapper .range-input {
  -webkit-appearance: none;
  appearance: none;
  border: none;
  background: transparent;
  margin: 0;
  width: var(--range-input-track-width);

  --range-input-sx: calc(
    var(--range-input-thumb-width) / 2 + var(--range-input-ratio) *
      (100% - var(--range-input-thumb-width))
  );
  --range-input-progress-gradient: linear-gradient(
      var(--range-input-track-progress-color),
      var(--range-input-track-progress-color)
    )
    0 / var(--range-input-sx) 100% no-repeat var(--range-input-track-bg-color);
}

/* slider track */
.range-input-wrapper .range-input::-webkit-slider-runnable-track {
  background-color: var(--range-input-track-bg-color);
  background: var(--range-input-progress-gradient);
  border-radius: var(--range-input-track-radius);
  height: var(--range-input-track-height);
}

.range-input-wrapper .range-input::-moz-range-track {
  background-color: var(--range-input-track-bg-color);
  background: var(--range-input-progress-gradient);
  border-radius: var(--range-input-track-radius);
  height: var(--range-input-track-height);
}

/* slider thumb */
.range-input-wrapper .range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  margin-block-start: calc(
    (var(--range-input-track-height) / 2) -
      (var(--range-input-thumb-height) / 2)
  );
  will-change: scale;
  transition: scale var(--duration-xs);
  background-color: var(--range-input-thumb-color);
  height: var(--range-input-thumb-height);
  width: var(--range-input-thumb-width);
  border-radius: var(--range-input-thumb-radius);
  border: var(--range-input-thumb-border-size, 0px) solid
    var(--range-input-thumb-border-color, transparent);
}

.range-input-wrapper .range-input::-moz-range-thumb {
  will-change: scale;
  transition: scale var(--duration-xs);
  background-color: var(--range-input-thumb-color);
  height: calc(
    var(--range-input-thumb-height) -
      (var(--range-input-thumb-border-size, 0px) * 2)
  );
  width: calc(
    var(--range-input-thumb-width) -
      (var(--range-input-thumb-border-size, 0px) * 2)
  );

  border-radius: var(--range-input-thumb-radius);
  border: var(--range-input-thumb-border-size, 0px) solid
    var(--range-input-thumb-border-color, transparent);
}

.range-input-wrapper .range-input:hover::-webkit-slider-thumb {
  scale: 1.2;
}
.range-input-wrapper .range-input:hover::-moz-range-thumb {
  scale: 1.2;
}
.range-input-wrapper .range-input:active::-webkit-slider-thumb {
  scale: 1.2;
}
.range-input-wrapper .range-input:active::-moz-range-thumb {
  scale: 1.2;
}

.range-input-wrapper .range-input:focus-visible {
  &::-webkit-slider-thumb {
    outline: 2px solid var(--focus-color);
    outline-offset: 0.125rem;
  }

  &::-moz-range-thumb {
    outline: 2px solid var(--focus-color);
    outline-offset: 0.125rem;
  }
}

.range-input-variant--hue .range-input {
  --range-input-track-height: 0.25rem;
  --range-input-thumb-color: hsl(var(--range-input-value) 100% 65%);
  --range-input-progress-gradient: linear-gradient(
    to right,
    #ff0000 0%,
    #ffff00 16.667%,
    #00ff00 33.333%,
    #00ffff 50%,
    #0000ff 66.667%,
    #ff00ff 83.333%,
    #ff0000 100%
  );
}

/* slider focus: the ring is on the thumb */
.range-input-wrapper .range-input:focus {
  outline: none;
}

/* slider ticks */
.range-input-ticks {
  width: 100%;
  font-size: var(--font-size-xxs);
  color: var(--color-grey-text);
  display: flex;
  justify-content: space-between;
  padding-inline: calc((var(--range-input-thumb-width) / 2) - 1px);

  .tick {
    position: relative;
    display: flex;
    justify-content: center;
    width: 2px;
    user-select: none;
    margin-block-end: 0.1rem;
    margin-block-start: 0.5rem;

    &::before {
      content: '';
      position: absolute;
      bottom: 100%;
      width: 1px;
      height: 0.5rem;
      background-color: var(--range-input-track-bg-color);
    }

    &.active {
      font-weight: var(--font-weight-semibold);
      color: var(--color-accent-text);

      &::before {
        background-color: var(--range-input-thumb-color);
      }
    }
  }
}

/* slider output */
.range-input-wrapper {
  output {
    --range-input-perc: calc(
      (var(--range-input-value) - var(--range-input-min)) /
        var(--range-input-range)
    );
    --range-input-offset: calc(
      (var(--range-input-thumb-width) / 2) - var(--range-input-thumb-width) *
        var(--range-input-perc)
    );
    --range-input-left: calc(
      (var(--range-input-perc) * 100%) + var(--range-input-offset)
    );

    z-index: 1;
    position: absolute;
    top: calc(100% + 0.5rem);
    left: var(--range-input-left);
    padding-block: 0.125rem;
    padding-inline: 0.25rem;
    min-width: 1.5rem;
    text-align: center;
    transform: translateX(-50%);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    border-radius: var(--radius-sm);
    color: var(--color-accent-text);
    background-color: var(--range-input-output-bg-color);

    &::before {
      content: '';
      bottom: 100%;
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      border-bottom: 5px solid var(--range-input-output-bg-color);
      border-top: 5px solid transparent;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
    }
  }

  &:has(.range-input-ticks) {
    output {
      top: calc(100% - 1rem);
    }
  }

  &:not(:has(.range-input-ticks)) {
    &:has(output) {
      margin-block-end: 1.5rem;
    }
  }
}
</style>

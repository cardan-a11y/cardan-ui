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

const ratio = computed(() => (Number(model.value) - min) / range.value);

const ticksLength = computed(() => range.value / step + 1);

// Every tick as { value, label }, whether it was passed as a number or an object
const ticksList = computed(() =>
  (
    ticks ?? Array.from({ length: ticksLength.value }, (_, i) => i * step + min)
  ).map((tick) =>
    typeof tick === 'number' ? { value: tick, label: String(tick) } : tick,
  ),
);
</script>

<template>
  <FormField
    :id="id"
    :class="['range-input-wrapper', `range-input-variant--${variant}`]"
    :style="[
      `--min: ${min}`,
      `--max: ${max}`,
      `--range: ${range}`,
      `--ratio: ${ratio}`,
      `--value: ${model}`,
    ]"
    :label="label"
    :hide-label="hideLabel"
    :required="required"
    :disabled="disabled"
  >
    <input
      :id="id"
      ref="input"
      v-model.number="model"
      class="range-input"
      :name="name"
      :disabled="disabled"
      :aria-valuetext="ariaValuetext"
      :min="min"
      :max="max"
      :step="step"
      :tabindex="tabindex"
      type="range"
    />

    <ClientOnly>
      <div v-if="showTicks" class="range-input-ticks" aria-hidden="true">
        <span
          v-for="tick in ticksList"
          :key="tick.value"
          :class="['tick', model === tick.value && 'active']"
        >
          {{ tick.label }}
        </span>
      </div>

      <output v-if="showOutput" class="range-output">
        {{ model }}
      </output>
    </ClientOnly>
  </FormField>
</template>

<style>
.range-input-wrapper {
  --thumb-color: var(--color-accent-graphic);
  --thumb-width: 1.5rem;
  --thumb-height: 1.5rem;
  --thumb-border-size: 2px;
  --thumb-border-color: var(--color-card-bg);
  --thumb-radius: var(--radius-full);

  --track-bg-color: var(--color-track);
  --track-progress-color: var(--color-accent-graphic);
  --output-bg-color: var(--color-accent-bg);
  --track-radius: var(--radius-full);
  --track-height: 1rem;
  --track-width: 100%;

  &:has(:disabled) {
    opacity: 35%;
  }

  position: relative;
  width: var(--track-width);

  label {
    margin-block-end: 0.5rem;
    color: var(--color-text);
  }
}

input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  border: none;
  background: transparent;
  margin: 0;
  width: var(--track-width);

  --sx: calc(
    var(--thumb-width) / 2 + var(--ratio) * (100% - var(--thumb-width))
  );
  --progress-gradient: linear-gradient(
      var(--track-progress-color),
      var(--track-progress-color)
    )
    0 / var(--sx) 100% no-repeat var(--track-bg-color);
}

/* slider track */
input[type='range']::-webkit-slider-runnable-track {
  background-color: var(--track-bg-color);
  background: var(--progress-gradient);
  border-radius: var(--track-radius);
  height: var(--track-height);
}

input[type='range']::-moz-range-track {
  background-color: var(--track-bg-color);
  background: var(--progress-gradient);
  border-radius: var(--track-radius);
  height: var(--track-height);
}

/* slider thumb */
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  margin-block-start: calc(
    (var(--track-height) / 2) - (var(--thumb-height) / 2)
  );
  will-change: scale;
  transition: scale var(--duration-xs);
  background-color: var(--thumb-color);
  height: var(--thumb-height);
  width: var(--thumb-width);
  border-radius: var(--thumb-radius);
  border: var(--thumb-border-size, 0px) solid
    var(--thumb-border-color, transparent);
}

input[type='range']::-moz-range-thumb {
  will-change: scale;
  transition: scale var(--duration-xs);
  background-color: var(--thumb-color);
  height: calc(var(--thumb-height) - (var(--thumb-border-size, 0px) * 2));
  width: calc(var(--thumb-width) - (var(--thumb-border-size, 0px) * 2));

  border-radius: var(--thumb-radius);
  border: var(--thumb-border-size, 0px) solid
    var(--thumb-border-color, transparent);
}

input[type='range']:hover::-webkit-slider-thumb {
  scale: 1.2;
}
input[type='range']:hover::-moz-range-thumb {
  scale: 1.2;
}
input[type='range']:active::-webkit-slider-thumb {
  scale: 1.2;
}
input[type='range']:active::-moz-range-thumb {
  scale: 1.2;
}

/* slider focus */
input[type='range']:focus {
  outline: none;
}

input[type='range']:focus-visible {
  &::-webkit-slider-thumb {
    outline: 2px solid var(--focus-color);
    outline-offset: 0.125rem;
  }

  &::-moz-range-thumb {
    outline: 2px solid var(--focus-color);
    outline-offset: 0.125rem;
  }
}

.range-input-variant--hue input[type='range'] {
  --track-height: 0.25rem;
  --thumb-color: hsl(var(--value) 100% 65%);
  --progress-gradient: linear-gradient(
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

/* slider ticks */
.range-input-ticks {
  width: 100%;
  font-size: var(--font-size-xxs);
  color: var(--color-grey-text);
  display: flex;
  justify-content: space-between;
  padding-inline: calc((var(--thumb-width) / 2) - 1px);

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
      background-color: var(--track-bg-color);
    }

    &.active {
      font-weight: var(--font-weight-semibold);
      color: var(--color-accent-text);

      &::before {
        background-color: var(--thumb-color);
      }
    }
  }
}

/* slider output */
.range-input-wrapper {
  output {
    --perc: calc((var(--value) - var(--min)) / var(--range));
    --offset: calc((var(--thumb-width) / 2) - var(--thumb-width) * var(--perc));
    --left: calc((var(--perc) * 100%) + var(--offset));

    z-index: 1;
    position: absolute;
    top: calc(100% + 0.5rem);
    left: var(--left);
    padding-block: 0.125rem;
    padding-inline: 0.25rem;
    min-width: 1.5rem;
    text-align: center;
    transform: translateX(-50%);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    border-radius: var(--radius-sm);
    color: var(--color-accent-text);
    background-color: var(--output-bg-color);

    &::before {
      content: '';
      bottom: 100%;
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      border-bottom: 5px solid var(--output-bg-color);
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

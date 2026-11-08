<script setup lang="ts">
const { locale } = useI18n();

const {
  label = undefined,
  icon = undefined,
  color = undefined,
  radius = undefined,
  variant = 'flat',
  size = 'md',
  fontSize = undefined,
  iconSize = undefined,
  textTransform = undefined,
} = defineProps<{
  label?: string | number;
  icon?: string;
  fontSize?: FontSize;
  iconSize?: FontSize;
  variant?: ChipVariant;
  color?: BaseColor;
  size?: ChipSize;
  radius?: BorderRadius;
  textTransform?: TextTransform;
}>();

const computedStyle = computed(() => ({
  '--chip-radius': radius && `var(--radius-${radius})`,
  '--chip-font-size': fontSize && `var(--font-size-${fontSize})`,
  '--chip-icon-size': iconSize && `var(--font-size-${iconSize})`,
}));

const formattedLabel = computed(() =>
  typeof label === 'number' ? label.toLocaleString(locale.value) : label,
);
</script>

<template>
  <span
    :class="[
      'chip',
      `chip-variant--${variant}`,
      `chip-color--${color}`,
      `chip-size--${size}`,
      textTransform && `chip-text-transform--${textTransform}`,
    ]"
    :style="computedStyle"
  >
    <slot name="inline-start" />

    <Icon v-if="icon" :name="icon" />

    <span v-if="label !== undefined" class="chip-text">{{
      formattedLabel
    }}</span>

    <slot mdc-unwrap="p" />

    <slot name="inline-end" />
  </span>
</template>

<style>
.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  gap: 0.25em;
  padding-inline: 0.5em;
  border-radius: var(--chip-radius, var(--radius-md));
  border: 1px solid transparent;
  font-weight: var(--font-weight-medium);
  font-variant-numeric: tabular-nums;

  .iconify {
    font-size: var(--chip-icon-size, larger);
  }
}

/* Uppercase text needs extra letter spacing to stay legible */
.chip-text-transform--uppercase {
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.chip-text-transform--lowercase {
  text-transform: lowercase;
}

.chip-text-transform--capitalize .chip-text::first-letter {
  text-transform: capitalize;
}

/* Chip sizes */
.chip-size--xs {
  /* border-radius: var(--chip-radius, var(--radius-sm)); */
  font-size: var(--chip-font-size, var(--font-size-xxs));
  padding-block: 0.03125rem;
  gap: 0.125rem;
}

.chip-size--sm {
  font-size: var(--chip-font-size, var(--font-size-xs));

  padding-block: 0.0625rem;
}

.chip-size--md {
  font-size: var(--chip-font-size, var(--font-size-xs));

  padding-block: 0.125rem;
}

.chip-size--lg {
  font-size: var(--chip-font-size, var(--font-size-sm));

  padding-block: 0.25rem;
}

.chip-size--xl {
  border-radius: var(--chip-radius, var(--radius-lg));
  border-width: 2px;
  font-size: var(--chip-font-size, var(--font-size-md));

  padding-block: 0.25rem;
}

/* Flat Chip */
.chip-variant--flat {
  color: var(--color-text);
  background-color: var(--color-grey-bg);
}

.chip-variant--flat.chip-color--accent {
  color: var(--color-accent-text);
  background-color: var(--color-accent-bg);
}

.chip-variant--flat.chip-color--grey {
  color: var(--color-grey-text);
  background-color: var(--color-bg);
}

.chip-variant--flat.chip-color--red {
  color: var(--color-red-text);
  background-color: var(--color-red-bg);
}

.chip-variant--flat.chip-color--orange {
  color: var(--color-orange-text);
  background-color: var(--color-orange-bg);
}

.chip-variant--flat.chip-color--yellow {
  color: var(--color-yellow-text);
  background-color: var(--color-yellow-bg);
}

.chip-variant--flat.chip-color--green {
  color: var(--color-green-text);
  background-color: var(--color-green-bg);
}

.chip-variant--flat.chip-color--blue {
  color: var(--color-blue-text);
  background-color: var(--color-blue-bg);
}

.chip-variant--flat.chip-color--purple {
  color: var(--color-purple-text);
  background-color: var(--color-purple-bg);
}

.chip-variant--flat.chip-color--pink {
  color: var(--color-pink-text);
  background-color: var(--color-pink-bg);
}

/* Soft Chip */
.chip-variant--soft {
  color: var(--color-text);
  border-color: var(--color-grey-bg);
  background-color: var(--color-white);
}

.chip-variant--soft.chip-color--accent {
  color: var(--color-accent-text);
  border-color: var(--color-accent-bg);
}

.chip-variant--soft.chip-color--grey {
  color: var(--color-grey-text);
  border-color: var(--color-grey-bg);
}

.chip-variant--soft.chip-color--red {
  color: var(--color-red-text);
  border-color: var(--color-red-bg);
}

.chip-variant--soft.chip-color--orange {
  color: var(--color-orange-text);
  border-color: var(--color-orange-bg);
}

.chip-variant--soft.chip-color--yellow {
  color: var(--color-yellow-text);
  border-color: var(--color-yellow-bg);
}

.chip-variant--soft.chip-color--green {
  color: var(--color-green-text);
  border-color: var(--color-green-bg);
}

.chip-variant--soft.chip-color--blue {
  color: var(--color-blue-text);
  border-color: var(--color-blue-bg);
}

.chip-variant--soft.chip-color--purple {
  color: var(--color-purple-text);
  border-color: var(--color-purple-bg);
}

.chip-variant--soft.chip-color--pink {
  color: var(--color-pink-text);
  border-color: var(--color-pink-bg);
}

/* Outline Chip */

.chip-variant--outline {
  color: var(--color-text);
  border-color: var(--color-grey-graphic);
  background-color: var(--color-white);
}

.chip-variant--outline.chip-color--accent {
  color: var(--color-accent-text);
  border-color: var(--color-accent-graphic);
}

.chip-variant--outline.chip-color--grey {
  color: var(--color-grey-text);
  border-color: var(--color-grey-bg);
}

.chip-variant--outline.chip-color--red {
  color: var(--color-red-text);
  border-color: var(--color-red-graphic);
}

.chip-variant--outline.chip-color--orange {
  color: var(--color-orange-text);
  border-color: var(--color-orange-graphic);
}

.chip-variant--outline.chip-color--yellow {
  color: var(--color-yellow-text);
  border-color: var(--color-yellow-graphic);
}

.chip-variant--outline.chip-color--green {
  color: var(--color-green-text);
  border-color: var(--color-green-graphic);

  .iconify {
    color: var(--color-green-graphic);
  }
}

.chip-variant--outline.chip-color--blue {
  color: var(--color-blue-text);
  border-color: var(--color-blue-graphic);
}

.chip-variant--outline.chip-color--purple {
  color: var(--color-purple-text);
  border-color: var(--color-purple-graphic);
}

.chip-variant--outline.chip-color--pink {
  color: var(--color-pink-text);
  border-color: var(--color-pink-graphic);
}

/* Solid Chip: the text color as background, at least 4.5:1 in both modes */

.chip-variant--solid {
  color: var(--color-white);
  background-color: var(--color-text);
}

.chip-variant--solid.chip-color--grey {
  color: var(--color-white);
  background-color: var(--color-grey-text);
}

.chip-variant--solid.chip-color--accent {
  background-color: var(--color-accent-text);
}

.chip-variant--solid.chip-color--red {
  background-color: var(--color-red-text);
}

.chip-variant--solid.chip-color--orange {
  background-color: var(--color-orange-text);
}

.chip-variant--solid.chip-color--yellow {
  background-color: var(--color-yellow-text);
}

.chip-variant--solid.chip-color--green {
  background-color: var(--color-green-text);
}

.chip-variant--solid.chip-color--blue {
  background-color: var(--color-blue-text);
}

.chip-variant--solid.chip-color--purple {
  background-color: var(--color-purple-text);
}

.chip-variant--solid.chip-color--pink {
  background-color: var(--color-pink-text);
}
</style>

<script setup lang="ts">
/**
 * The text of an empty list or search, from `text` or the default slot, with
 * an optional decorative `icon` and an `actions` slot (a "Reset filters"
 * button). Without actions it is one `<p class="empty-message">`. It is not
 * a live region: announce a change in place with `useResultsFocus()` or the
 * page's own status element. A paragraph that must stay the page's own, such
 * as a live region, takes the class `empty-message` for the same look, in a
 * component that also renders an EmptyMessage.
 *
 * A project sets its look in its `main.css`:
 * - `--empty-message-color`: `var(--color-grey-text)` by default
 * - `--empty-message-font-size`: the surrounding size (`1em`) by default
 * - `--empty-message-font-style`: `normal` by default
 *
 * It has no outer margin. Where it is used, a class of the project's own on
 * the component sets `--empty-message-margin-block`.
 */
const { text = undefined, icon = undefined } = defineProps<{
  text?: string;
  icon?: string;
}>();

defineSlots<{
  default?: () => unknown;
  actions?: () => unknown;
}>();
</script>

<template>
  <div v-if="$slots.actions" class="empty-message-wrapper">
    <p :class="['empty-message', { 'empty-message--icon': icon }]">
      <span v-if="icon" class="empty-message-icon-box">
        <Icon :name="icon" />
      </span>
      <span
        ><slot>{{ text }}</slot></span
      >
    </p>

    <div class="empty-message-actions">
      <slot name="actions" />
    </div>
  </div>

  <p v-else :class="['empty-message', { 'empty-message--icon': icon }]">
    <span v-if="icon" class="empty-message-icon-box">
      <Icon :name="icon" />
    </span>
    <span
      ><slot>{{ text }}</slot></span
    >
  </p>
</template>

<style>
.empty-message {
  margin-block: var(--empty-message-margin-block, 0);
  color: var(--empty-message-color, var(--color-grey-text));
  font-size: var(--empty-message-font-size, 1em);
  font-style: var(--empty-message-font-style, normal);
  overflow-wrap: anywhere;

  &.empty-message--icon {
    display: flex;
    align-items: flex-start;
    gap: 0.5em;
  }

  .empty-message-icon-box {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    min-block-size: 1lh;
  }
}

.empty-message-wrapper {
  display: flex;
  margin-block: var(--empty-message-margin-block, 0);
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;

  .empty-message {
    margin-block: 0;
  }

  .empty-message-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}
</style>

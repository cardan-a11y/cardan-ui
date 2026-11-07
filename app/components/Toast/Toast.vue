<script setup lang="ts">
import { useFocusWithin, useMounted, useWindowFocus } from '@vueuse/core';
const windowFocused = useWindowFocus();
/** The server cannot know the window's focus, so it counts only after hydration. */
const mounted = useMounted();

const {
  color = 'accent',
  timeout = undefined,
  icon = undefined,
  label = undefined,
  id = undefined,
  role = undefined,
} = defineProps<{
  color?: ToastColor;
  timeout?: number;
  icon?: string;
  label?: string;
  id?: string;
  /** `alert` for a message that interrupts, `status` or none for the rest */
  role?: 'status' | 'alert';
}>();

const toastElementRef = useTemplateRef('toastElement');
const timerElementRef = useTemplateRef('timerElement');
const toastHover = ref(false);
const { focused: toastFocused } = useFocusWithin(toastElementRef);

/** The timer waits while the pointer or keyboard focus is on the toast, or the window is in the background. */
const timerPaused = computed(
  () =>
    toastHover.value ||
    toastFocused.value ||
    (mounted.value && !windowFocused.value),
);

const computedIcon = computed(() => {
  if (icon) return icon;
  if (color === 'blue') return 'material-symbols:info-rounded';
  if (color === 'green') return 'material-symbols:check-circle-rounded';
  if (color === 'red') return 'material-symbols:cancel-rounded';
  if (color === 'orange') return 'material-symbols:warning-rounded';
  return icon;
});

const hideTimer = computed(() => {
  if (timeout) return false;
  return true;
});

function handleAnimationEnd() {
  emit('hide', id);
}

onMounted(() => {
  if (hideTimer.value) return;
  timerElementRef.value?.addEventListener('animationend', handleAnimationEnd);
});

onUnmounted(() => {
  if (hideTimer.value) return;
  timerElementRef.value?.removeEventListener(
    'animationend',
    handleAnimationEnd,
  );
});

const emit = defineEmits<{
  hide: [value?: string];
}>();
</script>

<template>
  <section
    ref="toastElement"
    :role="role"
    :class="[
      'toast',
      `toast-color--${color}`,
      `${hideTimer ? 'hide-toast-timer' : ''}`,
    ]"
    @mouseover="toastHover = true"
    @mouseleave="toastHover = false"
  >
    <div class="toast__content">
      <Icon v-if="computedIcon" :name="computedIcon" class="toast__icon" />

      <div v-if="label" class="toast__label">
        {{ label }}
      </div>

      <slot />
    </div>

    <div
      ref="timerElement"
      class="toast__timer"
      :style="[
        `--animation-duration: ${timeout}ms`,
        `--animation-play-state: ${timerPaused ? 'paused' : 'running'}`,
      ]"
    />

    <Button
      icon="material-symbols:close-rounded"
      :label="$t('general.close')"
      hide-label
      radius="full"
      size="sm"
      variant="ghost"
      @click="emit('hide', id)"
    />
  </section>
</template>

<style>
.toast {
  pointer-events: all;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-block: 0.5rem;
  padding-inline: 1rem 0.5rem;
  margin-block-end: 0.5rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-grey-light);
  background-color: var(--color-card-bg);
  overflow: hidden;
  max-width: 100%;

  @media (min-width: 768px) {
    max-width: 480px;
  }
}

.toast__content {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}

.toast__timer {
  position: absolute;
  inset-inline: 0;
  inset-block: auto 0;
  height: 4px;
  width: 100%;
  background-color: var(--color-grey-bg);
  transform-origin: left;
  animation: scale-x linear 1 forwards;
  animation-delay: var(--duration-xl);
  animation-duration: var(--animation-duration);
  animation-play-state: var(--animation-play-state);
}

.toast__icon {
  font-size: var(--font-size-lg);
}

.toast__label {
  margin-block: 0;
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  color: var(--color-text);
}

/* Toast variants */
.toast-color--blue {
  .toast__icon {
    color: var(--color-blue-text);
  }
  .toast__timer {
    background-color: var(--color-blue);
  }
}

.toast-color--green {
  .toast__icon {
    color: var(--color-green-graphic);
  }
  .toast__timer {
    background-color: var(--color-green);
  }
}

.toast-color--red {
  .toast__icon {
    color: var(--color-red-graphic);
  }
  .toast__timer {
    background-color: var(--color-red);
  }
}

.toast-color--orange {
  .toast__icon {
    color: var(--color-orange-graphic);
  }
  .toast__timer {
    background-color: var(--color-orange);
  }
}

.toast-color--accent {
  .toast__icon {
    color: var(--color-accent-graphic);
  }
  .toast__timer {
    background-color: var(--color-accent-graphic);
  }
}

.hide-toast-timer .toast__timer {
  background-color: transparent;
}

/* Transitions: slide and fade; a leaving toast collapses */
.toast-move {
  transition: all var(--duration-md) var(--cubic-bezier);
}

.toast-leave-active,
.toast-enter-active {
  animation-fill-mode: both;
  animation-duration: var(--duration-md);
  animation-timing-function: var(--cubic-bezier);
}

.toast-enter-active {
  animation-name: toastInBottom;

  @media (min-width: 768px) {
    animation-name: toastInRight;
  }
}

.toast-leave-active {
  animation-name: toastOutBottom;

  @media (min-width: 768px) {
    animation-name: toastOutRight;
  }
}

@keyframes scale-x {
  to {
    transform: scaleX(0);
  }
}

@keyframes toastInBottom {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
}

@keyframes toastInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
}

@keyframes toastOutBottom {
  to {
    opacity: 0;
    transform: translateY(100%);
    block-size: 0;
    padding-block: 0;
    margin-block-end: 0;
    border-block-width: 0;
  }
}

@keyframes toastOutRight {
  to {
    opacity: 0;
    transform: translateX(100%);
    block-size: 0;
    padding-block: 0;
    margin-block-end: 0;
    border-block-width: 0;
  }
}
</style>

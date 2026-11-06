<script setup lang="ts">

const { t } = useI18n();
const {
  color = 'accent',
  fontSize = 'sm',
  iconSize = 'md',
  icon = undefined,
  content = undefined,
  ariaLabel = undefined,
  radius = undefined,
  variant = 'solid',
} = defineProps<{
  color?: 'accent' | 'blue' | 'green' | 'red' | 'orange';
  fontSize?: FontSize;
  iconSize?: FontSize;
  icon?: string | false;
  content?: string;
  ariaLabel?: string;
  radius?: BorderRadius;
  variant?: CalloutVariant;
}>();

const computedStyle = computed(() => ({
  '--callout-font-size': `var(--font-size-${fontSize})`,
  '--callout-icon-size': `var(--font-size-${iconSize})`,
  '--callout-radius': radius && `var(--radius-${radius})`,
}));

const computedIcon = computed(() => {
  if (icon !== undefined) return icon;

  if (color === 'blue') return 'material-symbols:info-outline-rounded';
  if (color === 'green') return 'material-symbols:check-circle-outline-rounded';
  if (color === 'red') return 'material-symbols:cancel-outline-rounded';
  if (color === 'orange') return 'material-symbols:warning-outline-rounded';

  return icon;
});

const computedIconLabel = computed(() => {
  if (color === 'blue') return t('aria.callout-info');
  if (color === 'green') return t('aria.callout-success');
  if (color === 'red') return t('aria.callout-error');
  if (color === 'orange') return t('aria.callout-warning');

  return undefined;
});
</script>

<template>
  <section
    :aria-label="ariaLabel"
    :class="[
      'callout-wrapper',
      `callout-color--${color}`,
      `callout-variant--${variant}`,
    ]"
    :style="computedStyle"
  >
    <div class="callout-content">
      <Icon v-if="computedIcon" :name="computedIcon" class="callout-icon" />
      <strong v-if="computedIconLabel" class="visuallyhidden">
        {{ computedIconLabel }}
      </strong>

      <div v-if="content">{{ content }}</div>

      <div v-if="$slots.default" class="default-slot">
        <slot mdc-unwrap="p" />
      </div>
    </div>
  </section>
</template>

<style>
.callout-wrapper {
  display: inline-block;
  padding-inline: 0.75rem;
  padding-block: 0.5rem;
  border: 1px solid transparent;
  border-radius: var(--callout-radius, var(--radius-md));
  font-size: var(--callout-font-size);

  .callout-content {
    display: flex;
    align-items: center;
    gap: 0.75em;

    .callout-icon {
      flex-shrink: 0;
      font-size: var(--callout-icon-size);
    }
  }

  .default-slot {
    flex-grow: 1;
  }
}

.callout-color--accent {
  color: var(--color-accent-text);
  background-color: var(--color-accent-bg);
}

.callout-color--red {
  color: var(--color-red-text);
  background-color: var(--color-red-bg);
}

.callout-color--orange {
  color: var(--color-orange-text);
  background-color: var(--color-orange-bg);
}

.callout-color--green {
  color: var(--color-green-text);
  background-color: var(--color-green-bg);
}

/* Info callouts use the neutral surface */
.callout-color--blue {
  --color-ghost-hover-bg: var(--color-bg);
  color: var(--color-grey-text);
  background-color: var(--color-grey-bg);
}

/* Outline variant: white surface with a tinted border, text and icon in the color */
.callout-variant--outline {
  background-color: var(--color-white);

  &.callout-color--accent {
    border-color: var(--color-accent-bg);
    color: var(--color-accent-text);

    .callout-icon {
      color: var(--color-accent-graphic);
    }
  }

  &.callout-color--red {
    border-color: var(--color-red-bg);
    color: var(--color-red-text);

    .callout-icon {
      color: var(--color-red-graphic);
    }
  }

  &.callout-color--orange {
    border-color: var(--color-orange-bg);
    color: var(--color-orange-text);

    .callout-icon {
      color: var(--color-orange-graphic);
    }
  }

  &.callout-color--green {
    border-color: var(--color-green-bg);
    color: var(--color-green-text);

    .callout-icon {
      color: var(--color-green-graphic);
    }
  }

  &.callout-color--blue {
    --color-ghost-hover-bg: var(--color-grey-bg);
    border-color: var(--color-grey-light);
    color: var(--color-grey-text);

    .callout-icon {
      color: var(--color-grey-text);
    }
  }
}
</style>

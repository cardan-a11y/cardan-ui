<script setup lang="ts">
const {
  buttonVariant = 'menu',
  buttonSize = 'md',
  hTag = 'h2',
  id = useId(),
  label = undefined,
  labelLink = undefined,
  labelIcon = undefined,
  ariaLabel = undefined,
  ariaLabelledby = undefined,
  fontSize = undefined,
  iconSize = undefined,
} = defineProps<{
  list: MenuItem[];
  label?: string;
  labelLink?: string;
  labelIcon?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  buttonVariant?: ButtonVariant;
  buttonSize?: ButtonSize;
  fontSize?: FontSize;
  iconSize?: FontSize;
  hTag?: string;
  inline?: boolean;
  id?: string;
}>();

// A list in a list is part of the menu's landmark, not one of its own
const nested = inject(menuListNestedKey, false);
provide(menuListNestedKey, true);

function handleClick(item: MenuItem) {
  emit('click', item);

  if (item?.onClick) {
    item.onClick();
  }
}

const emit = defineEmits<{
  click: [item: MenuItem];
}>();
</script>

<template>
  <component
    :is="nested ? 'div' : 'nav'"
    :role="nested ? 'group' : undefined"
    :aria-labelledby="label ? id : ariaLabelledby"
    :aria-label="ariaLabelledby ? undefined : ariaLabel"
    class="menu-list-nav"
  >
    <component :is="hTag" v-if="label" :id="id" class="menu-list-label">
      <NuxtLink v-if="labelLink" :to="labelLink" class="label-link">
        <Icon v-if="labelIcon" :name="labelIcon" />

        <span>{{ label }}</span>
      </NuxtLink>

      <template v-else>{{ label }}</template>
    </component>

    <ul role="list" :class="['menu-list', inline && 'menu-list--inline']">
      <li
        v-for="item in list"
        :key="'menu-list-item-' + item.id"
        class="menu-list-item"
      >
        <Popover
          v-if="item.items?.length && buttonVariant === 'topbar'"
          :list="item.items"
          :hide-label="false"
          :label="item.label"
          :icon="item.icon"
          :icon-pos="item.iconPos"
          :show-arrow-icon="item.showArrowIcon"
          :size="buttonSize"
          :font-size="fontSize"
          button-variant="ghost"
          placement="bottom"
          span="right"
        >
          <template #menu-list-item="{ item: subItem }">
            <MenuListTooltip :item="subItem">
              {{ subItem.tooltip }}
            </MenuListTooltip>
          </template>
        </Popover>

        <template v-else-if="item.items?.length">
          <hr />

          <!-- A group named by its item, which has no button of its own -->
          <MenuList
            :list="item.items"
            :aria-label="item.label || item.title"
            :button-size="buttonSize"
            :font-size="fontSize"
            :icon-size="iconSize"
            button-variant="sidebar"
            @click="emit('click', $event)"
          >
            <template #menu-list-item="{ item: subItem }">
              <MenuListTooltip :item="subItem">
                {{ subItem.tooltip }}
              </MenuListTooltip>
            </template>
          </MenuList>
        </template>

        <Button
          v-else
          :label="item.label || item.title"
          :to="item.to || item.href || item.path"
          :icon="item.icon"
          :icon-pos="item.iconPos"
          :disabled="item.disabled"
          :loading="item.loading"
          :target="item.target"
          :external="item.external"
          :download="item.download"
          :hide-external-icon="item.hideExternalIcon"
          :size="buttonSize"
          :font-size="fontSize"
          :icon-size="iconSize"
          :variant="item.variant || buttonVariant"
          @click="handleClick(item)"
        />

        <slot name="menu-list-item" v-bind="{ item }" />

        <hr v-if="item.divider" />
      </li>
    </ul>
  </component>
</template>

<style>
.menu-list-label {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
  color: var(--color-grey-text);
  margin-block-start: 1.5rem;
  margin-block-end: 1rem;

  .label-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    font-size: var(--font-size-lg);
    text-underline-offset: 0.25em;

    .iconify {
      color: var(--color-grey-graphic);
    }

    &:hover {
      text-decoration: underline;
      color: var(--color-accent-text);

      .iconify {
        color: var(--color-grey-text);
      }
    }

    &.router-link-active {
      text-decoration: underline;

      .iconify {
        color: var(--color-grey-text);
      }
    }
  }
}

.menu-list-item {
  > .button {
    --button-radius: 0;
    outline-offset: -2px;
  }

  &:last-of-type {
    .button-variant--menu {
      border-bottom-left-radius: var(--radius-sm);
      border-bottom-right-radius: var(--radius-sm);
    }
  }
}

.menu-list-nav:has(.button-variant--sidebar) {
  .menu-list-item {
    margin-block-end: 0.5rem;

    hr {
      margin-block: 0.75rem;
    }
  }
}

/* --menu-list-gap: the space between the items of an inline list */
.menu-list--inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--menu-list-gap, 1.5rem);

  > .menu-list-item {
    display: inline-block;
  }
  .popover-content-wrapper {
    border-start-end-radius: 0;
    border-start-start-radius: 0;
  }
}

.menu-list {
  min-width: 200px;

  &:has(.button-variant--sidebar) {
    .menu-list-item:has(.menu-list-tooltip) {
      display: flex;
      flex-wrap: wrap;
      flex-direction: row-reverse;
      justify-content: start;
      align-items: center;

      .tooltip-trigger-button {
        margin-inline-start: 2rem;
      }

      > .button {
        padding-inline-start: 0.5rem;

        > .iconify {
          display: none;
        }
      }
    }
  }

  &:has(.button-variant--menu) {
    .menu-list-item:has(.menu-list-tooltip) {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;

      .tooltip-trigger-button {
        margin-inline-end: 1.25em;
      }

      > .button {
        flex-direction: row;

        > .iconify {
          display: none;
        }
      }

      hr {
        grid-column: span 2;
      }
    }
  }
}
</style>

<script setup lang="ts">
const {
  size = 'sm',
  fontSize = 'sm',
  skeletonRows = 10,
  skeletonCols = 3,
  ariaLabel = undefined,
} = defineProps<{
  size?: TableSize;
  fontSize?: FontSize;
  ariaLabel?: string;
  loading?: boolean;
  skeleton?: boolean;
  skeletonRows?: number;
  skeletonCols?: number;
}>();

const computedStyle = computed(() => ({
  '--table-font-size': `var(--font-size-${fontSize})`,
}));
</script>

<template>
  <div
    :class="[
      'table-wrapper',
      `table-size--${size}`,
      loading && 'table--loading',
      skeleton && 'table--skeleton',
    ]"
    :style="computedStyle"
  >
    <table :aria-busy="loading || undefined">
      <caption v-if="ariaLabel" class="visuallyhidden" v-text="ariaLabel" />

      <tbody v-if="skeleton">
        <tr
          v-for="(_, rowIndex) in new Array(skeletonRows)"
          :key="rowIndex"
          class="table-loader-row"
        >
          <td v-for="(__, colIndex) in new Array(skeletonCols)" :key="colIndex">
            <Skeleton />
          </td>
        </tr>
      </tbody>

      <slot />
    </table>
  </div>
</template>

<style>
:where(table) {
  --table-border-color: var(--color-grey-light);

  border-collapse: collapse;
  text-align: left;
  font-variant-numeric: tabular-nums;

  thead th {
    font-weight: var(--font-weight-medium);
    color: var(--color-grey-text);
    vertical-align: bottom;
  }

  tbody th {
    font-weight: var(--font-weight-medium);
  }

  th,
  td {
    padding: 0.5rem;
  }

  thead tr {
    border-color: var(--table-border-color);
    border-style: solid;
    border-width: 0 0 0 0;
  }

  tbody tr {
    border-color: var(--table-border-color);
    border-style: solid;
    border-width: 1px 0;
  }
}

:where(.table-wrapper) {
  padding-block-end: 1rem;
  overflow-x: auto;
  -ms-overflow-style: -ms-autohiding-scrollbar;
  font-size: var(--table-font-size);

  table {
    width: 100%;
  }
}

.table--skeleton tbody tr:not(.table-loader-row) {
  display: none;
}

.table--loading {
  tbody {
    pointer-events: none;

    td,
    th {
      opacity: 35%;
    }

    tr {
      --color-1: var(--color-card-bg);
      --color-2: var(--color-bg);
      animation: shimmer var(--duration-xl) linear infinite;
      animation-duration: var(--duration-xxl);
      background: linear-gradient(
        -45deg,
        var(--color-1) 30%,
        var(--color-2) 45%,
        var(--color-2) 55%,
        var(--color-1) 70%
      );
      background-size: 400% 400%;
    }
  }
}

:where(.table-size--xxs) {
  tbody,
  tfoot {
    tr {
      height: 2.5rem;
    }
  }
  th,
  td {
    padding-block: 0.4rem;
    padding-inline: 0.35rem;
  }
}

:where(.table-size--xs) {
  tbody,
  tfoot {
    tr {
      height: 2.75rem;
    }
  }
  th,
  td {
    padding-block: 0.4rem;
    padding-inline: 0.35rem;
  }
}

:where(.table-size--sm) {
  tbody,
  tfoot {
    tr {
      height: 3rem;
    }
  }
  th,
  td {
    padding-block: 0.5rem;
    padding-inline: 0.5rem;
  }
}

:where(.table-size--md) {
  tbody,
  tfoot {
    tr {
      height: 3.25rem;
    }
  }
  th,
  td {
    padding-block: 0.6rem;
    padding-inline: 0.5rem;
  }
}

:where(.table-size--lg) {
  tbody,
  tfoot {
    tr {
      height: 3.5rem;
    }
  }
  th,
  td {
    padding-block: 0.6rem;
    padding-inline: 0.5rem;
  }
}

@keyframes shimmer {
  0% {
    background-position: 100% 100%;
  }
  100% {
    background-position: 0% 0%;
  }
}
</style>

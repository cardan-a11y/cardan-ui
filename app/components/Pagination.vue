<script setup lang="ts">
const { pageSizes = [10, 20, 50, 100] } = defineProps<{
  lastPage: number;
  total: number;
  pageSizes?: number[];
  loading?: boolean;
  hidePageSizes?: boolean;
}>();

const { t } = useI18n();

const page = defineModel<number>('page', { default: 1 });
const perPage = defineModel<number>('perPage', { default: 10 });

const computedPageSizes = computed(() => {
  const sizes: { value: number; label: string }[] = [];
  pageSizes.map((item) => {
    sizes.push({
      value: item,
      label: `${item} ${t('pagination.per-page')}`,
    });
  });
  return sizes;
});

const navRef = useTemplateRef<HTMLElement>('nav');
const pageTextRef = useTemplateRef<HTMLElement>('pageText');

async function goToPage(pageNumber: number) {
  if (page.value === pageNumber) return;
  if (page.value && page.value < 1) return;

  page.value = pageNumber;
  await nextTick();
  moveFocusOn();
}

/**
 * On the first or last page the button that got there is disabled, and a
 * disabled button drops focus: it goes to the button for the other way,
 * or to the page count on a single page
 */
function moveFocusOn() {
  const buttons = Array.from(
    navRef.value?.querySelectorAll<HTMLButtonElement>('button') ?? [],
  );
  const active = document.activeElement as HTMLButtonElement | null;
  const index = active ? buttons.indexOf(active) : -1;
  if (index === -1 || !active?.disabled) return;

  // first, previous | next, last
  const other = buttons[index < 2 ? 2 : 1];
  if (other && !other.disabled) other.focus();
  else pageTextRef.value?.focus();
}
</script>

<template>
  <div class="pagination-wrapper">
    <nav
      ref="nav"
      class="pagination-nav"
      :aria-label="$t('pagination.heading')"
    >
      <Button
        icon="material-symbols:keyboard-double-arrow-left-rounded"
        :label="$t('pagination.first-page')"
        hide-label
        size="sm"
        variant="ghost"
        :disabled="loading || page === 1"
        @click="goToPage(1)"
      />

      <Button
        icon="material-symbols:chevron-left-rounded"
        :label="$t('pagination.prev-page')"
        hide-label
        size="sm"
        class="prev-page-button"
        :disabled="loading || page <= 1"
        @click="goToPage(page - 1)"
      />

      <div ref="pageText" class="current-page-wrapper" tabindex="-1">
        {{ $t('pagination.page-x-of-total', { page, total: lastPage }) }}
      </div>

      <Button
        icon="material-symbols:chevron-right-rounded"
        :label="$t('pagination.next-page')"
        hide-label
        size="sm"
        class="next-page-button"
        :disabled="loading || page >= lastPage || lastPage <= 1"
        @click="goToPage(page + 1)"
      />

      <Button
        icon="material-symbols:keyboard-double-arrow-right-rounded"
        :label="$t('pagination.last-page')"
        hide-label
        size="sm"
        variant="ghost"
        :disabled="loading || page >= lastPage || lastPage <= 1"
        @click="goToPage(lastPage)"
      />
    </nav>

    <slot name="default" />

    <div v-if="!hidePageSizes" class="pagination-page-size">
      <Select
        v-model.number="perPage"
        :options="computedPageSizes"
        :label="$t('pagination.per-page')"
        :disabled="loading"
        hide-label
        size="sm"
      />
    </div>
  </div>
</template>

<style>
.pagination-wrapper {
  width: 100%;
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
  margin-block-start: 1rem;
  justify-content: center;

  @media (min-width: 640px) {
    justify-content: space-between;
  }

  .pagination-nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
  }

  .current-page-wrapper {
    font-size: var(--font-size-sm);
    color: var(--color-grey-text);
    margin-inline: 1rem;
    user-select: none;
    -webkit-user-select: none;
  }

  .pagination-page-size {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .select {
      font-size: var(--font-size-sm);
    }
  }
}
</style>

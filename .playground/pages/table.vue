<script setup lang="ts">
import { wcagPrinciples } from '../data/wcag';

useHead({ title: 'Table, Pagination and Filter' });

const keyword = ref('');
const wcagLevel = ref<string[]>(['A', 'AA']);
const page = ref(1);
const pageSize = ref(10);
const tableSize = ref<TableSize>('md');
const tableFontSize = ref<FontSize>('sm');
const loading = ref(false);
const skeleton = ref(false);

const guidelines = computed(() =>
  wcagPrinciples.map((principle) => principle.guidelines).flat(),
);

const criteria = computed(() =>
  guidelines.value?.map((guideline) => guideline.criteria).flat(),
);

const filteredCriteria = computed(() =>
  criteria.value?.filter(
    (criterion) =>
      (wcagLevel.value?.length
        ? wcagLevel.value?.includes(criterion.level ?? '')
        : true) &&
      (criterion.name?.toLowerCase().includes(keyword.value.toLowerCase()) ||
        criterion.description
          ?.toLowerCase()
          .includes(keyword.value.toLowerCase()) ||
        criterion.number?.toLowerCase().includes(keyword.value.toLowerCase())),
  ),
);

const results = ref(filteredCriteria.value.slice(0, 10));

// A row's actions, as the Auditor's tables have them
const rowActions: MenuItem[] = [
  { id: 'edit', label: 'Edit', icon: 'material-symbols:edit-outline-rounded' },
  {
    id: 'delete',
    label: 'Delete',
    icon: 'material-symbols:delete-outline-rounded',
  },
];

const wcagLevels = [
  {
    value: 'A',
    label: 'Level A',
  },
  {
    value: 'AA',
    label: 'Level AA',
  },
  {
    value: 'AAA',
    label: 'Level AAA',
  },
];

const tableFontSizes: { value: FontSize; label: string }[] = [
  {
    value: 'lg',
    label: 'lg',
  },
  {
    value: 'md',
    label: 'md',
  },
  {
    value: 'sm',
    label: 'sm',
  },
  {
    value: 'xs',
    label: 'xs',
  },
  {
    value: 'xxs',
    label: 'xxs',
  },
];

const tableSizes: { value: TableSize; label: string }[] = [
  {
    value: 'md',
    label: 'md',
  },
  {
    value: 'sm',
    label: 'sm',
  },
  {
    value: 'xs',
    label: 'xs',
  },
];

function handlePageChange(pageNumber: number) {
  const start = (pageNumber - 1) * pageSize.value;
  const end = start + pageSize.value;
  results.value = filteredCriteria.value.slice(start, end);
}

function handleFilter() {
  page.value = 1;
  handlePageChange(page.value);
}
</script>

<template>
  <div class="demo-page">
    <div class="section-topbar">
      <h1>Table</h1>

      <Popover icon="material-symbols:settings-rounded" :max-width="480">
        <div class="popover-settings-content">
          <h2>Props</h2>

          <div class="props-wrapper">
            <Select
              v-model="tableSize"
              :options="tableSizes"
              label="size"
              size="sm"
            />
            <Select
              v-model="tableFontSize"
              :options="tableFontSizes"
              label="fontSize"
              size="sm"
            />
            <Switch v-model="loading" label="loading" />
            <Switch v-model="skeleton" label="skeleton" />

            <code
              >{{`<Table
                size="${tableSize}"
                font-size="${tableFontSize}"
                :loading="${loading}"
                :skeleton="${skeleton}"
              />`}}</code
            >
          </div>
        </div>
      </Popover>
    </div>

    <blockquote>
      <p class="fs-md">
        A table is a static tabular structure containing one or more rows that
        each contain one or more cells. It is not an interactive widget. Thus,
        its cells are not focusable or selectable. The
        <Button
          to="https://www.w3.org/WAI/ARIA/apg/patterns/grid"
          label="Grid Pattern"
          variant="link"
          target="_blank"
        />
        is used to make an interactive widget that has a tabular structure.
      </p>

      <p class="fs-sm mbe-2 c-grey-text">
        Source:
        <Button
          to="https://www.w3.org/WAI/ARIA/apg/patterns/table"
          label="ARIA Design Patterns"
          variant="link"
          target="_blank"
        />
      </p>
    </blockquote>

    <Card>
      <div class="topbar-wrapper">
        <MultiSelect
          v-model="wcagLevel"
          :options="wcagLevels"
          label="WCAG level filter"
          :hide-label="true"
          mode="tags"
          placeholder="All levels"
          show-option-icons
          @update:model-value="handleFilter()"
        />

        <Search
          v-model="keyword"
          :hide-label="true"
          label="Search"
          placeholder="search criteria"
          @submit="handleFilter()"
          @reset="handleFilter()"
        />
      </div>

      <Table
        :size="tableSize"
        :font-size="tableFontSize"
        :loading="loading"
        :skeleton="skeleton"
      >
        <thead>
          <tr>
            <th scope="col" colspan="2">WCAG success criterion</th>
            <th scope="col">Description</th>
            <th scope="col">Level</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="sc in results" :key="sc.id">
            <th scope="row">{{ sc.number }}</th>
            <td class="sc-name">{{ sc.name }}</td>
            <td>{{ sc.description }}</td>
            <td>
              <Chip :label="sc.level" size="sm" color="accent" />
            </td>
            <td>
              <Popover :label="`Actions for ${sc.number}`" :list="rowActions" />
            </td>
          </tr>
        </tbody>
      </Table>

      <Pagination
        v-model:page="page"
        v-model:per-page="pageSize"
        :total="filteredCriteria.length"
        :page-sizes="[5, 10, 20, 50, 100]"
        :last-page="Math.ceil(filteredCriteria.length / pageSize)"
        @update:page="handlePageChange"
        @update:per-page="handleFilter()"
      />
    </Card>
  </div>
</template>

<style>
.demo-page {
  .topbar-wrapper {
    margin-block: 0.5rem 1rem;
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 0.5rem;

    .search-form {
      flex-grow: 9;
    }
  }
}
</style>

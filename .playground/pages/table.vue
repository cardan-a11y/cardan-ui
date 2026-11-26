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

const rules = [
  {
    title: 'A name for the table',
    text: 'aria-label becomes a caption that only screen readers get.',
  },
  {
    title: 'loading',
    text: 'Sets aria-busy on the table and dims its rows.',
  },
  {
    title: 'skeleton',
    text: 'Shows placeholder rows in place of the rows: skeleton-rows by skeleton-cols, 10 by 3 by default.',
  },
  {
    title: 'Wider than the page',
    text: 'The table scrolls sideways inside its wrapper.',
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
  <div class="demo-page table-page">
    <p class="demo-eyebrow">Data</p>
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
    <p class="demo-lead">
      A
      <Button
        to="https://www.w3.org/WAI/ARIA/apg/patterns/table"
        label="table"
        variant="link"
        target="_blank"
      />
      is static rows and cells, not a widget: its cells take no focus. An
      interactive one follows the APG
      <Button
        to="https://www.w3.org/WAI/ARIA/apg/patterns/grid"
        label="Grid Pattern"
        variant="link"
        target="_blank"
      />.
    </p>

    <ul role="list" class="demo-grid">
      <li v-for="rule in rules" :key="rule.title" class="demo-tile">
        <strong>{{ rule.title }}</strong>
        <span>{{ rule.text }}</span>
      </li>
    </ul>

    <section class="demo-section" aria-labelledby="table-criteria">
      <h2 id="table-criteria">Filter, table and pagination</h2>
      <p class="demo-hint">
        The page filters and slices the rows itself. Pagination holds
        <code>v-model:page</code> and <code>v-model:per-page</code> and takes
        <code>total</code>, <code>last-page</code> and
        <code>page-sizes</code>. The filter is a ComboBox with
        <code>multiple</code>.
      </p>

      <Card>
        <div class="topbar-wrapper">
          <ComboBox
            v-model="wcagLevel"
            multiple
            :options="wcagLevels"
            label="WCAG level filter"
            hide-label
            placeholder="All levels"
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
    </section>
  </div>
</template>

<style>
.demo-page.table-page {
  .card {
    margin-block-end: 0;
  }

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

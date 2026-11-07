<template>
  <Table class="pricing-table-wrapper" size="md" font-size="sm">
    <slot />
  </Table>
</template>

<style>
.pricing-table-wrapper {
  table {
    --table-border-color: var(--color-grey-bg);
  }

  th[scope='rowgroup'] {
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-md);
  }

  tbody + tbody th[scope='rowgroup'] {
    padding-block-start: 2.5rem;
  }

  th[scope='row'] {
    font-weight: var(--font-weight-regular);
    font-size: var(--font-size-sm);
    width: 260px;
  }

  tbody td {
    text-align: center;
  }

  .title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    margin-block-end: 0.25rem;
  }

  .description {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-regular);
  }

  .button {
    margin-block-start: 1.5rem;
    margin-block-end: 0.75rem;
    width: 100%;
    white-space: nowrap;
  }

  .iconify {
    width: 1.5rem;
    height: 1.5rem;

    &[class*='cancel-outline-rounded'] {
      color: var(--color-grey-graphic);
    }

    &[class*='check-circle-outline-rounded'] {
      color: var(--color-green-graphic);
    }
  }
}
</style>

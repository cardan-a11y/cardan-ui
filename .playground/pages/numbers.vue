<script setup lang="ts">
useHead({ title: 'Numbers & Prices' });

const { locale } = useI18n();
const {
  formatNumber: number,
  formatPercent: percent,
  formatCurrency: currency,
} = useNumber();

const value = ref(1234.5);

const examples: {
  call: string;
  format: (locale: string) => string;
}[] = [
  {
    call: 'formatNumber(1234567)',
    format: (l) => formatNumber(1234567, l),
  },
  {
    call: 'formatNumber(8.2, { decimals: 1 })',
    format: (l) => formatNumber(8.2, l, { decimals: 1 }),
  },
  {
    call: 'formatPercent(0.21)',
    format: (l) => formatPercent(0.21, l),
  },
  {
    call: 'formatPercent(0.215, { decimals: 1 })',
    format: (l) => formatPercent(0.215, l, { decimals: 1 }),
  },
  {
    call: 'formatCurrency(495)',
    format: (l) => formatCurrency(495, l),
  },
  {
    call: 'formatCurrency(1234.5)',
    format: (l) => formatCurrency(1234.5, l),
  },
  {
    call: 'formatCurrency(1999, { cents: true })',
    format: (l) => formatCurrency(1999, l, { cents: true }),
  },
  {
    call: 'formatCurrency(76.6, { decimals: 0 })',
    format: (l) => formatCurrency(76.6, l, { decimals: 0 }),
  },
  {
    call: "formatCurrency(1234.5, { currency: 'USD' })",
    format: (l) => formatCurrency(1234.5, l, { currency: 'USD' }),
  },
];
</script>

<template>
  <div class="demo-page numbers-page">
    <h1>Numbers &amp; Prices</h1>

    <div class="demo-description">
      <p class="mbe-1">
        Numbers, percentages and prices follow the language of the app, not the
        language of the browser. A Dutch page shows "1.234,5" and "€ 12,50" even
        in an English browser, and an English page shows "1,234.5" and "€12.50".
        Calling <code>toLocaleString()</code> without a locale, or building a
        percentage by hand, gets this wrong for some visitors, so every number a
        reader sees goes through one of the three functions on this page.
      </p>

      <p class="mbe-1">
        The pure functions <code>formatNumber(value, locale, options?)</code>,
        <code>formatPercent(fraction, locale, options?)</code> and
        <code>formatCurrency(amount, locale, options?)</code> live in
        <code>app/utils/number.ts</code> and take the locale as an argument, so
        they also work outside a component, in a test or on the server. The
        composable <code>useNumber()</code> returns the same three functions
        without the locale argument: they read the current i18n locale on every
        call, so a template or a computed that uses them updates when the
        language changes. In a component, use the composable.
      </p>

      <p class="mbe-1">
        The i18n locale is mapped to a formatting locale in one place:
        <code>en</code> formats as British English (<code>en-GB</code>) and
        <code>nl</code> as Dutch in the Netherlands (<code>nl-NL</code>). Any
        other locale is passed to <code>Intl.NumberFormat</code> as it is.
      </p>

      <ul class="mbe-1">
        <li>
          <code>formatNumber</code> groups thousands and shows up to three
          decimals. <code>{ decimals: 1 }</code> always shows exactly one
          decimal, as a grade does; any other
          <code>Intl.NumberFormat</code> option for the digits, such as
          <code>maximumFractionDigits</code>, is passed on.
        </li>
        <li>
          <code>formatPercent</code> takes a fraction, as
          <code>Intl.NumberFormat</code> does: <code>0.21</code> is "21%". A
          value that is already a whole percentage is divided by 100 at the
          call, and a value per mille by 1000. It shows whole percentages unless
          <code>decimals</code> says otherwise.
        </li>
        <li>
          <code>formatCurrency</code> formats euros unless
          <code>currency</code> names another ISO 4217 code. A whole amount has
          no decimals and any other amount has two;
          <code>decimals: 0</code> always rounds to a whole amount, as the
          pricing pages do. With <code>cents: true</code> the amount is in
          cents, as the Academy's API returns prices. In Dutch a no-break space
          follows the euro sign, so "€ 495" never breaks over two lines; a test
          comparing a Dutch price writes that character as <code>\u00a0</code>.
        </li>
      </ul>
    </div>

    <Card class="mbe-2">
      <h2 class="mbe-1">Both languages</h2>

      <p class="mbe-1">
        Each row shows a call as a component writes it with
        <code>useNumber()</code>. The columns show what it returns in English
        and in Dutch, whichever language the playground is in: the page calls
        the pure function with each locale.
      </p>

      <Table aria-label="Formatted numbers in English and Dutch">
        <thead>
          <tr>
            <th scope="col">Call</th>
            <th scope="col">English (<code>en</code>)</th>
            <th scope="col">Dutch (<code>nl</code>)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="example in examples" :key="example.call">
            <th scope="row">
              <code>{{ example.call }}</code>
            </th>
            <td lang="en">{{ example.format('en') }}</td>
            <td lang="nl">{{ example.format('nl') }}</td>
          </tr>
        </tbody>
      </Table>
    </Card>

    <Card>
      <h2 class="mbe-1">In the app's language</h2>

      <p class="mbe-1">
        These follow the language chosen in the user menu, now
        <code>{{ locale }}</code
        >. Change the language or the number to see them update.
      </p>

      <Input
        v-model.number="value"
        type="number"
        step="any"
        label="Number"
        class="mbe-1"
      />

      <dl class="numbers-live">
        <dt><code>formatNumber(value)</code></dt>
        <dd>{{ number(value || 0) }}</dd>
        <dt><code>formatPercent(value / 100, { decimals: 1 })</code></dt>
        <dd>{{ percent((value || 0) / 100, { decimals: 1 }) }}</dd>
        <dt><code>formatCurrency(value)</code></dt>
        <dd>{{ currency(value || 0) }}</dd>
        <dt><code>formatCurrency(value, { cents: true })</code></dt>
        <dd>{{ currency(value || 0, { cents: true }) }}</dd>
      </dl>
    </Card>
  </div>
</template>

<style>
.numbers-page {
  th code,
  dt code {
    overflow-wrap: anywhere;
  }

  .numbers-live {
    display: grid;
    gap: 0.25rem 1.5rem;

    @media (min-width: 640px) {
      grid-template-columns: auto 1fr;
    }

    dd {
      margin-inline-start: 0;
      font-variant-numeric: tabular-nums;
    }
  }
}
</style>

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

const rules = [
  {
    title: 'In a component',
    text: 'useNumber() returns the three functions without the locale argument. Each call reads the i18n locale, so a template or computed follows a change of language.',
  },
  {
    title: 'Outside a component',
    text: 'The pure functions in app/utils/number.ts take the locale as an argument, so they work in a test or on the server.',
  },
  {
    title: 'Two locales',
    text: 'en formats as British English (en-GB), nl as Dutch in the Netherlands (nl-NL). Any other locale goes to Intl.NumberFormat as it is.',
  },
  {
    title: 'Never by hand',
    text: 'toLocaleString() without a locale, or a percentage built by hand, is wrong for some visitors.',
  },
];
</script>

<template>
  <div class="demo-page numbers-page">
    <p class="demo-eyebrow">Data</p>
    <h1>Numbers &amp; Prices</h1>
    <p class="demo-lead">
      Numbers, percentages and prices follow the language of the app, not of
      the browser: a Dutch page shows "1.234,5" and "€ 12,50", an English one
      "1,234.5" and "€12.50". Every number a reader sees goes through one of
      three functions.
    </p>

    <ul role="list" class="demo-grid numbers-rules">
      <li v-for="rule in rules" :key="rule.title" class="demo-tile">
        <strong>{{ rule.title }}</strong>
        <span>{{ rule.text }}</span>
      </li>
    </ul>

    <section class="demo-section" aria-labelledby="numbers-functions">
      <h2 id="numbers-functions">The three functions</h2>
      <p class="demo-hint">
        With <code>useNumber()</code> the locale argument falls away:
        <code>formatNumber(value, options?)</code>.
      </p>

      <Card>
        <h3><code>formatNumber(value, locale, options?)</code></h3>
        <ul>
          <li>Groups thousands and shows up to three decimals.</li>
          <li>
            <code>{ decimals: 1 }</code> always shows exactly one decimal, as a
            grade does.
          </li>
          <li>
            Any other <code>Intl.NumberFormat</code> option for the digits,
            such as <code>maximumFractionDigits</code>, is passed on.
          </li>
        </ul>

        <h3><code>formatPercent(fraction, locale, options?)</code></h3>
        <ul>
          <li>
            Takes a fraction, as <code>Intl.NumberFormat</code> does:
            <code>0.21</code> is "21%".
          </li>
          <li>
            Divide a whole percentage by 100 and a value per mille by 1000 at
            the call.
          </li>
          <li>Whole percentages, unless <code>decimals</code> says otherwise.</li>
        </ul>

        <h3><code>formatCurrency(amount, locale, options?)</code></h3>
        <ul>
          <li>
            Euros, unless <code>currency</code> names another ISO 4217 code.
          </li>
          <li>
            A whole amount has no decimals, any other amount has two.
            <code>decimals: 0</code> always rounds to a whole amount, as
            PricingCard does.
          </li>
          <li>
            With <code>cents: true</code> the amount is in cents, as the
            Academy's API returns prices.
          </li>
          <li>
            In Dutch a no-break space follows the euro sign, so "€ 495" never
            breaks over two lines. A test that compares a Dutch price writes
            that character as <code>\u00a0</code>.
          </li>
        </ul>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="numbers-both">
      <h2 id="numbers-both">Both languages</h2>
      <p class="demo-hint">
        Each row is a call as a component writes it with
        <code>useNumber()</code>, and what it returns in English and in Dutch,
        whichever language the playground is in.
      </p>

      <Card>
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
    </section>

    <section class="demo-section" aria-labelledby="numbers-live">
      <h2 id="numbers-live">In the app's language</h2>
      <p class="demo-hint">
        These follow the language chosen in the user menu, now
        <code>{{ locale }}</code
        >. Change the language or the number to see them update.
      </p>

      <Card>
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
    </section>
  </div>
</template>

<style>
.demo-page.numbers-page {
  .numbers-rules {
    --demo-column: 16rem;
  }

  .card {
    margin-block-end: 0;

    h3 {
      margin-block: 1.5rem 0.5rem;
      font-size: var(--font-size-md);

      &:first-child {
        margin-block-start: 0;
      }
    }

    ul {
      margin-block: 0;
    }
  }

  h3 code,
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

<script setup lang="ts">
useHead({ title: 'Typography' });

const weights = [
  { name: 'Regular', token: '--font-weight-regular', value: 400 },
  { name: 'Medium', token: '--font-weight-medium', value: 500 },
  { name: 'SemiBold', token: '--font-weight-semibold', value: 600 },
  { name: 'Bold', token: '--font-weight-bold', value: 700 },
  { name: 'ExtraBold', token: '--font-weight-extrabold', value: 800 },
];

const scale = [
  { size: 'xxxxl', px: 64, use: 'Display', sample: 'Impact', weight: 'bold' },
  { size: 'xxxl', px: 48, use: 'Heading 1', sample: 'Our method', weight: 'bold' },
  {
    size: 'xxl',
    px: 32,
    use: 'Heading 2',
    sample: 'Accessibility as a service',
    weight: 'bold',
  },
  {
    size: 'xl',
    px: 24,
    use: 'Heading 3',
    sample: 'Continuous WCAG monitoring',
    weight: 'bold',
  },
  {
    size: 'lg',
    px: 18,
    use: 'Intro',
    sample: 'From first awareness to full implementation.',
  },
  {
    size: 'md',
    px: 16,
    use: 'Body text',
    sample: 'One in four people runs into a digital barrier every day.',
  },
  { size: 'sm', px: 14, use: 'Label, hint', sample: 'Plan a free intake' },
  { size: 'xs', px: 12, use: 'Chip, caption', sample: 'Sample data' },
  {
    size: 'xxs',
    px: 10,
    use: 'Badge only',
    sample: 'NEW',
    weight: 'medium',
  },
];

const lineHeights = [
  { token: '--line-height', value: '1.55', use: 'Running text.' },
  { token: '--line-height-heading', value: '1.25', use: 'Headings.' },
  {
    token: '--line-height-ui',
    value: '1.25',
    use: 'Buttons, inputs, labels.',
  },
];

const rules = [
  {
    title: 'One typeface',
    text: 'Hanken Grotesk for everything, Arial as fallback. Inputs use the system font.',
  },
  {
    title: '16px and up',
    text: 'Running text is md or larger. sm and below is for labels, chips and captions.',
  },
  {
    title: 'Tokens, not pixels',
    text: 'Size with --font-size-*, or the font-size prop of a component: font-size="lg".',
  },
  {
    title: 'Headings by level',
    text: 'Pick h1 to h6 for the outline, never for the size. h-tag sets the level on a component.',
  },
];

const { formatNumber: number } = useNumber();
const grade = computed(() => number(8.2, { decimals: 1 }));

const lines = ref(1);
const text = ref(
  'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Sequi est, amet quae placeat odit officia inventore rerum ad pariatur a minima quos ut deleniti aperiam qui eligendi id dolores distinctio. Lorem, ipsum dolor sit amet consectetur adipisicing elit. Ipsa consectetur corrupti ad blanditiis ratione tempora modi labore, esse facilis in eos distinctio aperiam repellendus ab earum qui commodi officiis eveniet.',
);
</script>

<template>
  <div class="demo-page typography-page">
    <p class="demo-eyebrow">Brand</p>
    <h1>Typography</h1>
    <p class="demo-lead">
      Hanken Grotesk for everything: open, easy to read and free. Clother is
      only for the wordmark, and is a shape in the logo already.
    </p>

    <div class="typography-specimen">
      <span class="typography-aa" aria-hidden="true">Aa</span>

      <div>
        <p class="typography-alphabet">
          ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 € %
          &amp; ?!
        </p>

        <ul role="list" class="typography-weights">
          <li
            v-for="weight in weights"
            :key="weight.token"
            :style="{ '--weight': `var(${weight.token})` }"
          >
            <span>{{ weight.name }} {{ weight.value }}</span>
            <code>{{ weight.token }}</code>
          </li>
        </ul>

        <p class="typography-grade">
          <span>
            Exam result
            <Chip :label="grade" variant="solid" color="green" radius="full" />
          </span>
          ExtraBold has one use: a figure in a chip, such as an exam grade.
        </p>
      </div>
    </div>

    <ul role="list" class="demo-grid typography-rules">
      <li v-for="rule in rules" :key="rule.title" class="demo-tile">
        <strong>{{ rule.title }}</strong>
        <span>{{ rule.text }}</span>
      </li>
    </ul>

    <section class="demo-section" aria-labelledby="typography-scale">
      <h2 id="typography-scale">Scale</h2>
      <p class="demo-hint">
        Nine sizes. <code>h1</code> grows from 32 to 48px with the window,
        <code>h2</code> is <code>xxl</code> and <code>h3</code> is
        <code>xl</code> by default.
      </p>

      <ul role="list" class="typography-scale">
        <li v-for="step in scale" :key="step.size">
          <div class="typography-scale-meta">
            <code>--font-size-{{ step.size }}</code>
            <span>{{ step.px }}px · {{ step.use }}</span>
          </div>

          <p
            :style="{
              '--sample-size': `var(--font-size-${step.size})`,
              '--sample-weight': `var(--font-weight-${step.weight ?? 'regular'})`,
            }"
          >
            {{ step.sample }}
          </p>
        </li>
      </ul>
    </section>

    <section class="demo-section" aria-labelledby="typography-line-height">
      <h2 id="typography-line-height">Line height</h2>
      <p class="demo-hint">
        Set by the element already: use a token only where a component leaves
        it.
      </p>

      <ul role="list" class="demo-grid">
        <li v-for="item in lineHeights" :key="item.token" class="demo-tile">
          <code>{{ item.token }}</code>
          <strong>{{ item.value }}</strong>
          <span>{{ item.use }}</span>
        </li>
      </ul>
    </section>

    <section class="demo-section" aria-labelledby="typography-elements">
      <h2 id="typography-elements">Text elements</h2>
      <p class="demo-hint">
        Styled by the tokens file, without a class. A list with
        <code>role="list"</code> loses its markers and indent.
      </p>

      <Card class="typography-elements">
        <div>
          <h3>Unordered list</h3>
          <ul>
            <li v-for="n in 4" :key="n">This is a list item</li>
          </ul>
        </div>

        <div>
          <h3>Numbered list</h3>
          <ol>
            <li v-for="n in 4" :key="n">This is a list item</li>
          </ol>
        </div>

        <div>
          <h3>Definition list</h3>
          <dl class="definition-list">
            <template v-for="n in 3" :key="n">
              <dt>Definition term</dt>
              <dd>Definition description</dd>
            </template>
          </dl>
        </div>

        <div>
          <h3>Quote</h3>
          <blockquote>
            <p>Cardan showed us exactly where we stood.</p>
          </blockquote>
        </div>

        <div>
          <h3>Inline</h3>
          <p>
            A <a href="#typography-scale">link</a>, <strong>bold text</strong>,
            <code>code</code> and a key: <kbd>Esc</kbd>.
          </p>
        </div>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="typography-ellipsis">
      <div class="section-topbar">
        <h2 id="typography-ellipsis">Ellipsis</h2>

        <Popover icon="material-symbols:settings-rounded" :max-width="480">
          <div class="popover-settings-content">
            <h2>Props</h2>

            <div class="props-wrapper">
              <Input v-model.number="lines" type="number" label="lines" />
              <Textarea v-model="text" label="text" />
              <code>{{ `<Ellipsis :lines="${lines}"></Ellipsis>` }}</code>
            </div>
          </div>
        </Popover>
      </div>

      <p class="demo-hint">Cuts a text off after a number of lines.</p>

      <Card>
        <Ellipsis :lines="lines">
          {{ text }}
        </Ellipsis>
      </Card>
    </section>
  </div>
</template>

<style>
.typography-page {
  .typography-specimen {
    display: grid;
    gap: 1.5rem 3rem;
    align-items: center;
    margin-block-end: 1rem;
    padding: 1.75rem;
    border: 1px solid var(--card-border-color);
    border-radius: var(--radius-xl);
    background-color: var(--color-card-bg);

    @container (min-width: 720px) {
      grid-template-columns: auto 1fr;
      padding: 2.5rem;
    }

    p {
      margin-block: 0 1.5rem;
      max-inline-size: none;
      font-size: var(--font-size-lg);
      overflow-wrap: anywhere;
    }

    .typography-aa {
      font-size: 7.5rem;
      font-weight: var(--font-weight-bold);
      line-height: 1;
    }
  }

  .typography-specimen .typography-grade {
    display: grid;
    gap: 0.5rem;
    margin-block: 1.5rem 0;
    padding-block-start: 1.5rem;
    border-block-start: 1px solid var(--color-grey-light);
    color: var(--color-grey-text);
    font-size: var(--font-size-sm);

    > span {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--color-text);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
    }

    .chip {
      font-weight: var(--font-weight-extrabold);
    }
  }

  .typography-weights {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 2rem;

    li {
      display: grid;
      gap: 0.25rem;
    }

    span {
      font-size: var(--font-size-lg);
      font-weight: var(--weight);
    }

    code {
      justify-self: start;
      font-size: var(--font-size-xs);
    }
  }

  .typography-scale {
    li {
      display: grid;
      gap: 0.5rem 2rem;
      align-items: baseline;
      padding-block: 1.25rem;
      border-block-start: 1px solid var(--color-grey-light);

      @container (min-width: 720px) {
        grid-template-columns: 13rem 1fr;
      }
    }

    p {
      margin-block: 0;
      max-inline-size: none;
      font-size: var(--sample-size);
      font-weight: var(--sample-weight);
      line-height: var(--line-height-heading);
      overflow-wrap: anywhere;
    }

    .typography-scale-meta {
      display: grid;
      justify-items: start;
      gap: 0.25rem;
      color: var(--color-grey-text);
      font-size: var(--font-size-sm);

      code {
        font-size: var(--font-size-xs);
      }
    }
  }

  .demo-tile code {
    justify-self: start;
    font-size: var(--font-size-xs);
  }

  .typography-elements {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
    gap: 1.5rem 2rem;

    h3 {
      margin-block-end: 0.75rem;
      font-size: var(--font-size-md);
    }

    ul,
    ol,
    p {
      margin-block: 0;
    }
  }

  .section-topbar {
    margin-block-end: 0.5rem;
  }
}
</style>

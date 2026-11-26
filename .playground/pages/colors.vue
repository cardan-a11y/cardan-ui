<script setup lang="ts">
useHead({ title: 'Colors' });

type Swatch = {
  token: string;
  use: string;
  kind?: 'surface' | 'text' | 'graphic';
  on?: string;
};

const rules = [
  {
    title: 'Tokens only',
    text: 'Use --color-*. A --cardan-* primitive or a hex does not follow dark mode.',
  },
  {
    title: 'Pick by suffix',
    text: '-bg is a surface, -text is text (4.5:1), -graphic is an icon or border (3:1).',
  },
  {
    title: 'Pairs stay together',
    text: 'On a tint: --color-text, or the same color’s -text. Never another color’s.',
  },
  {
    title: 'Never color alone',
    text: 'A status always comes with an icon or a text.',
  },
];

const groups: {
  id: string;
  title: string;
  hint: string;
  swatches: Swatch[];
}[] = [
  {
    id: 'colors-surfaces',
    title: 'Surfaces',
    hint: 'Neighbouring blocks never share a tint: alternate with the page or a card.',
    swatches: [
      { token: '--color-bg', use: 'The page.' },
      { token: '--color-card-bg', use: 'Cards, dialogs and inputs.' },
      {
        token: '--color-white',
        use: 'Strongest surface: app header, chip. Black in dark mode.',
      },
      {
        token: '--color-grey-bg',
        use: 'Neutral block, hover, selected row.',
      },
      {
        token: '--color-accent-bg',
        use: 'Cardan itself: offer, action, highlight.',
      },
      {
        token: '--color-green-bg',
        use: 'Results: proof, success, confirmation.',
      },
    ],
  },
  {
    id: 'colors-text',
    title: 'Text',
    hint: 'Purple is for links and accents, never for a paragraph.',
    swatches: [
      { token: '--color-text', use: 'Body text and headings.', kind: 'text' },
      {
        token: '--color-grey-text',
        use: 'Secondary: captions, hints, metadata.',
        kind: 'text',
      },
      {
        token: '--color-accent-text',
        use: 'Links and accent text.',
        kind: 'text',
      },
      {
        token: '--color-accent-text-hover',
        use: 'A link under the pointer.',
        kind: 'text',
      },
    ],
  },
  {
    id: 'colors-action',
    title: 'Action',
    hint: 'One primary action per view; the rest is secondary or a link.',
    swatches: [
      { token: '--color-accent', use: 'Primary button.' },
      { token: '--color-accent-hover', use: 'Primary button, hovered.' },
      {
        token: '--color-on-accent',
        use: 'Text and icons on the accent.',
        kind: 'text',
        on: '--color-accent',
      },
      { token: '--color-secondary', use: 'Secondary button, neutral block.' },
      { token: '--color-secondary-hover', use: 'Secondary button, hovered.' },
    ],
  },
  {
    id: 'colors-graphics',
    title: 'Lines and graphics',
    hint: 'What a user must see to operate a control needs 3:1; a divider does not.',
    swatches: [
      {
        token: '--color-grey-light',
        use: 'Dividers and decorative borders. Below 3:1.',
        kind: 'graphic',
      },
      {
        token: '--card-border-color',
        use: 'The edge of a card.',
        kind: 'graphic',
        on: '--color-card-bg',
      },
      {
        token: '--color-track',
        use: 'Empty track of a meter or range.',
        kind: 'graphic',
      },
      {
        token: '--color-grey-graphic',
        use: 'Control borders, neutral icons. 3:1.',
        kind: 'graphic',
      },
      {
        token: '--color-accent-graphic',
        use: 'Checked controls, markers, accent icons.',
        kind: 'graphic',
      },
      {
        token: '--focus-color',
        use: 'The focus ring: --color-black, white in dark mode.',
        kind: 'graphic',
      },
    ],
  },
];

const familyRoles = [
  { suffix: '', use: 'Solid fill: toast, button.' },
  { suffix: '-bg', use: 'Tinted surface.' },
  { suffix: '-text', use: 'Text and icons, on the tint too.' },
  { suffix: '-graphic', use: 'Icons and borders on a neutral surface.' },
];

const families: {
  name: BaseColor;
  title: string;
  use: string;
  icon: string;
  brand: boolean;
}[] = [
  {
    name: 'accent',
    title: 'Accent',
    use: 'Brand and emphasis. Positive or neutral, never negative.',
    icon: 'material-symbols:star-outline-rounded',
    brand: true,
  },
  {
    name: 'green',
    title: 'Green',
    use: 'Positive only: passed, solved, improved.',
    icon: 'material-symbols:check-circle-outline-rounded',
    brand: true,
  },
  {
    name: 'orange',
    title: 'Orange',
    use: 'Ochre. Findings and what needs attention, in data and status only.',
    icon: 'material-symbols:warning-outline-rounded',
    brand: true,
  },
  {
    name: 'red',
    title: 'Red',
    use: 'Errors, in forms and system messages only. Never in a chart.',
    icon: 'material-symbols:cancel-outline-rounded',
    brand: true,
  },
  {
    name: 'blue',
    title: 'Blue',
    use: 'Information, or a category.',
    icon: 'material-symbols:info-outline-rounded',
    brand: false,
  },
  {
    name: 'yellow',
    title: 'Yellow',
    use: 'A category, nothing else.',
    icon: 'material-symbols:label-outline-rounded',
    brand: false,
  },
  {
    name: 'pink',
    title: 'Pink',
    use: 'A category, nothing else.',
    icon: 'material-symbols:label-outline-rounded',
    brand: false,
  },
];

const textPairs = [
  { fg: '--color-text', bg: '--color-bg' },
  { fg: '--color-text', bg: '--color-card-bg' },
  { fg: '--color-grey-text', bg: '--color-bg' },
  { fg: '--color-text', bg: '--color-grey-bg' },
  { fg: '--color-accent-text', bg: '--color-bg' },
  { fg: '--color-accent-text', bg: '--color-accent-bg' },
  { fg: '--color-on-accent', bg: '--color-accent' },
  { fg: '--color-green-text', bg: '--color-green-bg' },
  { fg: '--color-orange-text', bg: '--color-orange-bg' },
  { fg: '--color-red-text', bg: '--color-red-bg' },
  { fg: '--color-blue-text', bg: '--color-blue-bg' },
];

const graphicPairs = [
  { fg: '--color-grey-graphic', bg: '--color-bg' },
  { fg: '--color-accent-graphic', bg: '--color-bg' },
  { fg: '--color-green-graphic', bg: '--color-card-bg' },
  { fg: '--color-orange-graphic', bg: '--color-card-bg' },
  { fg: '--color-red-graphic', bg: '--color-card-bg' },
  { fg: '--focus-color', bg: '--color-bg' },
];

const shares = [
  {
    share: 60,
    token: '--color-bg',
    label: 'Page and cards',
  },
  { share: 22, token: '--color-text', label: 'Text' },
  { share: 12, token: '--color-accent', label: 'Action and accent' },
  { share: 6, token: '--color-green', label: 'Confirmation' },
];

const modes = ['light', 'dark'] as const;
</script>

<template>
  <div class="demo-page colors-page">
    <header class="colors-header">
      <p class="demo-eyebrow">Design tokens</p>
      <h1>Colors</h1>
      <p class="demo-lead">
        Warm neutral, with purple as the voice. Beige and white give rest, Body
        carries the text, purple the action, green confirms.
      </p>

      <ul role="list" class="demo-grid">
        <li v-for="rule in rules" :key="rule.title" class="demo-tile">
          <strong>{{ rule.title }}</strong>
          <span>{{ rule.text }}</span>
        </li>
      </ul>
    </header>

    <section
      v-for="group in groups"
      :key="group.id"
      class="demo-section"
      :aria-labelledby="group.id"
    >
      <h2 :id="group.id">{{ group.title }}</h2>
      <p class="demo-hint">{{ group.hint }}</p>

      <ul role="list" class="demo-grid colors-grid">
        <ColorSwatch
          v-for="swatch in group.swatches"
          :key="swatch.token"
          v-bind="swatch"
        />
      </ul>
    </section>

    <section class="demo-section" aria-labelledby="colors-families">
      <h2 id="colors-families">Status and categories</h2>
      <p class="demo-hint">
        A component takes the name: <code>color="green"</code> on Chip, Callout
        and Toast. <code>--color-purple-*</code> equals the accent, for purple
        as a category.
      </p>

      <dl class="colors-suffixes">
        <div v-for="role in familyRoles" :key="role.suffix">
          <dt>
            <code>--color-green{{ role.suffix }}</code>
          </dt>
          <dd>{{ role.use }}</dd>
        </div>
      </dl>

      <ul role="list" class="demo-grid colors-families">
        <li
          v-for="family in families"
          :key="family.name"
          class="colors-family"
          :style="{
            '--family-bg': `var(--color-${family.name}-bg)`,
            '--family-text': `var(--color-${family.name}-text)`,
          }"
        >
          <div class="colors-family-title">
            <Icon :name="family.icon" />
            <h3>{{ family.title }}</h3>
            <Chip
              v-if="!family.brand"
              label="Not a brand color"
              size="sm"
              variant="outline"
            />
          </div>

          <div class="colors-family-body">
            <p>{{ family.use }}</p>

            <ul role="list" class="colors-family-roles">
              <li v-for="role in familyRoles" :key="role.suffix">
                <span
                  class="colors-family-dot"
                  :style="{
                    '--dot-color': `var(--color-${family.name}${role.suffix})`,
                  }"
                />
                <code>--color-{{ family.name }}{{ role.suffix }}</code>
              </li>
            </ul>
          </div>
        </li>
      </ul>
    </section>

    <section class="demo-section" aria-labelledby="colors-pairs">
      <h2 id="colors-pairs">Measured pairs</h2>
      <p class="demo-hint">
        Measured in your browser, in the current mode. Text needs 4.5:1, a
        graphic 3:1. <code>pnpm test:browser</code> checks these and more, in
        both modes.
      </p>

      <h3>Text</h3>
      <ul role="list" class="demo-grid colors-grid colors-grid--pairs">
        <ColorPair
          v-for="pair in textPairs"
          :key="pair.fg + pair.bg"
          v-bind="pair"
        />
      </ul>

      <h3>Graphics</h3>
      <ul role="list" class="demo-grid colors-grid colors-grid--pairs">
        <ColorPair
          v-for="pair in graphicPairs"
          :key="pair.fg + pair.bg"
          v-bind="pair"
          graphic
        />
      </ul>
    </section>

    <section class="demo-section" aria-labelledby="colors-proportion">
      <h2 id="colors-proportion">Proportion</h2>
      <p class="demo-hint">
        A calm base, purple as the accent. Purple never sits behind long text.
      </p>

      <div class="colors-shares" aria-hidden="true">
        <span
          v-for="item in shares"
          :key="item.token"
          :style="{
            '--share': item.share,
            '--share-color': `var(${item.token})`,
          }"
        />
      </div>

      <ul role="list" class="colors-shares-legend">
        <li v-for="item in shares" :key="item.token">
          <strong>{{ item.share }}%</strong>
          {{ item.label }}
          <code>{{ item.token }}</code>
        </li>
      </ul>
    </section>

    <section class="demo-section" aria-labelledby="colors-modes">
      <h2 id="colors-modes">Light and dark</h2>
      <p class="demo-hint">
        Same token, other value: on dark, purple, green and ochre shift to
        lighter variants to keep their contrast. The class on
        <code>&lt;html&gt;</code> picks the set.
      </p>

      <div class="colors-modes">
        <figure
          v-for="mode in modes"
          :key="mode"
          :class="`${mode}-mode`"
          class="colors-mode"
        >
          <figcaption>
            <code>.{{ mode }}-mode</code>
          </figcaption>

          <div class="colors-mode-card">
            <strong>Audit report</strong>
            <span>12 findings, 3 solved.</span>
            <span class="colors-mode-link">--color-accent-text</span>

            <div class="flex-wrapper">
              <Chip color="green" label="Solved" />
              <Chip color="orange" label="Finding" />
              <Chip color="accent" label="New" />
            </div>
          </div>
        </figure>
      </div>
    </section>

    <section class="demo-section" aria-labelledby="colors-gradient">
      <h2 id="colors-gradient">Gradient</h2>
      <p class="demo-hint">
        <code>--gradient-bg</code>, from <code>--color-accent-bg</code> to
        <code>--color-green-bg</code>: once per page, under a card, in both
        modes.
      </p>

      <div class="colors-gradient">
        <div class="colors-mode-card">
          <strong>Ready to start?</strong>
          <span>The gradient carries one card, never text of its own.</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style>
.colors-page {
  .colors-grid {
    --demo-column: 8.5rem;

    @media (min-width: 480px) {
      --demo-column: 11.5rem;
    }
  }

  .colors-grid.colors-grid--pairs {
    --demo-column: 13rem;
  }

  .colors-families {
    --demo-column: 17rem;
  }

  .colors-suffixes {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
    gap: 0.75rem 1.5rem;
    margin-block-end: 1.5rem;
    font-size: var(--font-size-sm);

    code {
      font-size: var(--font-size-xs);
    }

    dd {
      margin-block-start: 0.25rem;
      color: var(--color-grey-text);
    }
  }

  .colors-family {
    overflow: hidden;
    border: 1px solid var(--card-border-color);
    border-radius: var(--radius-xl);
    background-color: var(--color-card-bg);

    .colors-family-title {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      min-block-size: 4rem;
      padding: 0.875rem 1.125rem;
      background-color: var(--family-bg);
      color: var(--family-text);

      h3 {
        margin-block: 0;
        margin-inline-end: auto;
      }

      .iconify {
        font-size: var(--font-size-xl);
      }
    }

    .colors-family-body {
      display: grid;
      gap: 1rem;
      padding: 1.125rem;
      font-size: var(--font-size-sm);

      p {
        margin-block: 0;
      }
    }

    .colors-family-roles {
      display: grid;
      gap: 0.5rem;

      li {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      code {
        font-size: var(--font-size-xs);
      }
    }

    .colors-family-dot {
      flex: none;
      inline-size: 2rem;
      block-size: 2rem;
      border-radius: var(--radius-md);
      background-color: var(--dot-color);
      box-shadow: inset 0 0 0 1px var(--card-border-color);
    }

  }

  .colors-shares {
    display: flex;
    overflow: hidden;
    block-size: 5rem;
    border: 1px solid var(--card-border-color);
    border-radius: var(--radius-xl);

    span {
      flex-grow: var(--share);
      flex-basis: 0;
      background-color: var(--share-color);
    }
  }

  .colors-shares-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.5rem;
    margin-block-start: 1rem;
    font-size: var(--font-size-sm);

    code {
      font-size: var(--font-size-xs);
    }
  }

  .colors-modes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
    gap: 1rem;
  }

  .colors-mode {
    display: grid;
    gap: 0.75rem;
    padding: 1rem;
    border: 1px solid var(--card-border-color);
    border-radius: var(--radius-xl);
    background-color: var(--color-bg);
    color: var(--color-text);
    color-scheme: var(--color-scheme);

    code {
      font-size: var(--font-size-xs);
    }
  }

  .colors-mode-card {
    display: grid;
    justify-items: start;
    gap: 0.5rem;
    padding: 1.5rem;
    border: 1px solid var(--card-border-color);
    border-radius: var(--radius-lg);
    background-color: var(--color-card-bg);

    strong {
      font-size: var(--font-size-lg);
    }

    > span {
      color: var(--color-grey-text);
    }

    .colors-mode-link {
      color: var(--color-accent-text);
      font-weight: var(--font-weight-semibold);
    }
  }

  .colors-gradient {
    padding: 2.5rem 1rem;
    border-radius: var(--radius-xl);
    background: var(--gradient-bg);

    @media (min-width: 480px) {
      padding: 3rem;
    }
  }
}
</style>

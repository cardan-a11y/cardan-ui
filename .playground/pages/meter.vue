<script setup lang="ts">
useHead({ title: 'Meter & data colors' });

type MeterColor = 'accent' | 'green' | 'orange' | 'red';

const role = ref<'meter' | 'progressbar'>('meter');
const hideLabel = ref(true);
const showPercentage = ref(false);
const progress = ref(50);
const max = ref(100);
const fontSize = ref<FontSize>('sm');
const color = ref<MeterColor>('accent');

const roleOptions = [
  { value: 'meter', label: 'meter' },
  { value: 'progressbar', label: 'progressbar' },
];

const fontSizeOptions: { value: FontSize; label: string }[] = [
  { value: 'lg', label: 'lg' },
  { value: 'md', label: 'md' },
  { value: 'sm', label: 'sm' },
  { value: 'xs', label: 'xs' },
];

const colorOptions: { value: MeterColor; label: string }[] = [
  { value: 'accent', label: 'accent' },
  { value: 'green', label: 'green' },
  { value: 'orange', label: 'orange' },
  { value: 'red', label: 'red' },
];

const meanings: {
  color: MeterColor;
  title: string;
  text: string;
  label: string;
  value: number;
}[] = [
  {
    color: 'accent',
    title: 'Accent: emphasis',
    text: 'The default. Positive or neutral, never negative.',
    label: 'Our standard, WCAG AA',
    value: 66,
  },
  {
    color: 'green',
    title: 'Green: positive only',
    text: 'Reached, solved, improved.',
    label: 'Criteria met',
    value: 94,
  },
  {
    color: 'orange',
    title: 'Orange: findings',
    text: 'Issues and what needs attention. A warning without the alarm.',
    label: 'Open issues',
    value: 42,
  },
];

const rules = [
  {
    title: 'One message',
    text: 'The title says what to see. Highlight one value at most.',
  },
  {
    title: 'Label directly',
    text: 'Names and values sit at the bar. No separate legend where it can be avoided.',
  },
  {
    title: 'Never color alone',
    text: 'Orange and green come with a label or an icon, and the data with a table or a text.',
  },
  {
    title: 'Calm',
    text: 'No 3D, shadow, gradient or grid lines. Red stays out: it is for errors in forms.',
  },
];

const principles = [
  { label: 'Perceivable', value: 42 },
  { label: 'Operable', value: 31 },
  { label: 'Understandable', value: 18 },
  { label: 'Robust', value: 9 },
];

const severities = [
  { label: 'Critical', share: 12, tone: 100 },
  { label: 'Serious', share: 28, tone: 80 },
  { label: 'Moderate', share: 35, tone: 60 },
  { label: 'Low', share: 25, tone: 40 },
];

const figures = [
  { value: 15, label: 'Customer satisfaction' },
  { value: 21, label: 'Customer effort' },
  { value: 10, label: 'Conversion' },
];

const tones = [
  { name: 'Accent', token: '--color-accent-graphic', steps: [100, 80, 60] },
  { name: 'Green', token: '--color-green-graphic', steps: [100, 80, 60] },
  { name: 'Text', token: '--color-text', steps: [100, 80, 60] },
  { name: 'Orange', token: '--color-orange-graphic', steps: [100, 80, 60, 40] },
];
</script>

<template>
  <div class="demo-page meter">
    <p class="demo-eyebrow">Data</p>
    <h1>Meter & data colors</h1>
    <p class="demo-lead">
      A
      <Button
        to="https://www.w3.org/WAI/ARIA/apg/patterns/meter"
        label="meter"
        variant="link"
        target="_blank"
      />
      shows a value in a known range, such as a score. For the progress of a
      task, use <code>role="progressbar"</code>.
    </p>

    <ul role="list" class="demo-grid">
      <li v-for="rule in rules" :key="rule.title" class="demo-tile">
        <strong>{{ rule.title }}</strong>
        <span>{{ rule.text }}</span>
      </li>
    </ul>

    <section class="demo-section" aria-labelledby="meter-meaning">
      <h2 id="meter-meaning">Color is the message</h2>
      <p class="demo-hint">
        Every color means one thing. The <code>color</code> prop follows what
        the chart says, not the kind of data.
      </p>

      <ul role="list" class="demo-grid meter-meanings">
        <li v-for="item in meanings" :key="item.color" class="demo-tile">
          <strong>{{ item.title }}</strong>
          <span>{{ item.text }}</span>
          <ProgressMeter
            :label="item.label"
            :value="item.value"
            :color="item.color"
            show-percentage
          />
          <code>color="{{ item.color }}"</code>
        </li>
      </ul>
    </section>

    <section class="demo-section" aria-labelledby="meter-examples">
      <h2 id="meter-examples">Examples</h2>
      <p class="demo-hint">Sample data, in the brand’s chart colors.</p>

      <div class="demo-grid meter-examples">
        <Card border-radius="xl">
          <h3>Findings per WCAG principle</h3>
          <p>Number of issues. A finding is always orange.</p>

          <ProgressMeter
            v-for="item in principles"
            :key="item.label"
            :label="item.label"
            :value="item.value"
            color="orange"
          />
        </Card>

        <Card border-radius="xl">
          <h3>Compliance</h3>
          <p>Criteria met. Green is progress.</p>

          <div class="meter-compliance">
            <ProgressCircle
              label="Criteria met"
              :value="47"
              :max="50"
              color="green"
              size="lg"
              font-size="lg"
            />
            <p>
              <strong>47 of 50 criteria</strong>
              3 more to full AA compliance.
            </p>
          </div>
        </Card>

        <Card border-radius="xl">
          <h3>Severity of the findings</h3>
          <p>One color in tone steps. The value is always there.</p>

          <div class="meter-stack" aria-hidden="true">
            <span
              v-for="item in severities"
              :key="item.label"
              :style="{ '--share': item.share, '--tone': `${item.tone}%` }"
            />
          </div>

          <ul role="list" class="meter-legend">
            <li
              v-for="item in severities"
              :key="item.label"
              :style="{ '--tone': `${item.tone}%` }"
            >
              <span class="meter-dot" />
              <strong>{{ item.share }}%</strong>
              {{ item.label }}
            </li>
          </ul>
        </Card>

        <Card border-radius="xl">
          <h3>Key figures</h3>
          <p>At the customer, after the audit and the fixes.</p>

          <dl class="meter-figures">
            <div v-for="figure in figures" :key="figure.label">
              <dt>{{ figure.label }}</dt>
              <dd><span>+</span>{{ figure.value }}%</dd>
            </div>
          </dl>
        </Card>
      </div>
    </section>

    <section class="demo-section" aria-labelledby="meter-tones">
      <h2 id="meter-tones">Tone steps</h2>
      <p class="demo-hint">
        A scale stays within one color: 100, 80 and 60% of its
        <code>-graphic</code> token on the surface. 100 and 80 may stand alone,
        60 and 40 only with the value next to them. A tint (<code>-bg</code>)
        is a track or a background, never the data.
      </p>

      <ul role="list" class="demo-grid meter-tones">
        <li
          v-for="tone in tones"
          :key="tone.token"
          class="demo-tile"
          :style="{ '--tone-color': `var(${tone.token})` }"
        >
          <strong>{{ tone.name }}</strong>
          <code>{{ tone.token }}</code>

          <ul role="list">
            <li
              v-for="step in tone.steps"
              :key="step"
              :style="{ '--tone': `${step}%` }"
            >
              <span class="meter-dot" />
              {{ step }}%
            </li>
          </ul>
        </li>
      </ul>

      <pre><code>color-mix(in srgb, var(--color-orange-graphic) 80%, var(--color-card-bg))</code></pre>
    </section>

    <section class="demo-section" aria-labelledby="meter-components">
      <h2 id="meter-components">Components</h2>
      <p class="demo-hint">
        The same props on both. The settings change every meter below.
      </p>

    <div class="card-cols">
      <Card class="progress-meter-card">
        <div class="section-topbar mbe-2">
          <h3>ProgressMeter</h3>

          <Popover icon="material-symbols:settings-rounded">
            <div class="popover-settings-content">
              <h2 class="mbe-1">Props</h2>

              <div class="props-wrapper">
                <Select
                  v-model.number="role"
                  label="role"
                  :options="roleOptions"
                />
                <Input v-model.number="progress" type="number" label="value" />
                <Input v-model.number="max" type="number" label="max" />
                <Select
                  v-model="fontSize"
                  label="fontSize"
                  :options="fontSizeOptions"
                />

                <Select v-model="color" label="color" :options="colorOptions" />

                <Switch v-model="hideLabel" label="hideLabel" />
                <Switch v-model="showPercentage" label="showPercentage" />

                <code
                  >{{`<ProgressMeter
                    :value="${progress}"
                    :max="${max}"
                    :role="${role}"
                    font-size="${fontSize}"
                    color="${color}"
                    :hide-label="${hideLabel}"
                    :show-percentage="${showPercentage}"
                  />`}}</code
                >
                <code
                  >{{`<ProgressCircle
                    label="Progress"
                    :value="${progress}"
                    :max="${max}"
                    :role="${role}"
                    color="${color}"
                  />`}}</code
                >
              </div>
            </div>
          </Popover>
        </div>

        <div class="grid-wrapper" style="--gap: 2rem">
          <ProgressMeter
            label="Progress"
            :hide-label="hideLabel"
            :show-percentage="showPercentage"
            :value="progress"
            :max="max"
            :role="role"
            :color="color"
            :font-size="fontSize"
            size="lg"
          />
          <ProgressMeter
            label="Progress"
            :hide-label="hideLabel"
            :show-percentage="showPercentage"
            :value="progress"
            :max="max"
            :role="role"
            :color="color"
            :font-size="fontSize"
            size="md"
          />
          <ProgressMeter
            label="Progress"
            :hide-label="hideLabel"
            :show-percentage="showPercentage"
            :value="progress"
            :max="max"
            :role="role"
            :color="color"
            :font-size="fontSize"
            size="sm"
          />
        </div>
      </Card>

      <Card class="progress-circle-card">
        <h3 class="mbe-2">ProgressCircle</h3>

        <div class="flex-wrapper" style="--gap: 1.5rem">
          <ProgressCircle
            label="Progress"
            :value="progress"
            :max="max"
            :role="role"
            :color="color"
            size="xl"
            font-size="xl"
          />
          <ProgressCircle
            label="Progress"
            :value="progress"
            :max="max"
            :role="role"
            :color="color"
            size="lg"
            font-size="lg"
          />
          <ProgressCircle
            label="Progress"
            :value="progress"
            :max="max"
            :role="role"
            :color="color"
            size="md"
            font-size="md"
          />
          <ProgressCircle
            label="Progress"
            :value="progress"
            :max="max"
            :role="role"
            :color="color"
            size="sm"
            font-size="sm"
          />
          <ProgressCircle
            label="Progress"
            :value="progress"
            :max="max"
            :role="role"
            :color="color"
            size="xs"
            font-size="xxs"
          />
        </div>
      </Card>
    </div>

    </section>

    <section class="demo-section" aria-labelledby="meter-a11y">
      <h2 id="meter-a11y">Accessibility requirements</h2>

      <Card>
      <ul class="a11y-list">
        <li>The meter has a label, either visible or for screen readers.</li>
        <li>The meter element has <code>role="meter"</code>.</li>
        <li>The meter has <code>aria-valuenow</code> set.</li>
        <li>The meter has <code>aria-valuemin</code> set.</li>
        <li>The meter has <code>aria-valuemax</code> set.</li>
      </ul>
      </Card>
    </section>
  </div>
</template>

<style>
.demo-page.meter {
  .progress-meter-card {
    max-width: 420px;
  }

  .grid-wrapper {
    --gap: 1rem;
    display: grid;
    gap: var(--gap);
  }

  .card {
    margin-block-end: 0;
  }

  .a11y-list {
    margin-block: 0;
  }

  .meter-dot {
    flex: none;
    inline-size: 0.875rem;
    block-size: 0.875rem;
    border-radius: var(--radius-xs);
    background-color: color-mix(
      in srgb,
      var(--tone-color) var(--tone),
      var(--color-card-bg)
    );
  }

  .meter-meanings {
    --demo-column: 16rem;

    .progress-meter-wrapper {
      margin-block: 0.75rem 0.5rem;
    }

    code {
      justify-self: start;
      font-size: var(--font-size-xs);
    }
  }

  .meter-examples {
    --demo-column: 22rem;
    --tone-color: var(--color-orange-graphic);

    .card {
      display: grid;
      align-content: start;
      gap: 1rem;
      padding: 1.75rem;
    }

    h3,
    p {
      margin-block: 0;
    }

    h3 + p {
      margin-block-start: -0.75rem;
      color: var(--color-grey-text);
      font-size: var(--font-size-sm);
    }
  }

  .meter-compliance {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.25rem;

    strong {
      display: block;
      font-size: var(--font-size-lg);
    }
  }

  .meter-stack {
    display: flex;
    overflow: hidden;
    block-size: 2.5rem;
    border-radius: var(--radius-md);

    span {
      flex-grow: var(--share);
      flex-basis: 0;
      background-color: color-mix(
        in srgb,
        var(--tone-color) var(--tone),
        var(--color-card-bg)
      );
    }
  }

  .meter-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
    font-size: var(--font-size-sm);

    li {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }
  }

  .meter-figures {
    display: grid;
    gap: 0.75rem;

    div {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: baseline;
      gap: 0 1rem;
      padding-block-end: 0.75rem;
      border-block-end: 1px solid var(--color-grey-light);

      &:last-child {
        padding-block-end: 0;
        border: 0;
      }
    }

    dd {
      font-size: var(--font-size-xxl);
      font-weight: var(--font-weight-bold);
      line-height: 1;

      span {
        color: var(--color-green-text);
      }
    }
  }

  .meter-tones {
    --demo-column: 11rem;

    code {
      justify-self: start;
      font-size: var(--font-size-xs);
    }

    ul {
      display: grid;
      gap: 0.375rem;
      margin-block-start: 0.75rem;
    }

    ul li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .meter-dot {
      inline-size: 2.5rem;
      block-size: 1.5rem;
      border-radius: var(--radius-sm);
    }
  }

  pre {
    margin-block: 1.5rem 0;
  }
}
</style>

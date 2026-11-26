<script setup lang="ts">
useHead({ title: 'Buttons & Links' });

const rules = [
  {
    title: 'Button or link',
    text: 'A button does something here, a link goes somewhere. With to or href, Button renders a NuxtLink.',
  },
  {
    title: 'One primary',
    text: 'One primary button per view. Never two side by side: the rest is secondary, outline or a link.',
  },
  {
    title: 'Verb first',
    text: 'Start, Plan, Download, View. Two to four words that say what you get.',
  },
  {
    title: 'Say where it goes',
    text: 'No “Click here” or “Read more”. A link reads like the page it opens.',
  },
];

const variants: { variant: ButtonVariant; use: string; onAccent?: boolean }[] =
  [
    { variant: 'primary', use: 'The main action. One per view.' },
    { variant: 'secondary', use: 'The action next to the primary.' },
    { variant: 'outline', use: 'A quieter action, such as Cancel.' },
    { variant: 'ghost', use: 'Toolbars and rows of small actions.' },
    { variant: 'black', use: 'In a card or on a tint.' },
    { variant: 'white', use: 'On the accent or on green.', onAccent: true },
    { variant: 'green', use: 'A positive confirmation.' },
    { variant: 'danger', use: 'Destroys something: delete, remove.' },
    { variant: '3d', use: 'Raised, for one standout action.' },
    { variant: 'link', use: 'A next step or another page.' },
  ];

const colored: ButtonVariant[] = [
  'ghost-green',
  'ghost-red',
  'outline-green',
  'outline-red',
];

const sizes: { size: ButtonSize; label: string }[] = [
  { size: 'xl', label: 'Extra Large' },
  { size: 'lg', label: 'Large' },
  { size: 'md', label: 'Medium' },
  { size: 'sm', label: 'Small' },
  { size: 'xs', label: 'Extra Small' },
];

const fontSizes: FontSize[] = ['lg', 'md', 'sm', 'xs', 'xxs'];

const agreed = ref(false);
const message = ref('');
const sendStatus = ref('');
const sent = ref(false);

// A press while unavailable says why; emptied first, so a second press is
// read out again
async function onSend() {
  if (agreed.value) return;
  sendStatus.value = '';
  await nextTick();
  sendStatus.value = 'Not sent: tick “I agree to the terms” first.';
}
</script>

<template>
  <div class="demo-page buttons-page">
    <p class="demo-eyebrow">Actions</p>
    <h1>Buttons & Links</h1>
    <p class="demo-lead">
      A button says what happens. The patterns are the APG
      <Button
        label="button"
        to="https://www.w3.org/WAI/ARIA/apg/patterns/button"
        variant="link"
        target="_blank"
      />
      and
      <Button
        label="link"
        to="https://www.w3.org/WAI/ARIA/apg/patterns/link"
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

    <section class="demo-section" aria-labelledby="buttons-variants">
      <h2 id="buttons-variants">Variants</h2>
      <p class="demo-hint">
        Pick by what the action means, not by its look.
        <code>variant="primary"</code> is not the default: a plain
        <code>{{ `<Button>` }}</code> is <code>secondary</code>.
      </p>

      <ul role="list" class="demo-grid buttons-variants">
        <li
          v-for="item in variants"
          :key="item.variant"
          :class="['demo-tile', item.onAccent && 'buttons-on-accent']"
        >
          <div class="buttons-sample">
            <Button :variant="item.variant" :label="item.variant" />
          </div>
          <span>{{ item.use }}</span>
        </li>
      </ul>

      <h3>With a meaning</h3>
      <div class="flex-wrapper">
        <Button
          v-for="variant in colored"
          :key="variant"
          :variant="variant"
          :label="variant"
        />
      </div>
    </section>

    <section class="demo-section" aria-labelledby="buttons-sizes">
      <h2 id="buttons-sizes">Sizes</h2>
      <p class="demo-hint">
        <code>size</code> sets the height and padding, <code>font-size</code>
        and <code>icon-size</code> only the text and the icon.
      </p>

      <Card>
        <h3>size</h3>
        <div class="flex-wrapper">
          <Button
            v-for="item in sizes"
            :key="item.size"
            icon="material-symbols:accessibility-new-rounded"
            :size="item.size"
            :label="item.label"
          />
        </div>

        <h3>font-size</h3>
        <div class="flex-wrapper" style="--gap: 1rem">
          <Button
            v-for="size in fontSizes"
            :key="size"
            variant="link"
            :font-size="size"
            :label="`${size} link`"
          />
        </div>

        <h3>icon-size</h3>
        <div class="flex-wrapper" style="--gap: 1rem">
          <Button
            v-for="size in fontSizes"
            :key="size"
            icon="material-symbols:check-circle-rounded"
            icon-pos="end"
            :icon-size="size"
            :label="`${size} icon`"
          />
        </div>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="buttons-icons">
      <h2 id="buttons-icons">Icons and shape</h2>
      <p class="demo-hint">
        An icon supports the label, never replaces it: with
        <code>hide-label</code> the label stays the accessible name. A link to
        another site gets its icon by itself.
      </p>

      <Card>
        <h3>icon, icon-pos, hide-label</h3>
        <div class="flex-wrapper">
          <Button
            icon="material-symbols:download-rounded"
            icon-size="xl"
            label="Download"
            variant="primary"
            hide-label
          />
          <Button
            icon="material-symbols:chevron-left-rounded"
            label="Previous"
          />
          <Button
            icon="material-symbols:chevron-right-rounded"
            icon-pos="end"
            label="Next"
          />
          <Button
            variant="ghost"
            icon="material-symbols:arrow-left-alt-rounded"
            label="Back"
          />
          <Button
            variant="link"
            to="https://www.cardan.com"
            target="_blank"
            label="Cardan.com"
          />
        </div>

        <h3>radius</h3>
        <div class="flex-wrapper">
        <Button
          radius="full"
          size="xl"
          icon="material-symbols:download-rounded"
          label="Download"
        />
        <Button
          radius="full"
          size="xl"
          icon-size="xl"
          icon="material-symbols:download-rounded"
          hide-label
          label="Download"
        />
        <Button
          radius="md"
          size="xl"
          icon-size="xxl"
          icon="material-symbols:download-rounded"
          hide-label
          label="Download"
        />
        <Button
          radius="sm"
          size="lg"
          icon-size="xl"
          icon="material-symbols:download-rounded"
          hide-label
          label="Download"
        />
        <Button
          radius="xs"
          size="sm"
          icon-size="lg"
          icon="material-symbols:download-rounded"
          hide-label
          label="Download"
        />
        </div>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="buttons-states">
      <h2 id="buttons-states">States</h2>
      <p class="demo-hint">
        <code>loading</code> and <code>aria-disabled</code> keep the button in
        the Tab order; <code>disabled</code> takes it out.
      </p>

      <Card>
        <div class="flex-wrapper">
        <Button size="lg" loading label="Loading" />
        <Button size="lg" loading label="Loading link" to="/" />
        <Button size="lg" disabled label="Disabled button" />
        <Button size="lg" aria-disabled label="Unavailable button" />
        <Button size="lg" aria-disabled label="Unavailable link" to="/" />
        <Button
          size="lg"
          disabled
          label="Disabled link"
          to="https://www.cardan.com"
          icon-pos="end"
          icon="material-symbols:open-in-new-rounded"
        />
        <CopyButton size="lg" text="Demo Text" />
        </div>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="buttons-unavailable">
      <h2 id="buttons-unavailable">Unavailable, but focusable</h2>
      <p class="demo-hint">
        Prefer <code>aria-disabled</code>: a keyboard or screen reader user
        still finds the button and learns why it does nothing. Say why in its
        description (<code>aria-describedby</code>) or in text next to it.
      </p>

      <Card>
        <ul class="buttons-notes">
          <li>A submit button does not submit, also not on Enter in a field.</li>
          <li>An unavailable link keeps its href, but is not followed.</li>
          <li>
            A click, Enter or Space still emits <code>click</code>, so a press
            can say why nothing happens.
          </li>
        </ul>

      <Form @submit="sent = true">
        <Input v-model="message" label="Message" />
        <Checkbox v-model="agreed" label="I agree to the terms" />
        <div class="flex-wrapper">
          <Button
            type="submit"
            variant="primary"
            label="Send"
            :aria-disabled="!agreed"
            aria-describedby="send-reason"
            @click="onSend"
          />
          <p id="send-reason">
            {{ agreed ? '' : 'Tick “I agree to the terms” to send.' }}
          </p>
        </div>
        <p role="status">{{ sent ? 'Sent.' : sendStatus }}</p>
      </Form>
    </Card>
    </section>

    <section class="demo-section" aria-labelledby="buttons-current">
      <h2 id="buttons-current">The current page, disabled</h2>
      <p class="demo-hint">
        A disabled link has no href: it cannot be followed or reached with Tab.
        One to the current page keeps that look and
        <code>aria-current="page"</code>.
      </p>

      <Card>
        <div class="flex-wrapper">
        <Button
          variant="sidebar"
          to="/buttons"
          icon="material-symbols:smart-button-rounded"
          label="Buttons & Links"
        />
        <Button
          variant="sidebar"
          to="/buttons"
          icon="material-symbols:smart-button-rounded"
          label="Buttons & Links"
          disabled
        />
        </div>
      </Card>
    </section>
  </div>
</template>

<style>
.buttons-page {
  .card {
    margin-block-end: 0;

    h3 {
      margin-block: 2rem 0.75rem;
      font-size: var(--font-size-md);

      &:first-child {
        margin-block-start: 0;
      }
    }
  }

  .buttons-variants {
    --demo-column: 11rem;

    .demo-tile {
      gap: 0.75rem;
    }

    .buttons-sample {
      display: grid;
      place-items: center;
      min-block-size: 5rem;
      margin: -1.125rem -1.125rem 0;
      padding: 1rem;
      border-block-end: 1px solid var(--card-border-color);
      border-start-start-radius: inherit;
      border-start-end-radius: inherit;
      background-color: var(--color-bg);
      font-size: var(--font-size-md);
    }

    .buttons-on-accent .buttons-sample {
      background-color: var(--color-accent);
    }
  }

  .buttons-notes {
    margin-block: 0 1.5rem;
  }
}
</style>

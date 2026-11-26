<script setup lang="ts">
useHead({ title: 'Chip, Callout & Toast' });

const chipSize = ref<ChipSize>('md');
const chipFontSize = ref<FontSize>('sm');
const chipIconSize = ref<FontSize>('sm');
const chipColors: BaseColor[] = [
  'default',
  'accent',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
];
const chipVariants: ChipVariant[] = ['flat', 'outline', 'soft'];
const textTransforms: TextTransform[] = [
  'uppercase',
  'lowercase',
  'capitalize',
];

const meanings = [
  {
    title: 'Green',
    text: 'Positive only: passed, solved, improved.',
  },
  {
    title: 'Orange',
    text: 'Findings and what needs attention.',
  },
  {
    title: 'Red',
    text: 'Errors, in forms and system messages only.',
  },
  {
    title: 'Blue, yellow, pink',
    text: 'Not brand colors. Blue is information or a category, yellow and pink a category only.',
  },
];

const calloutFontSize = ref<FontSize>('sm');
const calloutIconSize = ref<FontSize>('lg');
const calloutVariant = ref<CalloutVariant>('solid');
const calloutVariantOptions = [
  { value: 'solid', label: 'solid' },
  { value: 'outline', label: 'outline' },
];

const sizeOptions: { value: FontSize; label: string }[] = [
  {
    value: 'xl',
    label: 'xl',
  },
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
];

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function makeToast(timeout?: number) {
  const { createToast } = useToast();

  createToast({
    color: 'green',
    label: 'Lorem ipsum dolor sit amet consectetur adipisicing elit',
    timeout,
  });
}
</script>

<template>
  <div class="demo-page text-components-page">
    <p class="demo-eyebrow">Feedback</p>
    <h1>Chip, Callout & Toast</h1>
    <p class="demo-lead">
      A Chip labels a status or a category, a Callout is a message in the page
      and a Toast a short message on top of it. All three take a
      <code>color</code>, and every color means one thing: see
      <Button to="/colors" label="Colors" variant="link" />.
    </p>

    <ul role="list" class="demo-grid">
      <li v-for="meaning in meanings" :key="meaning.title" class="demo-tile">
        <strong>{{ meaning.title }}</strong>
        <span>{{ meaning.text }}</span>
      </li>
    </ul>

    <section class="demo-section" aria-labelledby="text-chip">
      <div class="section-topbar">
        <h2 id="text-chip">Chip</h2>

        <Popover icon="material-symbols:settings-rounded">
          <div class="popover-settings-content">
            <h2 class="mbe-1">Props</h2>

            <div class="props-wrapper">
              <Select
                v-model="chipSize"
                :options="sizeOptions"
                label="size"
                size="sm"
              />
              <Select
                v-model="chipFontSize"
                :options="sizeOptions"
                label="fontSize"
                size="sm"
              />
              <Select
                v-model="chipIconSize"
                :options="sizeOptions"
                label="iconSize"
                size="sm"
              />

              <code
                >{{`<Chip
                  :size="${chipSize}"
                  :font-size="${chipFontSize}"
                  :icon-size="${chipIconSize}"
                />`}}</code
              >
            </div>
          </div>
        </Popover>
      </div>
      <p class="demo-hint">
        A label, not a control. <code>variant</code> is <code>flat</code> by
        default; a number as <code>label</code> is formatted in the language of
        the page. The icon is decorative, so the label says it all.
      </p>

      <Card>
        <template v-for="variant in chipVariants" :key="variant">
          <h3>{{ variant }}</h3>
          <div class="chips-grid">
            <Chip
              v-for="color in chipColors"
              :key="color"
              :size="chipSize"
              :font-size="chipFontSize"
              :icon-size="chipIconSize"
              icon="material-symbols:check-rounded"
              :variant="variant"
              :label="capitalize(color)"
              :color="color === 'default' ? undefined : color"
            />
          </div>
        </template>

        <h3>solid</h3>
        <div class="chips-grid">
          <Chip
            v-for="color in chipColors"
            :key="color"
            :size="chipSize"
            :font-size="chipFontSize"
            :icon-size="chipIconSize"
            icon="material-symbols:check-rounded"
            variant="solid"
            :label="color"
            :color="color"
            text-transform="capitalize"
          />
        </div>

        <h3>text-transform</h3>
        <div class="chips-grid">
          <Chip
            v-for="textTransform in textTransforms"
            :key="textTransform"
            :size="chipSize"
            :font-size="chipFontSize"
            :icon-size="chipIconSize"
            :label="`text-transform ${textTransform}`"
            :text-transform="textTransform"
          />
        </div>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="text-callout">
      <div class="section-topbar">
        <h2 id="text-callout">Callout</h2>

        <Popover icon="material-symbols:settings-rounded">
          <div class="popover-settings-content">
            <h2 class="mbe-1">Props</h2>

            <div class="props-wrapper">
              <Select
                v-model="calloutFontSize"
                :options="sizeOptions"
                label="fontSize"
                size="sm"
              />

              <Select
                v-model="calloutIconSize"
                :options="sizeOptions"
                label="iconSize"
                size="sm"
              />

              <Select
                v-model="calloutVariant"
                :options="calloutVariantOptions"
                label="variant"
                size="sm"
              />

              <code
                >{{`<Callout
                  :font-size="${calloutFontSize}"
                  :icon-size="${calloutIconSize}"
                  variant="${calloutVariant}"
                />`}}</code
              >
            </div>
          </div>
        </Popover>
      </div>
      <p class="demo-hint">
        Green, red, orange and blue bring their own icon and a hidden word for
        it (Success, Error, Warning, Notice), so the color is never the only
        signal. <code>icon</code> sets another one, <code>:icon="false"</code>
        none. Callout sets no role: the red example adds
        <code>role="alert"</code> itself.
      </p>

      <Card>
        <div class="callouts-grid">
          <Callout
            :font-size="calloutFontSize"
            :icon-size="calloutIconSize"
            :variant="calloutVariant"
            color="green"
          >
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
          </Callout>

          <Callout
            :font-size="calloutFontSize"
            :icon-size="calloutIconSize"
            :variant="calloutVariant"
            color="red"
            role="alert"
          >
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
          </Callout>

          <Callout
            :font-size="calloutFontSize"
            :icon-size="calloutIconSize"
            :variant="calloutVariant"
            color="orange"
          >
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
          </Callout>

          <Callout
            :font-size="calloutFontSize"
            :icon-size="calloutIconSize"
            :variant="calloutVariant"
            color="blue"
          >
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
          </Callout>

          <Callout
            :font-size="calloutFontSize"
            :icon-size="calloutIconSize"
            :variant="calloutVariant"
            color="accent"
            icon="material-symbols:lightbulb-outline-rounded"
          >
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
          </Callout>
        </div>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="text-toast">
      <h2 id="text-toast">Toast</h2>
      <p class="demo-hint">
        <code>useToast().createToast({ color, label, timeout })</code> queues a
        toast, which ToastManager shows in a polite live region. With a
        <code>timeout</code> in milliseconds it hides by itself, and waits
        while the pointer or focus is on it.
      </p>

      <Card>
        <ul class="text-notes">
          <li>
            Not for a message from an open modal Dialog or MobileMenu: the
            toast is under its backdrop, out of reach and unannounced. Show
            that message in the dialog, with ErrorMessage.
          </li>
          <li>
            <code>createToast()</code> returns the id of the toast, and
            <code>hideToast(id)</code> hides it.
          </li>
        </ul>

        <div class="flex-wrapper text-toast-actions" style="--flex-grow: 0">
          <Button
            icon="material-symbols:add-circle-rounded"
            variant="outline"
            label="Add Toast"
            @click="makeToast()"
          />
          <Button
            icon="material-symbols:timer-outline-rounded"
            variant="outline"
            label="Add Toast with a 5s timeout"
            @click="makeToast(5000)"
          />
        </div>

        <Toast label="Success message in a toast notification" color="green" />
        <Toast label="Error message in a toast notification" color="red" />
        <Toast label="Warning message in a toast notification" color="orange" />
        <Toast
          label="Information message in a toast notification"
          color="blue"
        />
        <Toast
          label="Brand message in a toast notification"
          color="accent"
          icon="material-symbols:lightbulb-outline-rounded"
        />
      </Card>
    </section>
  </div>
</template>

<style>
.demo-page.text-components-page {
  .section-topbar {
    margin-block-end: 0.5rem;

    > h2 {
      margin-block: 0;
    }
  }

  .card {
    margin-block-end: 0;

    h3 {
      margin-block: 1.5rem 0.75rem;
      font-size: var(--font-size-md);

      &:first-child {
        margin-block-start: 0;
      }
    }
  }

  .chips-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;

    > * {
      max-inline-size: max-content;
    }
  }

  .callouts-grid {
    display: grid;
    gap: 1rem;
    justify-content: start;
  }

  .text-notes {
    margin-block: 0 1.5rem;
  }

  .text-toast-actions {
    margin-block-end: 1.5rem;
  }
}
</style>

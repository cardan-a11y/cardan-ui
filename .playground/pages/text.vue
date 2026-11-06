<script setup lang="ts">
useHead({ title: 'Text & Icons' });

const lines = ref(1);
const text = ref(
  'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Sequi est, amet quae placeat odit officia inventore rerum ad pariatur a minima quos ut deleniti aperiam qui eligendi id dolores distinctio. Lorem, ipsum dolor sit amet consectetur adipisicing elit. Ipsa consectetur corrupti ad blanditiis ratione tempora modi labore, esse facilis in eos distinctio aperiam repellendus ab earum qui commodi officiis eveniet. Lorem ipsum, dolor sit amet consectetur adipisicing elit. Labore similique ex quisquam ab eum deserunt odit ipsum, natus maiores dignissimos ratione nemo. Ab rem laborum ratione nobis nihil dolor quia.',
);

const chipSize = ref<ChipSize>('md');
const chipFontSize = ref<FontSize>('sm');
const chipIconSize = ref<FontSize>('sm');
const chipColors: BaseColor[] = [
  'default',
  'grey',
  'accent',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
];
const textTransforms: TextTransform[] = [
  'uppercase',
  'lowercase',
  'capitalize',
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

function makeToast() {
  const { createToast } = useToast();

  createToast({
    color: 'green',
    label: 'Lorem ipsum dolor sit amet consectetur adipisicing elit',
  });
}
</script>

<template>
  <div class="demo-page text-components-page">
    <h1>Text components & icons</h1>

    <Card>
      <div class="section-topbar">
        <h2>Chip</h2>

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

      <div class="chips-grid">
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          label="Default"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          label="Grey"
          color="grey"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          label="Accent"
          color="accent"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          label="Red"
          color="red"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          label="Orange"
          color="orange"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          label="Yellow"
          color="yellow"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          label="Green"
          color="green"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          label="Blue"
          color="blue"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          label="Purple"
          color="purple"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          label="Pink"
          color="pink"
        />
      </div>

      <div class="chips-grid">
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="outline"
          label="Default"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="outline"
          label="Grey"
          color="grey"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="outline"
          label="Accent"
          color="accent"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="outline"
          label="Red"
          color="red"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="outline"
          label="Orange"
          color="orange"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="outline"
          label="Yellow"
          color="yellow"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="outline"
          label="Green"
          color="green"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="outline"
          label="Blue"
          color="blue"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="outline"
          label="Purple"
          color="purple"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="outline"
          label="Pink"
          color="pink"
        />
      </div>

      <div class="chips-grid">
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="soft"
          label="Default"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="soft"
          label="Grey"
          color="grey"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="soft"
          label="Accent"
          color="accent"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="soft"
          label="Red"
          color="red"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="soft"
          label="Orange"
          color="orange"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="soft"
          label="Yellow"
          color="yellow"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="soft"
          label="Green"
          color="green"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="soft"
          label="Blue"
          color="blue"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="soft"
          label="Purple"
          color="purple"
        />
        <Chip
          :size="chipSize"
          :font-size="chipFontSize"
          :icon-size="chipIconSize"
          icon="material-symbols:check-rounded"
          variant="soft"
          label="Pink"
          color="pink"
        />
      </div>

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

    <div class="card-cols">
      <Card>
        <div class="section-topbar">
          <h2>Callout</h2>

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

      <Card>
        <div class="section-topbar">
          <h2>Toast</h2>

          <Button
            icon="material-symbols:add-circle-rounded"
            variant="outline"
            label="Add Toast"
            @click="makeToast"
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
    </div>

    <Card>
      <div class="section-topbar">
        <h2>Ellipsis</h2>

        <Popover icon="material-symbols:settings-rounded" :max-width="480">
          <div class="popover-settings-content">
            <h2>Props</h2>

            <div class="props-wrapper">
              <Input v-model.number="lines" type="number" label="lines" />
              <Textarea v-model="text" label="text" />
              <code>{{`<Ellipsis :lines="${lines}"></Ellipsis>`}}</code>
            </div>
          </div>
        </Popover>
      </div>

      <Ellipsis :lines="lines" class="ellipsis-demo">
        {{ text }}
      </Ellipsis>

      <div class="two-cols">
        <div>
          <h2 class="lists-title">Unordered List</h2>
          <ul>
            <li>This is a list item</li>
            <li>This is a list item</li>
            <li>This is a list item</li>
            <li>This is a list item</li>
            <li>This is a list item</li>
            <li>This is a list item</li>
            <li>This is a list item</li>
            <li>This is a list item</li>
            <li>This is a list item</li>
            <li>This is a list item</li>
          </ul>
        </div>

        <div>
          <h2 class="lists-title">Numbered List</h2>
          <ol>
            <li>This is a list item</li>
            <li>This is a list item</li>
            <li>This is a list item</li>
            <li>This is a list item</li>
            <li>This is a list item</li>
            <li>This is a list item</li>
            <li>This is a list item</li>
            <li>This is a list item</li>
            <li>This is a list item</li>
            <li>This is a list item</li>
          </ol>
        </div>

        <div>
          <h2 class="lists-title">Definition List</h2>
          <dl class="definition-list">
            <dt>Definition term</dt>
            <dd>Definition description</dd>

            <dt>Definition term</dt>
            <dd>Definition description</dd>

            <dt>Definition term</dt>
            <dd>Definition description</dd>

            <dt>Definition term</dt>
            <dd>Definition description</dd>

            <dt>Definition term</dt>
            <dd>Definition description</dd>
          </dl>
        </div>
      </div>
    </Card>

    <Card class="icons-card">
      <h2>Icons</h2>
      <p>
        Icons used in components are from
        <Button
          href="https://icones.js.org/collection/material-symbols"
          label="Material Symbols at Iconify"
          variant="link"
          target="_blank"
        />, powered by
        <Button
          href="https://nuxt.com/modules/icon"
          label="Nuxt Icon"
          variant="link"
          target="_blank"
        />.
      </p>

      <h3 class="default-icons-title">Bundled icons</h3>
      <p>
        The icons the components show on first paint, in the client bundle of
        every project through the layer's <code>nuxt.config.ts</code>.
      </p>
      <ul role="list" class="icon-grid">
        <li v-for="icon in bundledIcons" :key="icon">
          <Icon :name="icon" />
          <div class="name">{{ icon }}</div>
        </li>
      </ul>
    </Card>
  </div>
</template>

<style>
.text-components-page {
  .section-topbar {
    margin-block-end: 1.5rem;
  }

  .lists-title {
    margin-block-start: 2.5rem;
    margin-block-end: 0;
  }

  .two-cols {
    .definition-list {
      margin-block: 1rem;
    }

    @container (min-width: 720px) {
      display: grid;
      grid-template-columns: auto auto auto;
    }
  }
}

.chips-grid {
  margin-block-end: 1.5rem;
  display: inline-flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.5rem;

  > * {
    max-width: max-content;
  }
}

.callouts-grid {
  display: inline-grid;
  gap: 1rem;
  margin-inline-end: 1rem;
}

.ellipsis-demo {
  color: var(--color-grey-text);
}

.icons-card {
  .default-icons-title {
    margin-block: 2.5rem 1.5rem;
  }

  .icon-grid {
    display: grid;
    column-gap: 0.25rem;
    row-gap: 1.25rem;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 12rem), 1fr));

    > * {
      display: grid;
      align-content: start;
      min-height: 5rem;

      .iconify {
        margin-block-end: 0.5em;
        font-size: var(--font-size-xxl);
      }
    }

    .name {
      user-select: all;
      font-size: var(--font-size-xs);
      color: var(--color-grey-text);
    }
  }

  .form-field-wrapper {
    max-width: 480px;
  }
}
</style>

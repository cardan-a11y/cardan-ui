<script setup lang="ts">
import md from '~/data/demo.md?raw';

useHead({ title: 'Markdown components' });

const content = ref(md);

// Text that may come from anyone: raw HTML, attributes and CSS stay out
// unless the text is trusted.
const untrusted = [
  'A <b onclick="alert(1)">bold</b> word and <img src="x" onerror="alert(1)">.',
  '',
  'A phrase in *English*{lang=en onclick=alert(1)} and a `#ff0000` swatch.',
  '',
  'Not a swatch: `rgb(0 0 0);background:url(https://example.com/x.png)`',
].join('\n');

// HTML the team wrote itself, for `trusted`.
const trustedContent = [
  'Press <kbd>Ctrl</kbd> + <kbd>C</kbd>.',
  '',
  '<details><summary>More</summary>A details element.</details>',
].join('\n');

// A bare YouTube or Vimeo link in a paragraph of its own renders as a
// VideoPlayer; a link with its own text stays a link.
const video = [
  'A video from a link in a paragraph of its own:',
  '',
  'https://youtube.com/watch?v=PGvgdZuQu6w',
  '',
  'A link with its own text stays a link: [the same video](https://youtube.com/watch?v=PGvgdZuQu6w).',
].join('\n');

const title = 'Chapter with *emphasis* and `code`';
const ellipsisLines = ref(0);
const fontSize = ref<FontSize>('md');
const fontSizeOptions: { value: FontSize; label: string }[] = [
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
</script>

<template>
  <div class="demo-page markdown">
    <h1>Markdown components</h1>
    <p class="fs-md">Rich Text Editor and markdown parser component.</p>

    <Card class="mbs-2">
      <div class="section-topbar">
        <h2>Markdown Preview</h2>

        <Popover icon="material-symbols:settings-rounded">
          <div class="popover-settings-content">
            <h2 class="mbe-1">Props</h2>

            <div class="props-wrapper">
              <Select
                v-model="fontSize"
                :options="fontSizeOptions"
                label="fontSize"
                size="sm"
              />
              <Input
                v-model.number="ellipsisLines"
                type="number"
                label="ellipsisLines"
                :min="0"
              />

              <code
                >{{`<MarkdownPreview
                  :font-size="${fontSize}"
                  :ellipsis-lines="${ellipsisLines}"
                />`}}</code
              >
            </div>
          </div>
        </Popover>
      </div>

      <MarkdownPreview
        :content="content"
        :font-size="fontSize"
        :ellipsis-lines="ellipsisLines"
      />
    </Card>

    <Card class="mbs-2">
      <h2>Safe by default</h2>
      <p class="mbe-1">
        Without <code>trusted</code>, raw HTML shows as text and
        <code>{…}</code> sets only <code>lang</code>, <code>dir</code> and
        <code>class</code>.
      </p>

      <div class="markdown-cases">
        <section aria-labelledby="markdown-safe">
          <h3 id="markdown-safe">Default</h3>
          <MarkdownPreview :content="untrusted" data-case="safe" />
        </section>

        <section aria-labelledby="markdown-trusted">
          <h3 id="markdown-trusted"><code>trusted</code></h3>
          <MarkdownPreview
            :content="trustedContent"
            trusted
            data-case="trusted"
          />
        </section>
      </div>
    </Card>

    <Card class="mbs-2">
      <h2>Video</h2>
      <p class="mbe-1">
        A bare YouTube or Vimeo link in a paragraph of its own renders as a
        <NuxtLink to="/video">VideoPlayer</NuxtLink>, also without
        <code>trusted</code>. A link with its own text stays a link.
      </p>

      <MarkdownPreview :content="video" data-case="video" />
    </Card>

    <Card class="mbs-2">
      <h2>Inline</h2>
      <p class="mbe-1">
        For a title or label: inline markup in a <code>&lt;span&gt;</code>,
        valid inside a button, link or label, in the size around it.
      </p>

      <Button variant="outline" data-case="inline">
        <MarkdownPreview :content="title" inline />
      </Button>
    </Card>

    <Card class="mbs-2">
      <h2>Markdown Editor</h2>
      <MarkdownEditor v-model="content" label="Markdown Editor" hide-label />
    </Card>
  </div>
</template>

<style>
.markdown-cases {
  display: grid;
  gap: 1.5rem;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }

  h3 {
    margin-block: 0 0.5rem;
    font-size: var(--font-size-md);
  }
}
</style>

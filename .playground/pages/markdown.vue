<script setup lang="ts">
import md from '~/data/demo.md?raw';

useHead({ title: 'Markdown components' });

const content = ref(md);
// autofocus works on mount: the switch remounts the editor
const editorAutofocus = ref(false);

const untrusted = [
  'A <b onclick="alert(1)">bold</b> word and <img src="x" onerror="alert(1)">.',
  '',
  'A phrase in *English*{lang=en onclick=alert(1)} and a `#ff0000` swatch.',
  '',
  'Not a swatch: `rgb(0 0 0);background:url(https://example.com/x.png)`',
].join('\n');

const trustedContent = [
  'Press <kbd>Ctrl</kbd> + <kbd>C</kbd>.',
  '',
  '<details><summary>More</summary>A details element.</details>',
].join('\n');

const video = [
  'A video from a link in a paragraph of its own:',
  '',
  'https://youtube.com/watch?v=PGvgdZuQu6w',
  '',
  'A link with its own text stays a link: [the same video](https://youtube.com/watch?v=PGvgdZuQu6w).',
].join('\n');

const grammars = [
  '| Fence | Grammar |',
  '| --- | --- |',
  '| `html`, `xml`, `svg` | `xml` |',
  '| `css` | `css` |',
  '| `js`, `javascript`, `jsx` | `javascript` |',
  '| `ts`, `typescript`, `tsx` | `typescript` |',
  '| `json` | `json` |',
  '| `bash`, `sh` | `bash` |',
].join('\n');

const title = 'Chapter with *emphasis* and `code`';
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
    <p class="demo-eyebrow">Content</p>
    <h1>Markdown components</h1>
    <p class="demo-lead">
      <code>MarkdownPreview</code> renders markdown as HTML, safe by default.
      <code>MarkdownEditor</code> is the editor for it, a wrapper around
      md-editor-v3.
    </p>

    <section class="demo-section" aria-labelledby="markdown-preview">
      <h2 id="markdown-preview">Markdown Preview</h2>
      <p class="demo-hint">
        <code>content</code> is the markdown. <code>font-size</code> is
        <code>md</code> by default, and <code>heading-offset</code> moves the
        text’s own headings down: 1 turns <code>##</code> into an
        <code>&lt;h3&gt;</code>.
      </p>

      <Card>
        <div class="section-topbar">
          <h3>The demo text</h3>

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

                <code>{{`<MarkdownPreview :font-size="${fontSize}" />`}}</code>
              </div>
            </div>
          </Popover>
        </div>

        <MarkdownPreview :content="content" :font-size="fontSize" />
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="markdown-safety">
      <h2 id="markdown-safety">Safe by default</h2>
      <p class="demo-hint">
        Without <code>trusted</code>, raw HTML shows as text and
        <code>{…}</code> sets only <code>lang</code>, <code>dir</code> and
        <code>class</code>. <code>trusted</code> allows both, only for text the
        team wrote.
      </p>

      <Card>
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
    </section>

    <section class="demo-section" aria-labelledby="markdown-video">
      <h2 id="markdown-video">Video</h2>
      <p class="demo-hint">
        A bare YouTube or Vimeo link in a paragraph of its own renders as a
        <NuxtLink to="/video">VideoPlayer</NuxtLink>, also without
        <code>trusted</code>. A link with its own text stays a link, and with
        <code>videos-as-links</code> every link does, for a place a player
        does not fit, such as a table cell.
      </p>

      <Card>
        <div class="markdown-cases">
          <section aria-labelledby="markdown-video-default">
            <h3 id="markdown-video-default">As a player</h3>
            <MarkdownPreview :content="video" data-case="video" />
          </section>

          <section aria-labelledby="markdown-video-links">
            <h3 id="markdown-video-links"><code>videos-as-links</code></h3>
            <MarkdownPreview
              :content="video"
              videos-as-links
              data-case="videos-as-links"
            />
          </section>
        </div>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="markdown-inline">
      <h2 id="markdown-inline">Inline</h2>
      <p class="demo-hint">
        For a title or label: inline markup in a <code>&lt;span&gt;</code>,
        valid inside a button, link or label, in the size around it.
      </p>

      <Card>
        <Button variant="outline" data-case="inline">
          <MarkdownPreview :content="title" inline />
        </Button>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="markdown-highlighting">
      <h2 id="markdown-highlighting">Code highlighting</h2>
      <p class="demo-hint">
        A fenced code block (<code>```css</code>) is colored with highlight.js,
        after the text is in the page. A text without a code block never loads
        highlight.js.
      </p>

      <Card>
        <MarkdownPreview :content="grammars" />

        <ul class="markdown-notes">
          <li>
            The block is dark with plain text first; its tokens get their
            colors a moment later.
          </li>
          <li>
            The table lists the most common fence names of each grammar.
            highlight.js knows a few more aliases, such as <code>mjs</code>,
            <code>xhtml</code> and <code>zsh</code>.
          </li>
          <li>
            A fence in another language, or without one, stays plain text in
            the same dark block, with the name in <code>data-lang</code> on the
            <code>&lt;code&gt;</code> element.
          </li>
          <li>
            Another grammar is registered in
            <code>app/components/Markdown/highlight.ts</code>, so every project
            gets it: the layer has no per-project list.
          </li>
          <li>
            <code>MarkdownEditor</code> always loads the same instance, so
            md-editor-v3 loads nothing from a CDN.
          </li>
        </ul>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="markdown-editor">
      <h2 id="markdown-editor">Markdown Editor</h2>
      <p class="demo-hint">
        <code>v-model</code> is the markdown; this one edits the demo text at
        the top of the page. <code>autofocus</code> works on mount, so the
        switch remounts the editor.
      </p>

      <Card>
        <div class="markdown-editor-switch">
          <Switch v-model="editorAutofocus" label="autofocus (remounts)" />
        </div>

        <MarkdownEditor
          :key="String(editorAutofocus)"
          v-model="content"
          :autofocus="editorAutofocus"
          label="Markdown Editor"
          hide-label
        />
      </Card>
    </section>
  </div>
</template>

<style>
.demo-page.markdown {
  .card {
    margin-block-end: 0;
  }

  .section-topbar h3 {
    margin-block: 0;
  }

  .markdown-cases {
    display: grid;
    gap: 1.5rem;

    @media (min-width: 768px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    h3 {
      margin-block: 0 0.5rem;
      font-size: var(--font-size-md);
    }
  }

  .markdown-notes {
    margin-block: 1.5rem 0;
  }

  .markdown-editor-switch {
    margin-block-end: 1rem;
  }
}
</style>

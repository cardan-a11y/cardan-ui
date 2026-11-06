The `<MarkdownPreview>` component is powered by markdown-it and highlight.js.

The `<MarkdownEditor>` component is a wrapper for [md-editor-v3](https://github.com/imzbf/md-editor-v3).

```js
<script setup lang="ts">
import { ref } from 'vue';
const isOpen = ref(false);
</script>

<template>
  <MarkdownEditor v-model="content" label="Markdown Editor" />
</template>

<style>
.class {
  width: 100%;
}
</style>
```

```js
<template>
  <MarkdownEditor v-model="content" label="Markdown Editor" />
</template>
```

```html
<div class="test">
  <span data="id" id="abc">Test</span>
</div>
```

```css
.my-class {
  width: 100%;

  .nested {
    height: auto;
  }
}
```

```
A block without a language, or in one highlight.js does not know, stays
plain text in the same dark block.
```

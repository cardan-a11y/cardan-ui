<script setup lang="ts">
// Mounted once on the page; DemoShortcutsButton opens it through the key
const { dialogRef, close } = useDialog('demo-shortcuts');
</script>

<template>
  <Dialog ref="dialogRef" label="Keyboard shortcuts" class="demo-dialog">
    <p>
      This dialog is its own component. The button that opened it lives in
      another one, and both reach the same dialog through the key
      <code>demo-shortcuts</code>.
    </p>

    <dl>
      <dt><kbd>Tab</kbd></dt>
      <dd>Moves to the next control in the dialog.</dd>
      <dt><kbd>Escape</kbd></dt>
      <dd>Closes the dialog and returns focus to the button.</dd>
    </dl>

    <Button label="Got it" @click="close()" />
  </Dialog>
</template>

<script setup lang="ts">
/**
 * FileInput in document mode with a `name`, in a Form that posts its inputs:
 * the file stays in the input, so the submit's FormData holds it
 */
defineProps<{ disabled?: boolean }>();

const file = ref<File>();
const posted = ref<string[]>([]);

function handleSubmit(data: FormData) {
  posted.value = [...data].map(([key, value]) =>
    value instanceof File
      ? `${key}: ${value.name} (${formatFileSize(value.size)})`
      : `${key}: ${value}`,
  );
}
</script>

<template>
  <section class="demo-document-form">
    <h2>File Input in document mode in a form</h2>

    <Form @submit="handleSubmit">
      <FileInput
        v-model="file"
        mode="document"
        name="document"
        required
        :label="$t('general.upload-file')"
        accept=".pdf,.doc,.docx,.odt"
        :disabled="disabled"
      />

      <Button
        type="submit"
        :label="$t('general.upload')"
        icon="material-symbols:upload-rounded"
        :disabled="disabled"
      />
    </Form>

    <template v-if="posted.length">
      <hr class="demo-divider" />
      <pre><code>{{ posted.join('\n') }}</code></pre>
    </template>
  </section>
</template>

<style>
.demo-document-form {
  display: grid;
  gap: 1rem;
  max-width: 300px;

  h2 {
    margin-block: 0;
  }

  pre {
    white-space: pre-wrap;
    word-break: break-all;
  }
}
</style>

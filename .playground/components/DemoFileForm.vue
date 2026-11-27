<script setup lang="ts">
defineProps<{
  disabled?: boolean;
  required?: boolean;
}>();

const file = ref<File>();
const fileInputRef = useTemplateRef<FileInputComponent>('fileInput');
const showInvalid = ref(false);
const buttonIsDisabled = ref(true);

function handleFileInput(file?: File) {
  if (!file) {
    buttonIsDisabled.value = true;
    showInvalid.value = false;

    if (fileInputRef.value) {
      fileInputRef.value.validity = true;
    }
    return;
  }

  if (!fileInputRef.value?.validity) {
    buttonIsDisabled.value = true;
    showInvalid.value = true;
  } else {
    buttonIsDisabled.value = false;
    showInvalid.value = false;
  }
}

const posted = ref<string[]>([]);

function uploadFile(formData: FormData) {
  showInvalid.value = false;
  posted.value = [...formData].map(([key, value]) =>
    value instanceof File
      ? `${key}: ${value.name} (${value.size} bytes)`
      : `${key}: ${value}`,
  );
}
</script>

<template>
  <Form ref="fileForm" class="demo-file-form" @submit="uploadFile">
    <FileInput
      ref="fileInput"
      v-model="file"
      :required="required"
      :label="$t('general.upload-file')"
      :show-invalid="showInvalid"
      name="file"
      :disabled="disabled"
      @update:model-value="handleFileInput"
    />

    <Button
      type="submit"
      :label="$t('general.upload')"
      :disabled="buttonIsDisabled"
      :title="$t('general.upload')"
      icon="material-symbols:upload-rounded"
      size="lg"
    />
  </Form>

  <pre
    v-if="posted.length"
    class="demo-file-form-posted"
  ><code>{{ posted.join('\n') }}</code></pre>
</template>

<style>
.demo-file-form {
  max-width: 300px;
}

.demo-file-form-posted {
  white-space: pre-wrap;
  word-break: break-all;
}
</style>

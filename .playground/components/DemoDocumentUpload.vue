<script setup lang="ts">
/**
 * FileInput in document mode, as Cardan Academy uses it for an exam
 * assignment: a chosen file goes to the list (the upload), and the zone
 * gives way to the file, with Replace and Delete.
 */
defineProps<{ disabled?: boolean }>();

type Upload = { id: number; file: File };

const uploads = ref<Upload[]>([]);
const replacing = ref<Upload>();
const fileInput = useTemplateRef<FileInputComponent>('fileInput');
const heading = useTemplateRef<HTMLHeadingElement>('heading');
let nextId = 0;

/** The list re-renders under the focused button; focus goes to the heading */
async function focusHeading() {
  await nextTick();
  heading.value?.focus();
}

function handleSelect(file: File) {
  const upload = { id: nextId++, file };
  const old = replacing.value;
  replacing.value = undefined;

  uploads.value = old
    ? uploads.value.map((item) => (item === old ? upload : item))
    : [...uploads.value, upload];
  focusHeading();
}

function replace(upload: Upload) {
  replacing.value = upload;
  fileInput.value?.open();
}

function remove(upload: Upload) {
  uploads.value = uploads.value.filter((item) => item !== upload);
  focusHeading();
}
</script>

<template>
  <section class="demo-document-upload">
    <h2 ref="heading" tabindex="-1">File Input in document mode</h2>

    <ul v-if="uploads.length" role="list">
      <li v-for="upload in uploads" :key="upload.id">
        <span>
          {{ upload.file.name }} ({{ formatFileSize(upload.file.size) }})
        </span>

        <Button
          label="Replace"
          :aria-label="`Replace ${upload.file.name}`"
          icon="material-symbols:sync-rounded"
          variant="ghost"
          size="sm"
          :disabled="disabled"
          @click="replace(upload)"
        />

        <Button
          :label="$t('general.delete')"
          :aria-label="`${$t('general.delete')} ${upload.file.name}`"
          icon="material-symbols:delete-outline-rounded"
          variant="ghost"
          size="sm"
          :disabled="disabled"
          @click="remove(upload)"
        />
      </li>
    </ul>

    <FileInput
      ref="fileInput"
      mode="document"
      :label="$t('general.upload-file')"
      accept=".pdf,.doc,.docx,.odt"
      :disabled="disabled"
      :hide-zone="uploads.length > 0"
      @select="handleSelect"
    />
  </section>
</template>

<style>
.demo-document-upload {
  display: grid;
  gap: 1rem;
  max-width: 300px;

  h2 {
    margin-block: 0;
  }

  li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    font-size: var(--font-size-sm);
    word-break: break-all;
  }
}
</style>

<script setup lang="ts">
import compressor from 'compressorjs';

const { t } = useI18n();

const model = defineModel<File>();

const {
  label,
  required,
  maxFileSize = 5000,
  convertSize = 500000,
  quality = 0.9,
  maxWidth = 1920,
  maxHeight = 1920,
  name = undefined,
  placeholderUrl = undefined,
  accept = undefined,
  id = useId(),
} = defineProps<{
  label: string;
  name?: string;
  placeholderUrl?: string;
  id?: string;
  accept?: string;
  showInvalid?: boolean;
  required?: boolean;
  disabled?: boolean;
  autofocus?: boolean;
  maxFileSize?: number;
  convertSize?: number;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}>();

const fileInputRef = ref<HTMLInputElement>();
const imagePreview = ref(placeholderUrl);
const dragover = ref(false);
const validity = ref(true);

function handlePaste(event: ClipboardEvent) {
  const file = event.clipboardData?.files?.[0];

  if (fileInputRef.value?.files && event.clipboardData?.files) {
    fileInputRef.value.files = event.clipboardData.files;
  }

  if (file) {
    handleFile(file);
    emit('paste', file);
  }
}

onMounted(() => {
  window.addEventListener('paste', handlePaste);
});

onUnmounted(() => {
  window.removeEventListener('paste', handlePaste);
});

defineExpose({
  validity,
  imagePreview,
  handleFile,
});

const emit = defineEmits<{
  paste: [file: File];
}>();

const errorMessage = ref('');

function handleDragOver() {
  dragover.value = true;
}

function handleDragLeave() {
  dragover.value = false;
}

/**
 * The chosen file is the value right away; a compressed image replaces it
 * once compressorjs is done, so the value never goes empty in between and a
 * parent that watches it sees a file at every step.
 */
function compressFile(file: File) {
  model.value = file;

  if (!file.type.includes('image') || file.type.includes('gif')) return;

  new compressor(file, {
    quality: quality,
    maxWidth: maxWidth,
    maxHeight: maxHeight,
    convertSize: convertSize,

    success(result: File) {
      model.value = new File([result], result.name, { type: result.type });
    },
  });
}

function handleImagePreview(file: File) {
  if (imagePreview.value) {
    URL.revokeObjectURL(imagePreview.value);
    imagePreview.value = undefined;
  }

  if (file?.type?.includes('image')) {
    imagePreview.value = URL.createObjectURL(file);
  }
}

function validateFile(file: File) {
  if (!file && required) {
    validity.value = false;
    errorMessage.value = t('form.missing-value', { item: label });
    return;
  }

  if (file.size / 1000 > maxFileSize) {
    validity.value = false;
    errorMessage.value = t('files.too-big');
    return;
  }

  validity.value = true;
  errorMessage.value = '';
  return;
}

function handleFile(file?: File) {
  if (!file) return;

  validateFile(file);
  handleImagePreview(file);
  compressFile(file);
}

function handleFileInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  handleFile(file);
}

function removeFile() {
  validity.value = true;
  model.value = undefined;
  errorMessage.value = '';

  if (fileInputRef.value) {
    fileInputRef.value.files = null;
  }

  if (imagePreview.value) {
    URL.revokeObjectURL(imagePreview.value);
    imagePreview.value = placeholderUrl;
  }

  fileInputRef.value?.focus();
}
</script>

<template>
  <div class="file-input-wrapper">
    <label :for="id" class="file-input-label">
      <span>
        {{ label || $t('files.browse') }}
      </span>

      <RequiredChip v-if="required" />
    </label>

    <div class="file-input">
      <input
        :id="id"
        ref="fileInputRef"
        type="file"
        :name="name"
        :required="required"
        :autofocus="autofocus"
        :accept="accept"
        :disabled="disabled"
        :aria-describedby="id && !validity ? `error-${id}` : ''"
        :class="[showInvalid && !validity && 'show-invalid']"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDragLeave"
        @change="handleFileInput"
      />

      <button
        tabindex="-1"
        type="button"
        :class="[
          'file-input-button',
          imagePreview && 'has-image-preview',
          model && 'has-file',
          dragover && 'dragover',
        ]"
      >
        <span class="file-input-icon-wrapper">
          <Icon :name="fileTypeIcon(model)" />
        </span>

        <span class="button-text">
          <span>
            {{ $t('files.button-text') }}
          </span>
          <span>(max. {{ formatFileSize(maxFileSize * 1000) }}) </span>
        </span>

        <img
          v-if="imagePreview"
          :src="imagePreview"
          alt=""
          :aria-label="$t('files.example', { file: model?.name || label })"
          class="preview-image"
        />
      </button>
    </div>

    <div v-if="model" class="file-preview" :aria-describedby="id">
      <div>
        <span class="file-name">{{ model.name }}</span>

        <span class="file-size"> ({{ formatFileSize(model.size) }})</span>
      </div>

      <Button
        :label="$t('general.delete')"
        hide-label
        icon="material-symbols:close-rounded"
        variant="danger"
        radius="full"
        size="xs"
        @click="removeFile"
      />
    </div>

    <InputError :id="id" :error-text="errorMessage" />
  </div>
</template>

<style>
:where(label) {
  font-weight: var(--font-weight-medium);
  -webkit-user-select: none;
  user-select: none;
}

:where(.file-input-wrapper) {
  position: relative;
  display: grid;
  align-items: center;
  align-content: start;
  transition-property: opacity;
  transition-duration: var(--duration-sm);

  label,
  .label {
    display: inline-flex;
    gap: 0.35rem;
    min-height: 1.25rem;
    align-items: center;
    font-size: var(--font-size-sm);
    margin-block-end: 0.25rem;
    color: var(--color-text);
  }
}

.file-input-wrapper {
  max-width: 100%;

  &:has(input:disabled) {
    opacity: 35%;
    pointer-events: none;
  }
}

.file-input-button {
  position: relative;
  width: 100%;
  padding: 0;
  border: 1.5px dashed var(--color-grey-graphic);
  border-radius: var(--radius-lg);
  background-color: var(--color-input-bg);
  outline: 1px solid transparent;
  padding-block: 2rem;

  .button-text {
    padding-inline: 1rem;
    font-weight: var(--font-weight-regular);
    color: var(--color-grey-text);
    display: grid;
    gap: 0.25rem;
  }

  .file-input-icon-wrapper {
    display: grid;
    place-content: center;
    margin-block-end: 1rem;
    width: 3.5rem;
    height: 3.5rem;
    margin-inline: auto;
    border: 1px solid var(--color-grey-bg);
    border-radius: var(--radius-md);
    color: var(--color-grey-graphic);
    background-color: var(--color-bg);

    .iconify {
      display: block;
      font-size: var(--font-size-lg);
    }
  }

  .preview-image {
    object-fit: contain;
    min-width: 5rem;
  }

  &.has-image-preview {
    max-width: max-content;
    border: none;
    padding-block: 0;
    border-radius: 0;

    .file-input-icon-wrapper,
    .button-text {
      display: none;
    }
  }

  &.dragover {
    background-color: var(--color-accent-bg);
    border-color: var(--color-accent-graphic);
    color: var(--color-accent-text);
  }
}

.file-preview {
  word-break: break-all;
  margin-block: 0.75em;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 0.5em;
  font-size: var(--font-size-xs);
  color: var(--color-grey-text);

  .file-name {
    color: var(--color-text);
  }
}

.file-input {
  position: relative;
  display: grid;
  margin-block-start: 0.25rem;

  input[type='file'] {
    -webkit-tap-highlight-color: transparent;
    position: absolute;
    z-index: 1;
    inset: 0;
    border: 0;
    padding: 0;
    opacity: 0;
    width: 100%;
    height: 100%;

    &:focus-visible {
      + .file-input-button {
        outline: 2px solid var(--focus-color);
        outline-offset: 2px;

        .iconify {
          color: var(--focus-color);
        }
      }
    }

    &:hover:not(:disabled) {
      cursor: pointer;

      + .file-input-button {
        border-color: var(--color-grey-text);

        .file-input-icon-wrapper {
          color: var(--color-grey-text);
        }

        .button-text {
          color: var(--color-text);
        }
      }

      &:focus-visible + .file-input-button {
        .iconify {
          color: var(--color-accent-graphic);
        }
      }
    }

    &:hover:not(:disabled) + .has-image-preview {
      outline: 1.5px dashed var(--color-black);
      outline-offset: 1.5px;
    }
  }
}

.file-input-wrapper:has(.has-image-preview) {
  .file-input {
    max-width: max-content;
  }
}

.file-input-wrapper:has(.show-invalid) {
  .file-input-button {
    border-color: var(--color-red-graphic);
  }

  .error-wrapper .error {
    display: flex;
  }
}
</style>

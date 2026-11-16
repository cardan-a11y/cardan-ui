<script setup lang="ts">
import compressor from 'compressorjs';

const { t, locale } = useI18n();

const model = defineModel<File>();

const {
  label,
  required,
  showInvalid,
  mode = 'image',
  shape = 'default',
  maxFileSize = 5000,
  convertSize = 500000,
  quality = 0.9,
  maxWidth = 1920,
  maxHeight = 1920,
  name = undefined,
  placeholderUrl = undefined,
  accept = undefined,
  disabled = false,
  id = useId(),
} = defineProps<{
  label: string;
  /**
   * `image` keeps the chosen file as the value, and previews and compresses
   * an image. `document` is for a file that is uploaded as it is, such as a
   * PDF: the field lists the types in `accept` and checks a file against
   * them, hands each valid file to `select` and is empty again, so the parent
   * shows what was uploaded. No preview, no compression and no pasting, and
   * an error shows right away; `required` only shows the chip, as the field
   * is empty.
   */
  mode?: 'image' | 'document';
  /** `circle`: a pill led by a round preview, for an avatar */
  shape?: 'default' | 'circle';
  name?: string;
  placeholderUrl?: string;
  id?: string;
  /** In document mode, the extensions: `.pdf,.docx` or `pdf,docx` */
  accept?: string;
  hideLabel?: boolean;
  /** Shows only the error; `open()` opens the picker, e.g. for "Replace" */
  hideZone?: boolean;
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

/** Until a file is chosen, a picture in image mode */
const icon = computed(() =>
  !model.value && mode === 'image'
    ? 'material-symbols:add-photo-alternate-outline-rounded'
    : fileTypeIcon(model.value),
);

const fileInputRef = ref<HTMLInputElement>();
const imagePreview = ref(placeholderUrl);
const dragover = ref(false);
const validity = ref(true);

/** The extensions in `accept` in document mode, without the dot */
const extensions = computed(() =>
  mode === 'document' && accept
    ? accept
        .split(',')
        .map((type) => type.trim().replace(/^\./, '').toLowerCase())
        .filter(Boolean)
    : [],
);

/** "PDF, DOCX or ODT" */
const typesLabel = computed(() =>
  new Intl.ListFormat(locale.value, { type: 'disjunction' }).format(
    extensions.value.map((extension) => extension.toUpperCase()),
  ),
);

const maxSizeLabel = computed(() => formatFileSize(maxFileSize * 1000));

const formShowInvalid = inject(formShowInvalidKey, ref(false));

/** A required image field without a file, once its form shows the errors */
const missing = computed(
  () =>
    required &&
    mode !== 'document' &&
    !model.value &&
    (showInvalid || formShowInvalid.value),
);

// A rejected file shows its error at once, in both modes
const showError = computed(() => !validity.value || missing.value);

const shownErrorMessage = computed(
  () => errorMessage.value || t('form.missing-value', { item: label }),
);

const wrapperRef = useTemplateRef<HTMLElement>('wrapper');

/** A paste anywhere on the page, unless it belongs to another field */
function takesPaste(event: ClipboardEvent) {
  const wrapper = wrapperRef.value;
  const target = event.target as Element | null;
  const active = document.activeElement;
  if (disabled || !wrapper || !target) return false;

  // Into a text field, an editor or another FileInput
  if (
    !wrapper.contains(target) &&
    (target.closest('input, textarea, select, [contenteditable]') ||
      target.closest('.file-input-wrapper'))
  ) {
    return false;
  }

  // With focus in another FileInput, that one takes it
  const focusedWrapper = active?.closest('.file-input-wrapper');
  if (focusedWrapper && focusedWrapper !== wrapper) return false;

  // Not a field that is out of sight, such as one in a closed Dialog
  if (wrapper.checkVisibility?.() === false) return false;

  // One field per paste: the first visible one mounted, unless one has focus
  const taken = event as ClipboardEvent & { fileInputTaken?: boolean };
  if (taken.fileInputTaken) return false;
  taken.fileInputTaken = true;

  return true;
}

async function handlePaste(event: ClipboardEvent) {
  if (mode === 'document' || !takesPaste(event)) return;

  // A paste of text leaves the field, and the input a form posts, as they are
  const file = event.clipboardData?.files?.[0];
  if (!file) return;

  // The input holds the pasted file like a chosen one
  if (fileInputRef.value && event.clipboardData) {
    fileInputRef.value.files = event.clipboardData.files;
  }

  // A parent reads `validity` on paste, so the check goes first
  await handleFile(file);
  emit('paste', file);
}

onMounted(() => {
  window.addEventListener('paste', handlePaste);
});

onUnmounted(() => {
  window.removeEventListener('paste', handlePaste);
});

/** Opens the file picker, e.g. from a "Replace" button */
function open() {
  fileInputRef.value?.click();
}

defineExpose({
  validity,
  imagePreview,
  handleFile,
  open,
});

const emit = defineEmits<{
  paste: [file: File];
  /** In document mode, a file that passed the checks */
  select: [file: File];
}>();

const errorMessage = ref('');

/** The file being compressed; a result for an earlier file is dropped */
let compressing: File | undefined;

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
  compressing = file;

  if (!file.type.includes('image') || file.type.includes('gif')) return;

  new compressor(file, {
    quality: quality,
    maxWidth: maxWidth,
    maxHeight: maxHeight,
    convertSize: convertSize,

    success(result: File) {
      // Another file was chosen, or this one removed, in the meantime
      if (compressing !== file) return;
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

  const extension = getFileExtension(file.name)?.toLowerCase() ?? '';
  if (extensions.value.length && !extensions.value.includes(extension)) {
    validity.value = false;
    errorMessage.value = t('files.wrong-type', { types: typesLabel.value });
    return;
  }

  if (file.size / 1000 > maxFileSize) {
    validity.value = false;
    errorMessage.value = t('files.too-big', { size: maxSizeLabel.value });
    return;
  }

  validity.value = true;
  errorMessage.value = '';
  return;
}

/** Empties the input, so choosing the same file again is a change too */
function clearInput() {
  if (fileInputRef.value) fileInputRef.value.value = '';
}

/**
 * After a rejected file, the input holds the value again, so a form that
 * posts the input (FormData) sends the file the field shows; without a value
 * the input is empty, and the same file can be chosen again either way
 */
function restoreInput() {
  const input = fileInputRef.value;
  if (!input) return;

  if (model.value && typeof DataTransfer !== 'undefined') {
    const transfer = new DataTransfer();
    transfer.items.add(model.value);
    input.files = transfer.files;
  } else {
    clearInput();
  }
}

async function handleFile(file?: File) {
  if (!file) return;

  // Empty first: the same message as before would not be announced again
  errorMessage.value = '';
  await nextTick();
  validateFile(file);

  if (mode === 'document') {
    if (validity.value) emit('select', file);
    clearInput();
    return;
  }

  // A rejected file is not the value: the field keeps what it had, in the
  // input too, and shows the error
  if (!validity.value) {
    restoreInput();
    return;
  }

  handleImagePreview(file);
  compressFile(file);
}

function handleFileInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  handleFile(file);
}

/** Back to no file: the current picture, if there is one, and no error */
function reset() {
  validity.value = true;
  errorMessage.value = '';
  compressing = undefined;
  clearInput();

  if (imagePreview.value?.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreview.value);
  }
  imagePreview.value = placeholderUrl;
}

/*
 * While no file is chosen, the preview follows `placeholderUrl`, which the
 * parent may only have after mount, and a value the parent clears resets the
 * field, as when a dialog with it closes.
 */
watch([() => placeholderUrl, model], ([, file]) => {
  if (!file) reset();
});

function removeFile() {
  model.value = undefined;
  reset();
  fileInputRef.value?.focus();
}
</script>

<template>
  <div
    ref="wrapper"
    :class="['file-input-wrapper', `file-input-shape--${shape}`]"
  >
    <label
      v-show="!hideZone"
      :for="id"
      :class="['file-input-label', hideLabel && 'visuallyhidden']"
    >
      <span>
        {{ label || $t('files.browse') }}
      </span>

      <RequiredChip v-if="required" />
    </label>

    <div v-show="!hideZone" class="file-input">
      <input
        :id="id"
        ref="fileInputRef"
        type="file"
        :name="name"
        :required="required && mode !== 'document'"
        :autofocus="autofocus"
        :accept="
          extensions.length
            ? extensions.map((extension) => `.${extension}`).join(',')
            : accept
        "
        :disabled="disabled"
        :aria-describedby="
          showError ? `instruction-${id} error-${id}` : `instruction-${id}`
        "
        :aria-invalid="showError || undefined"
        :class="[showError && 'show-invalid']"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDragLeave"
        @change="handleFileInput"
      />

      <!-- The look of the control, which is the input over it -->
      <button
        tabindex="-1"
        type="button"
        aria-hidden="true"
        :class="[
          'file-input-button',
          imagePreview && 'has-image-preview',
          model && 'has-file',
          dragover && 'dragover',
        ]"
      >
        <span class="file-input-icon-wrapper">
          <Icon :name="icon" />
        </span>

        <span class="button-text">
          <span>
            {{ $t('files.button-text') }}
          </span>
          <span :id="`instruction-${id}`">
            <template v-if="extensions.length">{{ typesLabel }} </template>
            (max. {{ maxSizeLabel }})
          </span>
        </span>

        <img
          v-if="imagePreview"
          :src="imagePreview"
          :alt="$t('files.example', { file: model?.name || label })"
          class="preview-image"
        />
      </button>
    </div>

    <div v-if="model" class="file-preview">
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

    <InputError :id="id" :error-text="shownErrorMessage" />
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
      font-size: var(--font-size-xl);
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
  }
}

/* The preview replaces the zone, at its own size */
.file-input-shape--default {
  .file-input-button {
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
  }

  .file-input input[type='file']:hover:not(:disabled) + .has-image-preview {
    outline: 1.5px dashed var(--color-black);
    outline-offset: 1.5px;
  }

  &:has(.has-image-preview) .file-input {
    max-width: max-content;
  }
}

/* An avatar: a pill led by the picture, or by the upload icon until there is
   one, so it sits in a form like any other field */
.file-input-shape--circle .file-input-button {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
  padding-inline-end: 1.25rem;
  border-radius: var(--radius-full);

  .file-input-icon-wrapper,
  .preview-image {
    flex-shrink: 0;
    width: 3rem;
    height: 3rem;
    border-radius: var(--radius-full);
  }

  .file-input-icon-wrapper {
    margin: 0;
  }

  .preview-image {
    order: -1;
    object-fit: cover;
    background-color: var(--color-grey-bg);
  }

  &.has-image-preview .file-input-icon-wrapper {
    display: none;
  }

  .button-text {
    padding-inline: 0;
    text-align: start;
    font-size: var(--font-size-sm);
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

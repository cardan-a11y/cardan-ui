<script setup lang="ts">
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
   * `image` keeps the file as the value, previews and compresses it and takes
   * a paste. `document` checks a file against `accept` and hands it to
   * `select`, without preview, compression or paste. Without `name` it is
   * empty again, for a parent that uploads the file (the same file can be
   * chosen again) and `required` only shows the chip; with `name` the file
   * also becomes the value and stays in the input a form post reads.
   */
  mode?: 'image' | 'document';
  /** `circle`: a pill led by a round preview, for an avatar */
  shape?: 'default' | 'circle';
  /**
   * The input a form post reads. It holds the final image from `ready` on; a
   * submit before that posts the original, which passed `maxFileSize`.
   */
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

const zoneIcon = computed(() =>
  !model.value && mode === 'image'
    ? 'material-symbols:add-photo-alternate-outline-rounded'
    : fileTypeIcon(model.value),
);

const fileInputRef = ref<HTMLInputElement>();
const imagePreview = ref(placeholderUrl);
const dragover = ref(false);
const validity = ref(true);

const acceptedExtensions = computed(() =>
  mode === 'document' && accept
    ? accept
        .split(',')
        .map((type) => type.trim().replace(/^\./, '').toLowerCase())
        .filter(Boolean)
    : [],
);

const typesLabel = computed(() =>
  new Intl.ListFormat(locale.value, { type: 'disjunction' }).format(
    acceptedExtensions.value.map((extension) => extension.toUpperCase()),
  ),
);

const maxSizeLabel = computed(() => formatFileSize(maxFileSize * 1000));

const formShowInvalid = inject(formShowInvalidKey, ref(false));

const keepsFile = computed(() => mode !== 'document' || !!name);

const missingFile = computed(
  () =>
    required &&
    !disabled &&
    keepsFile.value &&
    !model.value &&
    (showInvalid || formShowInvalid.value),
);

const showError = computed(() => !validity.value || missingFile.value);

const shownErrorMessage = computed(
  () => errorMessage.value || t('form.missing-value', { item: label }),
);

const wrapperRef = useTemplateRef<HTMLElement>('wrapper');

function takesPaste(event: ClipboardEvent) {
  const wrapper = wrapperRef.value;
  const target = event.target as Element | null;
  const active = document.activeElement;
  if (disabled || !wrapper || !target) return false;

  if (
    !wrapper.contains(target) &&
    (target.closest('input, textarea, select, [contenteditable]') ||
      target.closest('.file-input-wrapper'))
  ) {
    return false;
  }

  const focusedWrapper = active?.closest('.file-input-wrapper');
  if (focusedWrapper && focusedWrapper !== wrapper) return false;

  if (wrapper.checkVisibility?.() === false) return false;

  const taken = event as ClipboardEvent & { fileInputTaken?: boolean };
  if (taken.fileInputTaken) return false;
  taken.fileInputTaken = true;

  return true;
}

async function handlePaste(event: ClipboardEvent) {
  if (mode === 'document' || !takesPaste(event)) return;

  const file = event.clipboardData?.files?.[0];
  if (!file) return;

  if (fileInputRef.value && event.clipboardData) {
    fileInputRef.value.files = event.clipboardData.files;
  }

  await handleFile(file);
  emit('paste', file);
}

onMounted(() => {
  window.addEventListener('paste', handlePaste);
});

onUnmounted(() => {
  window.removeEventListener('paste', handlePaste);
  fileBeingCompressed = undefined;
  revokePreview();
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
  reset,
});

const emit = defineEmits<{
  paste: [file: File];
  /** In document mode, a file that passed the checks */
  select: [file: File];
  /**
   * In image mode, the file is final: the compressed image, or the original
   * when it is not compressed (a GIF, not an image) or compression failed
   */
  ready: [file: File];
}>();

const errorMessage = ref('');

let fileBeingCompressed: File | undefined;

function handleDragOver() {
  dragover.value = true;
}

function handleDragLeave() {
  dragover.value = false;
}

async function compressFile(file: File) {
  model.value = file;
  fileBeingCompressed = file;

  // Once per file, unless a newer file or reset() took its place
  function finish(result: File) {
    if (fileBeingCompressed !== file) return;
    fileBeingCompressed = undefined;
    if (result !== file) {
      model.value = result;
      setInputFile(result);
    }
    emit('ready', result);
  }

  if (!file.type.includes('image') || file.type.includes('gif')) {
    finish(file);
    return;
  }

  try {
    // Loaded on the first image, out of the main chunk
    const { default: Compressor } = await import('compressorjs');
    if (fileBeingCompressed !== file) return;

    new Compressor(file, {
      quality: quality,
      maxWidth: maxWidth,
      maxHeight: maxHeight,
      convertSize: convertSize,
      success: (result: File) =>
        finish(new File([result], result.name, { type: result.type })),
      // The original passed the checks: it stays
      error: () => finish(file),
    });
  } catch {
    // A chunk that failed to load keeps the original too
    finish(file);
  }
}

/** The preview's blob URL FileInput made, never a parent's `placeholderUrl` */
let ownPreviewUrl: string | undefined;

function revokePreview() {
  if (ownPreviewUrl) URL.revokeObjectURL(ownPreviewUrl);
  ownPreviewUrl = undefined;
}

function handleImagePreview(file: File) {
  revokePreview();
  imagePreview.value = undefined;

  if (file?.type?.includes('image')) {
    ownPreviewUrl = URL.createObjectURL(file);
    imagePreview.value = ownPreviewUrl;
  }
}

function validateFile(file: File) {
  if (!file && required) {
    validity.value = false;
    errorMessage.value = t('form.missing-value', { item: label });
    return;
  }

  const extension = getFileExtension(file.name)?.toLowerCase() ?? '';
  if (
    acceptedExtensions.value.length &&
    !acceptedExtensions.value.includes(extension)
  ) {
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

// A file input fires no change for the same file again until it is emptied
function clearInput() {
  if (fileInputRef.value) fileInputRef.value.value = '';
}

function setInputFile(file?: File) {
  const input = fileInputRef.value;
  if (!input) return;

  if (file && typeof DataTransfer !== 'undefined') {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
  } else {
    clearInput();
  }
}

async function handleFile(file?: File) {
  if (!file) return;

  // Empty first: a screen reader does not announce the same message again
  errorMessage.value = '';
  await nextTick();
  validateFile(file);

  if (!keepsFile.value) {
    if (validity.value) emit('select', file);
    clearInput();
    return;
  }

  if (!validity.value) {
    setInputFile(model.value);
    return;
  }

  if (mode === 'document') {
    emit('select', file);
    model.value = file;
    return;
  }

  handleImagePreview(file);
  void compressFile(file);
}

function handleFileInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  handleFile(file);
}

function clearState() {
  validity.value = true;
  errorMessage.value = '';
  fileBeingCompressed = undefined;
  clearInput();
  revokePreview();
  imagePreview.value = placeholderUrl;
}

/** Empties the value, the input and the preview (back to `placeholderUrl`) */
function reset() {
  model.value = undefined;
  clearState();
}

watch([() => placeholderUrl, model], ([, file]) => {
  if (!file) clearState();
});

function removeFile() {
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
        :required="required && keepsFile"
        :autofocus="autofocus"
        :accept="
          acceptedExtensions.length
            ? acceptedExtensions.map((extension) => `.${extension}`).join(',')
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

      <!-- Only the look: the input over it is the control -->
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
          <Icon :name="zoneIcon" />
        </span>

        <span class="button-text">
          <span>
            {{ $t('files.button-text') }}
          </span>
          <span :id="`instruction-${id}`">
            <template v-if="acceptedExtensions.length"
              >{{ typesLabel }}
            </template>
            {{ $t('files.max-size', { size: maxSizeLabel }) }}
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

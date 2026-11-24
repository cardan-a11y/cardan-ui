<script setup lang="ts">
/**
 * Asks before an action, such as a delete: an alertdialog named by `label`,
 * described by `description`, or by the default slot when that needs markup.
 * `confirm` asks the owner to act, which then closes it with `closeDialog()`
 * or shows its failure in `error`. Any other close (Cancel, the close button,
 * Escape, a click outside) emits `cancel`. Focus starts on Cancel. With
 * `challenge`, the user first types the digit the dialog names, and focus
 * starts as in any Dialog, or in the digit's field with `autofocus`. From
 * script, `useConfirm()` opens the one in ConfirmDialogHost.
 */
const {
  label,
  description = undefined,
  confirmLabel = undefined,
  confirmIcon = 'material-symbols:delete-outline-rounded',
  confirmVariant = 'danger',
  challenge = false,
  autofocus = false,
  loading = false,
  error = null,
  id = useId(),
} = defineProps<{
  label: string;
  description?: string;
  /** `general.delete` by default */
  confirmLabel?: string;
  confirmIcon?: string;
  confirmVariant?: ButtonVariant;
  /** Asks for a random digit, new at every open; confirm waits for it */
  challenge?: boolean;
  /** With `challenge`, focus starts in the digit's field */
  autofocus?: boolean;
  /** The action runs: the confirm button is busy */
  loading?: boolean;
  /** A failed action, from `extractApiError()` */
  error?: ApiErrorData | null;
  id?: string;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const slots = defineSlots<{ default?: () => unknown }>();

const dialogRef = useTemplateRef<DialogComponent>('dialog');

const digit = ref<number>();
const typed = ref<string | number>('');
let closedByOwner = false;

const descriptionId = `${id}-description`;
const challengeId = `${id}-challenge`;
const formId = `${id}-form`;

const asksDigit = computed(() => challenge && digit.value !== undefined);
const digitMatches = computed(
  () => String(typed.value).trim() === String(digit.value),
);
const canConfirm = computed(() => !asksDigit.value || digitMatches.value);

const describedBy = computed(
  () =>
    [
      (description || slots.default) && descriptionId,
      asksDigit.value && challengeId,
    ]
      .filter(Boolean)
      .join(' ') || undefined,
);

function openDialog() {
  closedByOwner = false;
  typed.value = '';
  digit.value = Math.floor(Math.random() * 9) + 1;
  dialogRef.value?.openDialog();
}

/** Closes without `cancel`; resolves once the dialog has closed */
function closeDialog(): Promise<void> {
  closedByOwner = true;
  return dialogRef.value?.closeDialog() ?? Promise.resolve();
}

function handleConfirm() {
  if (loading || closedByOwner || !canConfirm.value) return;
  emit('confirm');
}

function handleClose(event: Event) {
  const reopenedSince = (event.currentTarget as HTMLDialogElement).open;
  if (reopenedSince) return;

  digit.value = undefined;
  typed.value = '';

  const cancelled = !closedByOwner;
  closedByOwner = false;
  if (cancelled) emit('cancel');
}

const isVisible = computed(() => !!dialogRef.value?.isVisible);

defineExpose({ openDialog, closeDialog, isVisible });
</script>

<template>
  <Dialog
    ref="dialog"
    role="alertdialog"
    class="confirm-dialog"
    :label="label"
    :aria-describedby="describedBy"
    :focus-cancel="!asksDigit"
    :click-outside="!loading"
    @close="handleClose"
  >
    <div
      v-if="description || $slots.default"
      :id="descriptionId"
      class="confirm-dialog-description"
    >
      <slot>
        <p>{{ description }}</p>
      </slot>
    </div>

    <form v-if="asksDigit" :id="formId" @submit.prevent>
      <p :id="challengeId" class="confirm-dialog-challenge">
        {{ $t('general.confirm-number-description', { n: digit }) }}
      </p>

      <Input
        v-model="typed"
        :label="$t('general.confirm-number')"
        :aria-describedby="challengeId"
        :pattern="String(digit)"
        :autofocus="autofocus"
        inputmode="numeric"
        autocomplete="off"
        size="lg"
        show-invalid
      />
    </form>

    <ErrorMessage :data="error" />

    <template #buttons>
      <Button
        :type="asksDigit ? 'submit' : 'button'"
        :form="asksDigit ? formId : undefined"
        :variant="confirmVariant"
        :icon="confirmIcon"
        :label="confirmLabel ?? $t('general.delete')"
        :loading="loading"
        :disabled="!canConfirm"
        @click="handleConfirm"
      />
    </template>
  </Dialog>
</template>

<style>
.confirm-dialog {
  --dialog-max-width: 420px;

  .confirm-dialog-description,
  .confirm-dialog-challenge {
    margin-block: 0 1rem;
  }

  .confirm-dialog-description > p {
    margin-block: 0;
  }

  .confirm-dialog-challenge {
    font-weight: var(--font-weight-medium);
  }

  .error-message {
    margin-block-start: 1rem;
  }

  .dialog-buttons {
    margin-block-start: 1.5rem;
  }
}
</style>

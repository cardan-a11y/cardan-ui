<script setup lang="ts">
/**
 * Shows the requests of `useConfirm()`, one at a time. Mount it once, in the
 * layout, as ToastManager; without it `confirm()` resolves `false`.
 */
import type { ConfirmRequest } from '../composables/useConfirm';

const { request, register, finish } = useConfirmHost();

// Never bound whole: `onConfirm` would become the `confirm` listener
const options = computed(() => request.value?.options);

const dialogRef = useTemplateRef<ConfirmDialogComponent>('dialog');
const loading = ref(false);
const error = ref<ApiErrorData | null>(null);

interface Run {
  request: ConfirmRequest;
  running: boolean;
  succeeded: boolean;
  closed: boolean;
}

let run: Run | null = null;
let release: (() => void) | undefined;

onMounted(() => {
  release = register(open);
});

onBeforeUnmount(() => {
  release?.();
  run = null;
});

async function open(next: ConfirmRequest) {
  run = { request: next, running: false, succeeded: false, closed: false };
  loading.value = false;
  error.value = null;

  const requestRendered = nextTick();
  await requestRendered;
  if (run?.request === next) dialogRef.value?.openDialog();
}

function end(current: Run, confirmed: boolean) {
  if (run !== current) return;

  run = null;
  loading.value = false;
  error.value = null;
  finish(current.request, confirmed);
}

async function handleConfirm() {
  const current = run;
  if (!current || current.running || current.succeeded || current.closed) {
    return;
  }

  current.running = true;
  loading.value = true;
  error.value = null;

  try {
    await current.request.options.onConfirm();
    current.succeeded = true;
  } catch (thrown) {
    if (run === current) error.value = extractApiError(thrown);
  } finally {
    current.running = false;
    if (run === current) loading.value = false;
  }

  if (current.succeeded) {
    await dialogRef.value?.closeDialog();
    end(current, true);
  } else if (current.closed) {
    end(current, false);
  }
}

function handleCancel() {
  const current = run;
  if (!current) return;

  current.closed = true;
  const endsWhenActionSettles = current.running;
  if (!endsWhenActionSettles) end(current, false);
}
</script>

<template>
  <ConfirmDialog
    ref="dialog"
    :label="options?.label ?? ''"
    :description="options?.description"
    :confirm-label="options?.confirmLabel"
    :confirm-icon="options?.confirmIcon"
    :confirm-variant="options?.confirmVariant"
    :challenge="options?.challenge"
    :autofocus="options?.autofocus"
    :loading="loading"
    :error="error"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  />
</template>

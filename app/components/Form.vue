<script setup lang="ts">
const {
  invalidFocusFn = undefined,
  autofocusFn = undefined,
  showInvalid,
} = defineProps<{
  invalidFocusFn?: CallableFunction;
  autofocusFn?: CallableFunction;
  showInvalid?: boolean;
}>();

onMounted(() => {
  if (autofocusFn) autofocusFn();
});

const formRef = useTemplateRef('form');
const validity = ref(true);

provide(
  formShowInvalidKey,
  computed(() => !!showInvalid || !validity.value),
);

const syncs = new Set<() => boolean>();
provide(formSyncKey, (sync) => {
  syncs.add(sync);
  return () => syncs.delete(sync);
});

/** Submits as the submit button does: a failed check reports and focuses */
function submit() {
  formRef.value?.requestSubmit();
}

async function handleSubmit(event: Event) {
  const target = event.target as HTMLFormElement;
  const synced = [...syncs].map((sync) => sync()).some(Boolean);
  if (synced) await nextTick();

  validity.value = target?.checkValidity();

  if (validity.value) {
    const data = new FormData(target);
    emit('submit', data, event);
  } else {
    emit('invalid', event);
    await nextTick();
    if (invalidFocusFn) invalidFocusFn();
    else {
      const firstInvalidElement = [...target.elements].find(
        (element) =>
          (element as HTMLInputElement).willValidate &&
          !(element as HTMLInputElement).validity.valid,
      ) as HTMLElement | undefined;
      firstInvalidElement?.focus();
    }
  }
}

defineExpose({
  submit,
});

const emit = defineEmits<{
  submit: [data: FormData, event?: Event];
  invalid: [event: Event];
}>();
</script>

<template>
  <form
    ref="form"
    :class="[
      'form',
      showInvalid && 'show-invalid',
      validity ? 'show-valid' : 'show-invalid',
    ]"
    novalidate
    action="."
    @submit.prevent="handleSubmit"
  >
    <slot />
  </form>
</template>

<style>
.form,
.form-content,
.button {
  --form-col-width-auto: auto;
  --form-col-width-20: calc(20% - calc(var(--column-gap) / 5 * 4));
  --form-col-width-25: calc(25% - calc(var(--column-gap) / 4 * 3));
  --form-col-width-30: calc(30% - calc(var(--column-gap) / 10 * 7));
  --form-col-width-33: calc(33.333% - calc(var(--column-gap) / 3 * 2));
  --form-col-width-40: calc(40% - calc(var(--column-gap) / 5 * 3));
  --form-col-width-50: calc(50% - calc(var(--column-gap) / 2));
  --form-col-width-60: calc(60% - calc(var(--column-gap) / 5 * 2));
  --form-col-width-67: calc(66.666% - calc(var(--column-gap) / 3));
  --form-col-width-70: calc(70% - calc(var(--column-gap) / 10 * 3));
  --form-col-width-75: calc(75% - calc(var(--column-gap) / 4));
  --form-col-width-80: calc(80% - calc(var(--column-gap) / 5));
}

.form,
.form-content {
  --focus-color: var(--color-black);
  --row-gap: 1rem;
  --column-gap: 0.5rem;

  display: flex;
  flex-wrap: wrap;
  row-gap: var(--row-gap);
  column-gap: var(--column-gap);
  container-type: inline-size;

  > * {
    flex-basis: 100%;
    flex-grow: 1;
  }

  @container (min-width: 280px) {
    > * {
      flex-basis: var(--form-col-width, 100%);
    }
  }

  .button {
    flex-grow: 0;
  }
}

:where(.form, .form-content) > :where(.button) {
  --form-col-width: initial;
}
</style>

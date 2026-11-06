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

function submit() {
  if (!formRef.value) return;

  validity.value = formRef.value?.checkValidity();

  if (validity.value) {
    const data = new FormData(formRef.value);
    emit('submit', data);
  }
}

function handleSubmit(event: Event) {
  const target = event.target as HTMLFormElement;
  validity.value = target?.checkValidity();

  if (validity.value) {
    const data = new FormData(target);
    emit('submit', data, event);
  } else {
    emit('invalid', event);
    if (invalidFocusFn) invalidFocusFn();
    else {
      // Not a fieldset: it matches `:invalid` before the control in it that
      // is, as in a required RadioGroup or CheckboxGroup, and cannot take focus
      const firstInvalidElement: HTMLElement | null = target.querySelector(
        ':invalid:not(fieldset)',
      );
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
  --col-width-auto: auto;
  --col-width-20: calc(20% - calc(var(--column-gap) / 5 * 4));
  --col-width-25: calc(25% - calc(var(--column-gap) / 4 * 3));
  --col-width-30: calc(30% - calc(var(--column-gap) / 10 * 7));
  --col-width-33: calc(33.333% - calc(var(--column-gap) / 3 * 2));
  --col-width-40: calc(40% - calc(var(--column-gap) / 5 * 3));
  --col-width-50: calc(50% - calc(var(--column-gap) / 2));
  --col-width-60: calc(60% - calc(var(--column-gap) / 5 * 2));
  --col-width-67: calc(66.666% - calc(var(--column-gap) / 3));
  --col-width-70: calc(70% - calc(var(--column-gap) / 10 * 3));
  --col-width-75: calc(75% - calc(var(--column-gap) / 4));
  --col-width-80: calc(80% - calc(var(--column-gap) / 5));
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
      flex-basis: var(--col-width, 100%);
    }
  }

  .button {
    --col-width: var(--col-width, auto);
    flex-grow: 0;
  }
}
</style>

<script setup lang="ts">
const { password = '' } = defineProps<{
  password?: string;
}>();

const { minLength, serverChecks } = usePasswordPolicy();

type Requirement = {
  key: string;
  valid?: boolean;
  count?: number;
  checkedOnSave?: boolean;
};

const requirements = computed<Requirement[]>(() => [
  {
    key: 'length',
    valid: password.length >= minLength.value,
    count: minLength.value,
  },
  ...(serverChecks.value
    ? [
        { key: 'breached', checkedOnSave: true },
        { key: 'common', checkedOnSave: true },
        { key: 'context', checkedOnSave: true },
      ]
    : []),
]);
</script>

<template>
  <div class="password-requirements">
    <p class="visuallyhidden">
      {{ $t('password.requirements.description') }}
    </p>

    <ul role="list" class="requirements-list" aria-live="polite">
      <li
        v-for="requirement in requirements"
        :key="requirement.key"
        :class="{ valid: requirement.valid }"
      >
        <span class="requirement-text">
          {{
            requirement.count !== undefined
              ? $t(
                  `password.requirements.${requirement.key}`,
                  requirement.count,
                )
              : $t(`password.requirements.${requirement.key}`)
          }}
        </span>

        <template v-if="requirement.checkedOnSave">
          <Icon name="material-symbols:info-outline" class="on-save" />
          <span class="visuallyhidden">
            ({{ $t('password.requirements.checked-on-save') }})
          </span>
        </template>

        <template v-else-if="requirement.valid">
          <Icon name="material-symbols:check-circle" class="valid" />
          <span class="visuallyhidden">
            ({{ $t(`password.requirements.${requirement.key}-valid`) }})
          </span>
        </template>

        <template v-else>
          <Icon name="material-symbols:error" class="invalid" />
          <span class="visuallyhidden">
            ({{ $t(`password.requirements.${requirement.key}-invalid`) }})
          </span>
        </template>
      </li>
    </ul>
  </div>
</template>

<style>
/* One form row: the field with its requirements */
.password-new-field {
  display: grid;
  gap: 0.5rem;
}

.password-requirements {
  @container (min-width: 280px) {
    /* A tint that shows on any surface; a container that knows its own sets another */
    background-color: var(
      --password-requirements-bg,
      color-mix(in srgb, var(--color-text) 5%, transparent)
    );
    border-radius: var(--radius-md);
    padding: 0.75rem;
  }

  .requirements-list {
    display: grid;
    gap: 0.5rem;

    li {
      display: flex;
      flex-direction: row-reverse;
      justify-content: start;
      align-items: center;
      gap: 0.5rem;
    }

    .iconify {
      flex-shrink: 0;
    }

    .requirement-text {
      font-size: var(--font-size-xs);
      color: var(--color-grey-text);
    }

    .valid {
      color: var(--color-green-text);
    }

    .invalid,
    .on-save {
      color: var(--color-grey-text);
    }
  }
}
</style>

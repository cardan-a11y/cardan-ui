<script setup lang="ts">
/**
 * The frame of the sign-in pages: the Cardan symbol, title, description, the
 * form and an optional footer. Give `.auth-page-content` a `min-height` from
 * your layout to centre it in the viewport.
 */
const { title = undefined, description = undefined } = defineProps<{
  /** The page's h1. Leave it out when the content brings its own. */
  title?: string;
  description?: string;
}>();

const pageRef = useTemplateRef<HTMLDivElement>('page');

// After an in-app navigation focus starts at the top, not in the form's field,
// unless the content has moved focus itself (the second factor's code field)
onMounted(() => {
  if (
    window.history.state?.back &&
    !pageRef.value?.contains(document.activeElement)
  ) {
    pageRef.value?.focus();
  }
});
</script>

<template>
  <div ref="page" class="auth-page" tabindex="-1">
    <div class="auth-page-content">
      <div class="auth-page-copy">
        <span class="auth-page-logo">
          <CardanLogo form="symbol" height="1.5rem" decorative />
        </span>

        <h1 v-if="title" class="auth-page-title">{{ title }}</h1>

        <p v-if="description" class="auth-page-description">
          {{ description }}
        </p>

        <slot />

        <template v-if="$slots.footer">
          <hr />

          <p class="auth-page-footer">
            <slot name="footer" />
          </p>
        </template>
      </div>
    </div>
  </div>
</template>

<style>
.auth-page {
  margin-inline: auto;
  outline: 1px solid transparent;
}

.auth-page-content {
  --color-ghost-hover-bg: var(--color-bg);
  /* The password requirements on the page colour, set off from this frame's */
  --password-requirements-bg: var(--color-bg);
  display: grid;
  /* At least 18rem where it fits, the full width below that, at most 28rem */
  grid-template-columns: minmax(min(18rem, 100%), 28rem);
  place-content: center;
  padding: 2rem;
  border-radius: var(--radius-xl);
  background-color: var(--color-secondary);

  .auth-page-copy {
    > hr {
      block-size: 1px;
      border: 0;
      background-color: var(--color-card-bg);
      margin-block: 2rem 1rem;
    }
  }

  /* Its own title, or the h1 of the challenge or setup flow inside it */
  h1 {
    font-size: var(--font-size-xl);
  }
}

.auth-page-logo {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  margin-inline: auto;
  margin-block-end: 1.5rem;
  border-radius: var(--radius-lg);
  background-color: var(--color-white);
}

.auth-page-title {
  margin-block-end: 0;
  text-align: center;
}

.auth-page-description {
  margin-inline: auto;
  margin-block-end: 2.5rem;
  text-align: center;
  color: var(--color-grey-text);
}

.auth-page-footer {
  margin-block: 0;
  text-align: center;
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  color: var(--color-grey-text);

  a:hover {
    color: var(--color-accent-text);
  }
}
</style>

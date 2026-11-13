<script setup lang="ts">
/**
 * The frame of the sign-in pages: a panel with the Cardan symbol, a centred
 * title and description, the form, and an optional footer below a rule (the
 * forgot-password or back-to-login link).
 *
 * The panel is a sand-coloured `--color-secondary` surface. Give it a
 * `min-height` from your layout to centre the form in the viewport, e.g.
 * `.auth-page-content { min-height: calc(100svh - 72px - 80px); }`.
 */
const { title = undefined, description = undefined } = defineProps<{
  /** The page's h1. Leave it out when the content brings its own. */
  title?: string;
  description?: string;
}>();

const pageRef = useTemplateRef<HTMLDivElement>('page');

/**
 * Reached through a link in the app (back to login, reset here), the page
 * starts focus at its top instead of at the email field or the body. On a
 * fresh load there is no previous entry, so the form's autofocus applies.
 * A form that has put focus in the page already keeps it: the second factor,
 * reached by signing in, starts in its code field. The content mounts first,
 * so its focus is in place when this runs.
 */
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
  display: grid;
  /* At least 18rem where it fits, the full width below that, at most 28rem */
  grid-template-columns: minmax(min(18rem, 100%), 28rem);
  place-content: center;
  padding: 2rem;
  border-radius: var(--radius-xl);
  background-color: var(--color-secondary);

  .auth-page-copy {
    /* The rule above the footer */
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
  /* max-width: 40ch; */
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

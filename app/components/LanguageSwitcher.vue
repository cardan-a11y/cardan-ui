<script setup lang="ts">
// The locales of the i18n config: a language is added there
const { locale, locales, setLocale } = useI18n();
</script>

<template>
  <section class="language-switcher" :aria-label="$t('aria.choose-language')">
    <ul role="list">
      <li
        v-for="option in locales"
        :key="option.code"
        :class="`list-item--${option.code}`"
      >
        <!-- The home page of the language: a page's address in another
             language is not its own with another prefix (cardan.com has
             /diensten and /en/services) -->
        <NuxtLinkLocale
          :to="{ path: '/' }"
          :locale="option.code"
          :lang="option.language ?? option.code"
          :aria-current="locale === option.code ? 'true' : undefined"
          :class="locale === option.code ? 'active' : ''"
          @click="setLocale(option.code)"
        >
          <span>{{ option.code.toUpperCase() }}</span>
          <!-- The space keeps "EN (English)" apart in a name read from the
               DOM; at the start of the hidden box it is not rendered -->
          <span class="visuallyhidden"> ({{ option.name ?? option.code }})</span>
        </NuxtLinkLocale>
      </li>
    </ul>
  </section>
</template>

<style>
.language-switcher {
  font-size: var(--font-size-xs);

  ul {
    display: flex;
  }

  a {
    background-color: transparent;
    padding-inline: 0.25rem;
    text-decoration: none;

    &.active {
      font-weight: var(--font-weight-semibold);
    }

    &:hover {
      text-decoration: underline;
    }

    &:focus-visible {
      border-radius: var(--radius-xs);
    }
  }

  li:not(:last-child)::after {
    content: '|' / '';
    color: var(--color-grey-graphic);
  }
}
</style>

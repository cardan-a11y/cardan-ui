<script setup lang="ts">
const { locale, setLocale } = useI18n();
</script>

<template>
  <section class="language-switcher" :aria-label="$t('aria.choose-language')">
    <ul role="list">
      <li class="list-item--nl">
        <NuxtLinkLocale
          :to="{ path: '/' }"
          locale="nl"
          lang="nl"
          :class="locale === 'nl' ? 'active' : ''"
          @click="setLocale('nl')"
        >
          <span>NL</span>
          <span class="visuallyhidden">(Nederlands)</span>
        </NuxtLinkLocale>
      </li>

      <li class="list-item--en">
        <NuxtLinkLocale
          :to="{ path: '/' }"
          locale="en"
          lang="en"
          :class="locale === 'en' ? 'active' : ''"
          @click="setLocale('en')"
        >
          <span>EN</span>
          <span class="visuallyhidden">(English)</span>
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

  .list-item--nl::after {
    content: '|' / '';
    color: var(--color-grey-graphic);
  }
}
</style>

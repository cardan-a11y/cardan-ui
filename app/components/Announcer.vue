<script setup lang="ts">
/**
 * The polite and the assertive live region of `useAnnounce()`, mounted once
 * by AppShell; an app has no other.
 */
const { announcements } = useAnnounce();
</script>

<template>
  <Teleport to="#teleports">
    <div
      v-for="urgency in ['polite', 'assertive'] as const"
      :key="urgency"
      role="log"
      :aria-live="urgency"
      aria-relevant="additions"
      class="announcer visuallyhidden"
    >
      <p v-for="message in announcements[urgency]" :key="message.id">
        {{ message.text }}
      </p>
    </div>
  </Teleport>
</template>

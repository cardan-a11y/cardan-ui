---
name: i18n-pair
description: Add a user-facing string to a Cardan Nuxt project as an English and Dutch key pair in the i18n locale files. Use it whenever a template or composable needs a new text.
---

Every user-facing text is a key in both locale files; never a literal
string in a template, a composable or an error message.

1. **Find the files**: `i18n/locales/en.json` and `i18n/locales/nl.json`
   in the repository (the layer's files in cardan-ui; a project's own files
   in an app, which override the layer's keys of the same name).
2. **Look in the layer first**: the layer is the home of every key that
   two projects, or a layer component and a project, use. Use a layer key
   that says the same instead of repeating it in a project; never copy a
   layer key into a project with the same text. A text another project
   already has moves to the layer, and the projects drop their copies once
   that layer release is on `main`.
3. **Choose the key**: `group.name`, in the existing group for the feature
   (`form`, `auth`, `video`, …), or a new group named after the feature.
   Keep the groups and the keys inside them in the order the file uses;
   add new keys at the end of their group.
4. **Write both languages**: natural English and natural Dutch, not a
   translation word for word. Dutch uses the informal "je", lowercase after
   a colon, and the terms the project already uses (search the file for a
   related key). Interpolate with `{name}` placeholders, never by
   concatenating strings.
5. **Use it**: `$t('group.name')` in a template, `t()` from `useI18n()` in
   script, with the placeholders as the second argument.
6. **Check**: the two files have the same keys (a missing key in one shows
   as the key name in the UI); run `pnpm run lint`.

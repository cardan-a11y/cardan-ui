/**
 * The icons the components show on first paint, the spinner of a loading
 * Button and Popover included. A listed icon whose collection a project does
 * not install fails its production build (@nuxt/icon throws outside dev), so
 * every project installs `@iconify-json/material-symbols` and
 * `@iconify-json/svg-spinners`. The file type icons of FileInput are left
 * out: they show after a file is chosen.
 */
const componentIcons = [
  'material-symbols:add-photo-alternate-outline-rounded',
  'material-symbols:add-rounded',
  'material-symbols:add-to-home-screen-outline-rounded',
  'material-symbols:arrow-left-alt',
  'material-symbols:arrow-right-alt',
  'material-symbols:calendar-month-outline-rounded',
  'material-symbols:cancel-outline-rounded',
  'material-symbols:cancel-rounded',
  'material-symbols:check',
  'material-symbols:check-circle',
  'material-symbols:check-circle-outline-rounded',
  'material-symbols:check-circle-rounded',
  'material-symbols:chevron-left-rounded',
  'material-symbols:chevron-right-rounded',
  'material-symbols:close-rounded',
  'material-symbols:computer-outline-rounded',
  'material-symbols:content-copy-outline-rounded',
  'material-symbols:cookie-off-outline',
  'material-symbols:cookie-outline',
  'material-symbols:dark-mode-outline-rounded',
  'material-symbols:dehaze-rounded',
  'material-symbols:do-not-disturb-on-outline-rounded',
  'material-symbols:dock-to-right-outline-rounded',
  'material-symbols:error',
  'material-symbols:expand-more-rounded',
  'material-symbols:help-outline-rounded',
  'material-symbols:home-outline-rounded',
  'material-symbols:info-outline',
  'material-symbols:info-outline-rounded',
  'material-symbols:info-rounded',
  'material-symbols:inventory-rounded',
  'material-symbols:keyboard-arrow-down-rounded',
  'material-symbols:keyboard-double-arrow-left-rounded',
  'material-symbols:keyboard-double-arrow-right-rounded',
  'material-symbols:light-mode-outline-rounded',
  'material-symbols:lock-open-outline',
  'material-symbols:lock-outline',
  'material-symbols:lock-reset',
  'material-symbols:logout',
  'material-symbols:more-horiz',
  'material-symbols:open-in-new-rounded',
  'material-symbols:refresh-rounded',
  'material-symbols:remove-rounded',
  'material-symbols:search-rounded',
  'material-symbols:upload-file-outline',
  'material-symbols:visibility',
  'material-symbols:visibility-off',
  'material-symbols:warning-outline-rounded',
  'material-symbols:warning-rounded',
  'svg-spinners:90-ring-with-bg',
];

/**
 * The icons that two or more of the Cardan projects use (cardan-academy-nuxt,
 * cardan-auditor-nuxt, cardan-cms-nuxt and cardan-support-nuxt, November 2026).
 */
const projectIcons = [
  'material-symbols:arrow-downward',
  'material-symbols:arrow-left-alt-rounded',
  'material-symbols:arrow-right-alt-rounded',
  'material-symbols:check-circle-outline',
  'material-symbols:check-rounded',
  'material-symbols:chevron-left',
  'material-symbols:chevron-right',
  'material-symbols:circle-outline',
  'material-symbols:delete-outline-rounded',
  'material-symbols:do-not-disturb-on-rounded',
  'material-symbols:download-rounded',
  'material-symbols:filter-alt-off-outline-rounded',
  'material-symbols:filter-list-rounded',
  'material-symbols:help-rounded',
  'material-symbols:link-rounded',
  'material-symbols:login-rounded',
  'material-symbols:mail-outline-rounded',
];

/**
 * In the client bundle of every project (`icon.clientBundle.icons` in the
 * layer's `nuxt.config.ts`), so a page does not shift when they load.
 */
export const bundledIcons = [...componentIcons, ...projectIcons];

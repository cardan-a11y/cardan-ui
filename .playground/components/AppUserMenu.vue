<script setup lang="ts">
const { t } = useI18n();
const userMenuRef = useTemplateRef<UserMenuComponent>('userMenu');

const showMenu = ref(false);

const user = {
  name: 'Cardan UI Demo',
  email: 'contact@cardan.com',
  initials: 'C',
};

const menuItems = computed<MenuItem[]>(() => [
  {
    id: 'menu-item-signout',
    label: t('general.sign-out'),
    icon: 'material-symbols:logout-rounded',
    onClick: showConfirmLogout,
  },
]);

function showConfirmLogout() {
  showMenu.value = false;
  userMenuRef.value?.openLogoutDialog();
}

/** The demo has no session: signing out only closes the menu. */
function logout() {}
</script>

<template>
  <UserMenu
    ref="userMenu"
    v-model="showMenu"
    :initials="user.initials"
    :logout="logout"
  >
    <div class="user-info-wrapper">
      <span class="user-name">{{ user.name }}</span>
      <span class="user-email">{{ user.email }}</span>
    </div>
    <hr />

    <ThemeSelect />
    <hr />

    <LanguageSelect />
    <hr />

    <MenuList
      :aria-label="$t('aria.user-menu')"
      button-size="lg"
      font-size="sm"
      icon-size="md"
      :list="menuItems"
    />
  </UserMenu>
</template>

<style>
.user-menu-popover .user-info-wrapper {
  display: grid;
}
</style>

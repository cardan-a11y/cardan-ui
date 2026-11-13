<script setup lang="ts">
useHead({ title: 'App layout' });

const demoNav: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'material-symbols:dashboard-outline-rounded',
  },
  {
    id: 'progress',
    label: 'My progress',
    icon: 'material-symbols:check-circle-outline-rounded',
  },
  {
    id: 'catalog',
    label: 'Catalog',
    icon: 'material-symbols:storefront-outline-rounded',
  },
  {
    id: 'account',
    label: 'My account',
    icon: 'material-symbols:account-circle-outline',
  },
];

const sections = [
  'Perceivable',
  'Operable',
  'Understandable',
  'Robust',
  'Text alternatives',
  'Time-based media',
  'Adaptable',
  'Distinguishable',
  'Keyboard accessible',
  'Enough time',
  'Seizures and physical reactions',
  'Navigable',
  'Input modalities',
  'Readable',
  'Predictable',
  'Input assistance',
  'Compatible',
];

const search = ref('');
const onlyOpen = ref(false);

// The examples are text here: Prettier formats a template literal in the
// template as HTML, and drops its indentation. Each is a fenced block for
// MarkdownPreview, which colours it with the `xml` grammar.
const htmlFence = (code: string) => ['```html', code, '```'].join('\n');

const shellExample = htmlFence(`<AppShell>
  <AppHeader>…</AppHeader>

  <main id="main" tabindex="-1">
    <NuxtPage />
  </main>
</AppShell>`);

const headerExample = htmlFence(`<AppHeader>
  <template #start>
    <MobileMenu :list="navList" />
    <CardanLogo product="auditor" />
  </template>

  <MenuList :list="navList" inline button-variant="topbar" />

  <template #end>
    <UserMenu />
  </template>
</AppHeader>`);

const sidebarExample = htmlFence(`<AppSidebar collapsible>
  <template #header>
    <CardanLogo product="academy" />
  </template>

  <MenuList :list="navList" button-variant="sidebar" />
</AppSidebar>`);

const layoutExample = htmlFence(`<SidebarLayout sticky beside="xl">
  …

  <template #side>
    <aside aria-label="Filters">…</aside>
  </template>
</SidebarLayout>`);
</script>

<template>
  <div class="demo-page layout-page">
    <h1>App layout</h1>

    <p class="fs-md demo-description">
      The parts every Cardan app builds its pages in. They hold the rules that
      are easy to get wrong (what sticks where, what scrolls on its own, where
      focus goes after a navigation) and leave the look to the app: this
      playground uses all four.
    </p>

    <Card>
      <h2>AppShell</h2>

      <p>
        The wrapper around the header, the navigation and the pages. It
        announces a new page to screen readers, puts the skip link first and
        takes focus after a navigation to another page, so the next Tab is the
        skip link. Focus the new page moves into its
        <code>&lt;main&gt;</code> itself stays there (a code field, a heading),
        and an address with a hash focuses the element it names
        (<code>useHashFocus()</code>). The app's
        <code>&lt;main&gt;</code> carries the skip link's target:
        <code>id="main"</code> with <code>tabindex="-1"</code>.
      </p>

      <MarkdownPreview :content="shellExample" class="layout-demo-code" />
    </Card>

    <Card>
      <h2>AppHeader</h2>

      <p>
        The bar at the top, with the page loading indicator: the menu button and
        the logo in <code>start</code>, the navigation in the default slot and
        the user menu in <code>end</code>. It stays in view from 360px wide and
        480px high; on a smaller or lower screen, or zoomed in, it scrolls
        along. Its height is <code>--app-header-height</code> plus its line, its
        look <code>--app-header-bg</code>,
        <code>--app-header-border-color</code>,
        <code>--app-header-max-width</code> and <code>--app-header-gap</code>.
      </p>

      <MarkdownPreview :content="headerExample" class="layout-demo-code" />
    </Card>

    <Card>
      <h2>AppSidebar</h2>

      <p>
        The app's side navigation, a labelled landmark that stays in view and
        scrolls its navigation on its own. With <code>collapsible</code> a
        button folds it to a rail of icons; the choice is kept in the browser
        (<code>useAppSidebar()</code>). The app hides it where its menu takes
        over, with <code>--app-sidebar-display: none</code>.
      </p>

      <div class="sidebar-demo">
        <AppSidebar id="demo-sidebar" label="Demo sidebar" collapsible>
          <template #header>
            <CardanLogo decorative />
          </template>

          <MenuList
            :list="demoNav"
            button-variant="sidebar"
            aria-label="Demo navigation"
          />
        </AppSidebar>

        <p class="sidebar-demo-page">The page</p>
      </div>

      <MarkdownPreview :content="sidebarExample" class="layout-demo-code" />
    </Card>

    <h2 class="layout-demo-title">SidebarLayout</h2>

    <p>
      A page in two columns. The side panel sits beside the main content from
      <code>beside</code> (<code>md</code>, <code>lg</code> or <code>xl</code>,
      or a boolean the app works out itself) and follows it in the document, or
      comes first with <code>side="start"</code>. With <code>sticky</code> it
      stays in view under the header and scrolls on its own when it is taller
      than the viewport: scroll this page to see the panel below do so, from
      1280px wide. The page's spacing above and below is each column's own
      (<code>--sidebar-layout-padding-start</code> and
      <code>--sidebar-layout-padding-end</code>), so the panel runs down to the
      end of the page instead of being cut off above a wrapper's padding.
    </p>

    <MarkdownPreview :content="layoutExample" class="layout-demo-code" />

    <SidebarLayout sticky beside="xl" class="layout-demo">
      <Card v-for="section in sections" :key="section">
        <h3>{{ section }}</h3>

        <p>
          Information and user interface components must be presentable to users
          in ways they can perceive, operate and understand, in a wide variety
          of user agents, including assistive technologies.
        </p>
      </Card>

      <template #side>
        <aside aria-label="Filters" class="layout-demo-side">
          <Card class="layout-demo-filters">
            <h3>Filters</h3>

            <Input v-model="search" label="Search" type="search" />

            <Switch v-model="onlyOpen" label="Only open findings" />
          </Card>

          <Card>
            <h3>On this page</h3>

            <ul role="list">
              <li v-for="section in sections" :key="section">
                <Button variant="link" :label="section" to="#" />
              </li>
            </ul>
          </Card>
        </aside>
      </template>
    </SidebarLayout>
  </div>
</template>

<style>
/* The layout's own spacing below, inside its columns: nothing of the page
   or of main may come under a sticky panel */
main:has(.layout-page) {
  padding-block-end: 0;
}

.layout-page {
  padding-block-end: 0;

  .layout-demo-code {
    margin-block-start: 1rem;

    pre {
      word-break: normal;
    }
  }

  /* The sidebar in a frame, instead of the height of the viewport */
  .sidebar-demo {
    /* Its own sizes, not those of the playground's sidebar around it */
    --app-sidebar-display: grid;
    --app-sidebar-width: 16.25rem;
    --app-sidebar-padding-inline: 0.75rem;
    --app-sidebar-padding-block: 0.75rem;
    --app-sidebar-border-color: var(--color-grey-light);

    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    margin-block: 1.5rem;
    border: 1px solid var(--color-grey-light);
    border-radius: var(--radius-md);
    overflow: clip;

    .app-sidebar {
      position: relative;
      top: auto;
      height: 22rem;
    }

    /* What follows is the app's: the sidebar brings no look for its content */

    /* The full logo, folded to its symbol: clipped to its first square, so
       it does not shrink or jump. The symbol sits above the menu icons. */
    .cardan-logo {
      flex-shrink: 0;
      transform: translateX(calc((2rem - var(--logo-height)) / 2));
      clip-path: inset(0);
      transition: clip-path var(--duration-lg);
    }

    .is-collapsed .cardan-logo {
      clip-path: inset(0 calc(100% - var(--logo-height)) 0 0);
    }

    .menu-list-nav {
      margin-block-start: 2.5rem;
    }

    /* Each menu icon in a square as wide as the fold button, so the icons
       line up with it and sit in the middle of the rail */
    .button-variant--sidebar {
      gap: 0.25rem;

      .iconify {
        inline-size: 2rem;
        /* The button's own border */
        margin-inline-start: -1px;
      }
    }

    .sidebar-demo-page {
      margin: 0;
      padding: 1.5rem;
      color: var(--color-grey-text);
    }
  }

  .layout-demo-title {
    margin-block-start: 3rem;
  }

  .layout-demo {
    --sidebar-layout-side-width: 18rem;
    --sidebar-layout-padding-start: 1.5rem;
    --sidebar-layout-padding-end: 5rem;

    margin-block-start: 1.5rem;

    /* The column's own spacing is below the last card */
    > .sidebar-layout-main > .card:last-child {
      margin-block-end: 0;
    }
  }

  .layout-demo-side {
    display: grid;
    gap: 1rem;

    .card {
      margin-block-end: 0;
    }

    ul {
      display: grid;
      gap: 0.5rem;
    }
  }

  .layout-demo-filters {
    display: grid;
    gap: 1rem;

    h3 {
      margin: 0;
    }
  }
}
</style>

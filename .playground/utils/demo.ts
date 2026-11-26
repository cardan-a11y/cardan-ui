type NavItem = MenuItem & { to: string };

export const navGroups: { id: string; label: string; items: NavItem[] }[] = [
  {
    id: 'start',
    label: 'Start',
    items: [
      { id: 'home', to: '/', label: 'Getting Started' },
      { id: 'changelog', to: '/changelog', label: 'Changelog' },
    ],
  },
  {
    id: 'brand',
    label: 'Brand',
    items: [
      { id: 'colors', to: '/colors', label: 'Colors' },
      { id: 'logo', to: '/logo', label: 'Logo' },
      { id: 'typography', to: '/typography', label: 'Typography' },
      { id: 'icons', to: '/icons', label: 'Icons' },
      { id: 'cards', to: '/cards', label: 'Cards & graphics' },
    ],
  },
  {
    id: 'layout',
    label: 'Layout',
    items: [
      { id: 'layout', to: '/layout', label: 'App layout' },
      { id: 'error-page', to: '/error-page', label: 'Error page' },
      { id: 'breadcrumbs', to: '/breadcrumbs', label: 'Breadcrumbs' },
      { id: 'tabs', to: '/tabs', label: 'Tabs' },
      { id: 'accordion', to: '/accordion', label: 'Accordion' },
    ],
  },
  {
    id: 'actions',
    label: 'Actions',
    items: [
      { id: 'buttons', to: '/buttons', label: 'Buttons & Links' },
      { id: 'tooltip', to: '/tooltip', label: 'Tooltip & Popover' },
      { id: 'dialog', to: '/dialog', label: 'Modal Dialog' },
      { id: 'confirm-dialog', to: '/confirm-dialog', label: 'Confirm Dialog' },
    ],
  },
  {
    id: 'forms',
    label: 'Forms',
    items: [
      { id: 'form', to: '/form', label: 'Form inputs' },
      { id: 'combobox', to: '/combobox', label: 'ComboBox' },
    ],
  },
  {
    id: 'feedback',
    label: 'Feedback',
    items: [
      { id: 'text', to: '/text', label: 'Chip, Callout & Toast' },
      { id: 'empty-message', to: '/empty-message', label: 'Empty message' },
      { id: 'skeleton', to: '/skeleton', label: 'Skeleton screens' },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    items: [
      { id: 'table', to: '/table', label: 'Table, Pagination & Filter' },
      { id: 'meter', to: '/meter', label: 'Meter & data colors' },
      { id: 'numbers', to: '/numbers', label: 'Numbers & Prices' },
      { id: 'pricing', to: '/pricing', label: 'Pricing Card' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      { id: 'md', to: '/markdown', label: 'Markdown' },
      { id: 'video', to: '/video', label: 'Video Player' },
    ],
  },
  {
    id: 'auth',
    label: 'Auth',
    items: [
      { id: 'auth', to: '/auth', label: 'Auth UI' },
    ],
  },
];

export const navList: MenuItem[] = navGroups.flatMap((group) => group.items);

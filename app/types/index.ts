import type { RouteLocationRaw } from 'vue-router';
import type Dialog from '../components/Dialog.vue';
import type MobileMenu from '../components/MobileMenu.vue';
import type Form from '../components/Form.vue';
import type Textarea from '../components/Textarea.vue';
import type Input from '../components/Input.vue';
import type FileInput from '../components/FileInput.vue';
import type Button from '../components/Button.vue';
import type Popover from '../components/Popover.vue';
import type MarkdownEditor from '../components/Markdown/MarkdownEditor.vue';
import type Tabs from '../components/Tabs.vue';
import type UserMenu from '../components/UserMenu.vue';

declare global {
  type Toast = {
    role?: 'status' | 'alert';
    color?: ToastColor;
    icon?: string;
    label?: string;
    text?: string;
    id?: string;
    timeout?: number;
    lines?: number;
    hideTimer?: boolean;
  };

  type ToastColor = 'blue' | 'green' | 'red' | 'orange' | 'accent';

  type TabOption = {
    value: string;
    label: string;
    disabled?: boolean;
    icon?: string;
  };

  type MenuItem = {
    id: string | number;
    label?: string;
    icon?: string;
    iconPos?: 'start' | 'end';
    showArrowIcon?: boolean;
    to?: RouteLocationRaw;
    path?: RouteLocationRaw;
    variant?: ButtonVariant;
    title?: string;
    href?: string;
    size?: string;
    permission?: string;
    feature?: string;
    tooltip?: string;
    tooltipIcon?: string;
    tooltipLabel?: string;
    disabled?: boolean;
    loading?: boolean;
    divider?: boolean;
    external?: boolean;
    download?: boolean;
    hideExternalIcon?: boolean;
    target?: string;
    onClick?: CallableFunction;
    items?: MenuItem[];
  };

  type DialogComponent = InstanceType<typeof Dialog>;
  type MobileMenuComponent = InstanceType<typeof MobileMenu>;
  type FormComponent = InstanceType<typeof Form>;
  type TextareaComponent = InstanceType<typeof Textarea>;
  type InputComponent = InstanceType<typeof Input>;
  type FileInputComponent = InstanceType<typeof FileInput>;
  type ButtonComponent = InstanceType<typeof Button>;
  type PopoverComponent = InstanceType<typeof Popover>;
  type MarkdownEditorComponent = InstanceType<typeof MarkdownEditor>;
  type TabsComponent = InstanceType<typeof Tabs>;
  type UserMenuComponent = InstanceType<typeof UserMenu>;

  type BaseColor =
    | 'default'
    | 'grey'
    | 'accent'
    | 'red'
    | 'orange'
    | 'yellow'
    | 'green'
    | 'blue'
    | 'purple'
    | 'pink';

  type BorderRadius = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'full';

  type Size =
    | 'xxxs'
    | 'xxs'
    | 'xs'
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | 'xxl'
    | 'xxxl'
    | 'xxxxl';

  type FontSize =
    'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl' | 'xxxxl';

  type ButtonSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'ghost'
    | 'ghost-green'
    | 'ghost-red'
    | 'outline'
    | 'outline-green'
    | 'outline-red'
    | 'tab'
    | 'cta'
    | 'black'
    | '3d'
    | 'white'
    | 'danger'
    | 'link'
    | 'green'
    | 'menu'
    | 'sidebar'
    | 'topbar';

  type ChipVariant = 'flat' | 'outline' | 'soft' | 'solid';

  /** The CSS text-transform keywords */
  type TextTransform = 'uppercase' | 'lowercase' | 'capitalize';
  type CalloutVariant = 'solid' | 'outline';
  type CardanLogoForm = 'full' | 'symbol' | 'tile';
  type CardanLogoVariant =
    'auto' | 'color' | 'negative' | 'white' | 'black' | 'purple';
  type TabsVariant = 'default' | 'minimal';
  type InputVariant = 'default' | 'minimal' | '3d';

  type InputSize = 'sm' | 'md' | 'lg';
  type TabsSize = 'xs' | 'sm' | 'md';

  type TableSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg';

  type ChipSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  type DialogPosition =
    'inline-start' | 'center' | 'inline-end' | 'block-start' | 'block-end';
  type MobileMenuPosition = 'inline-start' | 'inline-end';

  type DatePickerAriaLabels = {
    toggleOverlay?: string;
    menu?: string;
    input?: string;
    openTimePicker?: string;
    closeTimePicker?: string;
    incrementValue?: (type: 'hours' | 'minutes' | 'seconds') => string;
    decrementValue?: (type: 'hours' | 'minutes' | 'seconds') => string;
    openTpOverlay?: (type: 'hours' | 'minutes' | 'seconds') => string;
    amPmButton?: string;
    openYearsOverlay?: string;
    openMonthsOverlay?: string;
    nextMonth?: string;
    prevMonth?: string;
    nextYear: string;
    prevYear: string;
    day?: ({ value }: { value: Date }) => string;
    weekDay?: (day: number) => string;
    clearInput?: string;
    calendarIcon?: string;
    timePicker?: string;
    monthPicker: (overlay: boolean) => string;
    yearPicker: (overlay: boolean) => string;
    timeOverlay: (type: 'hours' | 'minutes' | 'seconds') => string;
  };

  type VideoMetaData = {
    width?: number;
    height?: number;
    thumbnail_width?: number;
    thumbnail_height?: number;
    title?: string;
    thumbnail_url?: string;
  };
}

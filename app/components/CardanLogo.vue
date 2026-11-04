<script setup lang="ts">
const {
  form = 'full',
  variant = 'auto',
  product = undefined,
  height = '1.25rem',
  narrowWidth = '9rem',
  label = undefined,
  round = false,
  decorative = false,
} = defineProps<{
  /** full: symbol and wordmark (default). symbol: symbol only. tile: color symbol on a white tile, for favicons, app icons and profile images; with variant 'white', a white symbol on a purple tile */
  form?: CardanLogoForm;
  /** auto: color logo in light mode, color-negative logo in dark mode */
  variant?: CardanLogoVariant;
  /** Sub-brand lockup after the full logo, e.g. 'academy' or 'auditor', shown with a capital */
  product?: string;
  /** Height of the logo (default 20px). The brand minimum is 18px, and 20px with a product */
  height?: string;
  /** Smallest width of a lockup with a product name (default 144px), so it fits next to the buttons of an app header at 320px. In a flex row the lockup takes the room it gets, from this width up to its height */
  narrowWidth?: string;
  /** Accessible name, defaults to "Cardan" plus the product */
  label?: string;
  /** Round tile, for avatars and favicons */
  round?: boolean;
  /** Hide the logo from assistive technology, e.g. next to a visible name */
  decorative?: boolean;
}>();

const computedLabel = computed(() => {
  if (label) return label;
  if (showProduct.value) return `Logo Cardan ${productText.value}`;
  return 'Logo Cardan';
});

// SVG user units: the logo is 40 units high (x) and 241.6 units wide
const LOGO_HEIGHT = 40.001;
const LOGO_WIDTH = 241.602;
// Brand lockup: a divider 1x high and 1.5px thick at a 20px logo, 0.6x space on either side
const DIVIDER_WIDTH = 3;
const PRODUCT_GAP = 24;
const DIVIDER_X = LOGO_WIDTH + PRODUCT_GAP;
const PRODUCT_X = DIVIDER_X + DIVIDER_WIDTH + PRODUCT_GAP;
// The product name is 0.8x, on the middle line of the logo. Its baseline is where a
// line box of 1x puts it in Hanken Grotesk (ascent 1, descent 0.3), as in the brand book
const PRODUCT_FONT_SIZE = 32;
const PRODUCT_BASELINE = 31.2;

const showProduct = computed(() => !!product && form === 'full');
// Always with a capital: 'academy' is shown as Academy
const productText = computed(() =>
  product ? `${product.charAt(0).toUpperCase()}${product.slice(1)}` : ''
);

// The product name is part of the SVG so the whole lockup scales as one image.
// Its width is estimated for server rendering and measured once fonts load.
const productTextRef = useTemplateRef<SVGTextElement>('productTextRef');
const productWidth = ref(productText.value.length * PRODUCT_FONT_SIZE * 0.55);

function measureProduct() {
  const width = productTextRef.value?.getComputedTextLength();
  if (width) productWidth.value = Math.ceil(width);
}

onMounted(() => {
  measureProduct();
  document.fonts?.ready.then(measureProduct);
  // A font that starts loading later, e.g. once the logo renders, changes the width again
  document.fonts?.addEventListener('loadingdone', measureProduct);
});

onBeforeUnmount(() => {
  document.fonts?.removeEventListener('loadingdone', measureProduct);
});

watch(productText, () => nextTick(measureProduct));

const viewBoxWidth = computed(() => {
  if (form !== 'full') return LOGO_HEIGHT;
  if (showProduct.value) return PRODUCT_X + productWidth.value;
  return LOGO_WIDTH;
});

const computedStyle = computed(() => ({
  '--logo-height': height,
  '--logo-ratio': viewBoxWidth.value / LOGO_HEIGHT,
  '--logo-narrow-width': showProduct.value ? narrowWidth : undefined,
}));
</script>

<template>
  <span
    :role="decorative ? undefined : 'img'"
    :aria-label="decorative ? undefined : computedLabel"
    :aria-hidden="decorative || undefined"
    :class="[
      'cardan-logo',
      `cardan-logo-form--${form}`,
      `cardan-logo-variant--${variant}`,
      showProduct && 'cardan-logo--product',
    ]"
    :style="computedStyle"
  >
    <svg
      v-if="form === 'tile'"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
    >
      <circle v-if="round" class="logo-tile" cx="20" cy="20" r="20" />
      <rect v-else class="logo-tile" width="40" height="40" rx="5" />
      <!-- Symbol at 56% of the tile, 60% in a round tile -->
      <g
        :transform="
          round ? 'translate(8 8) scale(0.6)' : 'translate(8.8 8.8) scale(0.56)'
        "
      >
        <path
          class="logo-link-green"
          transform="translate(15.195 0)"
          d="M 12.402 0 C 19.252 0 24.806 5.553 24.806 12.403 C 24.806 19.253 19.252 24.807 12.402 24.807 C 10.028 24.807 7.81 24.137 5.924 22.979 L 12.342 14.729 L 17.405 14.729 C 18.69 14.729 19.731 13.688 19.731 12.403 C 19.731 11.119 18.69 10.078 17.405 10.078 L 11.204 10.078 C 10.487 10.078 9.809 10.409 9.368 10.976 L 2.475 19.838 C 0.921 17.766 0 15.192 0 12.403 C 0 5.553 5.552 0 12.402 0 Z"
        />
        <path
          class="logo-link-purple"
          transform="translate(0 15.194)"
          d="M 12.403 0 C 15.061 0 17.522 0.839 19.541 2.263 L 13.465 10.077 L 8.4 10.077 C 7.116 10.077 6.075 11.119 6.075 12.403 C 6.075 13.688 7.116 14.729 8.4 14.729 L 14.602 14.729 C 15.319 14.728 15.997 14.397 16.438 13.831 L 22.802 5.646 C 24.068 7.591 24.807 9.91 24.807 12.403 C 24.807 19.253 19.253 24.807 12.403 24.807 C 5.553 24.807 0 19.253 0 12.403 C 0 5.553 5.553 0 12.403 0 Z"
        />
      </g>
    </svg>

    <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      :viewBox="`0 0 ${viewBoxWidth} ${LOGO_HEIGHT}`"
      aria-hidden="true"
      focusable="false"
    >
      <path
        class="logo-link-green"
        transform="translate(15.195 0)"
        d="M 12.402 0 C 19.252 0 24.806 5.553 24.806 12.403 C 24.806 19.253 19.252 24.807 12.402 24.807 C 10.028 24.807 7.81 24.137 5.924 22.979 L 12.342 14.729 L 17.405 14.729 C 18.69 14.729 19.731 13.688 19.731 12.403 C 19.731 11.119 18.69 10.078 17.405 10.078 L 11.204 10.078 C 10.487 10.078 9.809 10.409 9.368 10.976 L 2.475 19.838 C 0.921 17.766 0 15.192 0 12.403 C 0 5.553 5.552 0 12.402 0 Z"
      />
      <path
        class="logo-link-purple"
        transform="translate(0 15.194)"
        d="M 12.403 0 C 15.061 0 17.522 0.839 19.541 2.263 L 13.465 10.077 L 8.4 10.077 C 7.116 10.077 6.075 11.119 6.075 12.403 C 6.075 13.688 7.116 14.729 8.4 14.729 L 14.602 14.729 C 15.319 14.728 15.997 14.397 16.438 13.831 L 22.802 5.646 C 24.068 7.591 24.807 9.91 24.807 12.403 C 24.807 19.253 19.253 24.807 12.403 24.807 C 5.553 24.807 0 19.253 0 12.403 C 0 5.553 5.553 0 12.403 0 Z"
      />
      <g
        v-if="form === 'full'"
        class="logo-wordmark"
        transform="translate(50.796 2.626)"
      >
        <path
          d="M 0 16.857 C 0 7.211 7.211 0 16.713 0 C 21.202 0 25.261 1.767 28.508 5.062 L 24.497 9.455 C 22.157 7.163 19.674 6.017 16.713 6.017 C 11.031 6.017 6.781 10.649 6.781 16.857 C 6.781 22.969 11.126 27.649 16.713 27.649 C 19.722 27.649 22.253 26.455 24.879 23.781 L 28.986 28.126 C 25.357 31.899 21.393 33.666 16.713 33.666 C 7.211 33.666 0 26.455 0 16.857 Z"
        />
        <path
          d="M 56.347 33.188 L 53.768 26.455 L 39.633 26.455 L 37.055 33.188 L 30.513 33.188 L 43.645 0.478 L 50.043 0.478 L 63.176 33.188 L 56.347 33.188 Z M 41.83 20.772 L 51.572 20.772 L 46.701 8.213 L 41.83 20.772 Z"
        />
        <path
          d="M 67.712 33.188 L 67.712 0.478 L 78.552 0.478 C 85.524 0.478 90.395 4.25 90.395 10.315 C 90.395 14.565 88.151 17.525 84.712 19.053 L 92.305 33.188 L 85.381 33.188 L 78.743 20.677 L 74.111 20.677 L 74.111 33.188 L 67.712 33.188 Z M 78.791 14.851 C 81.895 14.851 83.805 13.132 83.805 10.553 C 83.805 8.022 81.895 6.303 78.791 6.303 L 74.111 6.303 L 74.111 14.851 L 78.791 14.851 Z"
        />
        <path
          d="M 97.371 33.188 L 97.371 0.478 L 106.635 0.478 C 118.192 0.478 125.211 6.59 125.211 16.857 C 125.211 27.076 118.192 33.188 106.635 33.188 L 97.371 33.188 Z M 106.874 27.219 C 114.276 27.219 118.478 23.447 118.478 16.857 C 118.478 10.219 114.324 6.447 106.874 6.447 L 103.914 6.447 L 103.914 27.219 L 106.874 27.219 Z"
        />
        <path
          d="M 152.412 33.188 L 149.834 26.455 L 135.699 26.455 L 133.12 33.188 L 126.578 33.188 L 139.71 0.478 L 146.109 0.478 L 159.241 33.188 L 152.412 33.188 Z M 137.895 20.772 L 147.637 20.772 L 142.766 8.213 L 137.895 20.772 Z"
        />
        <path
          d="M 184.502 33.188 L 169.986 10.888 L 169.986 33.188 L 163.778 33.188 L 163.778 0.478 L 170.081 0.478 L 184.598 22.778 L 184.598 0.478 L 190.806 0.478 L 190.806 33.188 L 184.502 33.188 Z"
        />
      </g>
      <template v-if="showProduct">
        <rect
          class="logo-product"
          :x="DIVIDER_X"
          :width="DIVIDER_WIDTH"
          :height="LOGO_HEIGHT"
        />
        <text
          ref="productTextRef"
          class="logo-product"
          :x="PRODUCT_X"
          :y="PRODUCT_BASELINE"
          :font-size="PRODUCT_FONT_SIZE"
        >
          {{ productText }}
        </text>
      </template>
    </svg>
  </span>
</template>

<style>
/*
 * The logo colors are fixed brand artwork, never themed: they are defined
 * here instead of in main.css so the logo works in every project.
 */
.cardan-logo {
  --logo-green: #008743;
  --logo-purple: #8e40b5;
  --logo-wordmark: #28242d;
  --logo-product: #28242d;
  --logo-tile: #fff;

  display: inline-block;
  vertical-align: middle;
  line-height: 0;

  svg {
    display: block;
    width: calc(var(--logo-height) * var(--logo-ratio));
    /* Never shrinks, also not through a max-width: 100% from a CSS reset */
    max-width: none;
    height: auto;
    /* Descenders in the product name (g, j, p, q, y) hang below the logo, like text */
    overflow: visible;
  }

  /* An app header at 320px has no room for the lockup at its height next to
     its buttons. The lockup takes the room it gets, from the narrow width (or
     its own width when smaller) up to its height, instead of a fixed size that
     pushes the header buttons out. Like an image with max-width: 100%, it
     shrinks in a flex row while its preferred size stays its full width. */
  &.cardan-logo--product {
    min-inline-size: min(
      var(--logo-narrow-width),
      calc(var(--logo-height) * var(--logo-ratio))
    );

    svg {
      max-width: 100%;
    }
  }

  /* The product name is brand artwork like the colors: always Hanken Grotesk,
     whatever font the project uses. @nuxt/fonts, registered by the layer,
     serves it from the project itself. */
  .logo-product {
    font-family: 'Hanken Grotesk', Arial, sans-serif;
    font-weight: 400;
    fill: var(--logo-product);
  }

  .logo-link-green {
    fill: var(--logo-green);
  }

  .logo-link-purple {
    fill: var(--logo-purple);
  }

  .logo-wordmark {
    fill: var(--logo-wordmark);
  }

  .logo-tile {
    fill: var(--logo-tile);
  }
}

/* Color-negative logo for dark backgrounds. The tile stays light: it is a favicon or app icon */
.cardan-logo-variant--negative,
.dark-mode .cardan-logo-variant--auto:not(.cardan-logo-form--tile) {
  --logo-green: #00a351;
  --logo-purple: #984abf;
  --logo-wordmark: #fff;
  --logo-product: #fff;
}

/* One-color logos, e.g. on photos. As a tile: white symbol on purple */
.cardan-logo-variant--white {
  --logo-green: #fff;
  --logo-purple: #fff;
  --logo-wordmark: #fff;
  --logo-product: #fff;
  --logo-tile: #8e40b5;
}

.cardan-logo-variant--black {
  --logo-green: #141413;
  --logo-purple: #141413;
  --logo-wordmark: #141413;
  --logo-product: #141413;
}

/* Purple symbol */
.cardan-logo-variant--purple {
  --logo-green: #8e40b5;
  --logo-purple: #8e40b5;
}
</style>

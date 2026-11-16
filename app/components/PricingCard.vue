<script setup lang="ts">
const {
  hTag = 'h3',
  buttonLabel = undefined,
  price = undefined,
  priceText = undefined,
  perText = undefined,
  recommended = false,
  buttonLink = undefined,
  featureList = [],
} = defineProps<{
  title: string;
  description: string;
  price?: number;
  priceText?: string;
  perText?: string;
  featureList?: { value: string | boolean; label: string }[];
  buttonLabel?: string;
  recommended?: boolean;
  hTag?: string;
  buttonLink?: string;
}>();

const emit = defineEmits<{
  click: [];
}>();

const { locale } = useI18n();

/** Whole euros in the app's language, the same on the server as in the browser */
const formattedPrice = computed(() =>
  price?.toLocaleString(locale.value, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }),
);
</script>

<template>
  <Card
    border-radius="lg"
    :border-color="recommended ? 'transparent' : 'grey-bg'"
    :class="['pricing-card', recommended && 'pricing-card--recommended']"
  >
    <div class="pricing-card-content">
      <component :is="hTag" class="title-wrapper">
        <span class="title">{{ title }}</span>

        <Chip
          v-if="recommended"
          :label="$t('general.recommended')"
          size="md"
          color="accent"
          class="recommended-chip"
        />
      </component>

      <p class="description">{{ description }}</p>

      <div class="price">
        <template v-if="price !== undefined || priceText">
          <span v-if="price !== undefined" class="price">{{ formattedPrice }}</span>

          <span v-else-if="priceText" class="price-text">{{ priceText }}</span>

          <span v-if="perText" class="per">{{ perText }}</span>
        </template>

        <span v-else>{{ $t('pricing.price-on-request') }}</span>
      </div>

      <ul class="feature-list" role="list">
        <li v-for="feature in featureList" :key="feature.label">
          <div class="list-item">
            <span class="text">{{ feature.label }}</span>
            <span class="visuallyhidden">
              ({{ $t(`aria.${feature.value ? 'yes' : 'no'}`) }})
            </span>

            <Icon
              :name="
                feature.value
                  ? 'material-symbols:check-circle-outline-rounded'
                  : 'material-symbols:do-not-disturb-on-outline-rounded'
              "
              :class="feature.value && 'has-feature'"
            />
          </div>
        </li>
      </ul>
    </div>

    <Button
      :label="buttonLabel"
      :variant="recommended ? 'primary' : 'outline'"
      :to="buttonLink"
      @click="emit('click')"
    />
  </Card>
</template>

<style>
.pricing-card {
  display: grid;
  height: 100%;
  container-type: inline-size;

  &.pricing-card--recommended {
    box-shadow: 0 0 8px 0px var(--color-accent-graphic);
  }

  .chip {
    background-color: var(--color-accent-bg);
  }

  .title-wrapper {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5em;
    margin-block-end: 0.75rem;
  }

  .title {
    font-size: var(--font-size-lg);
  }

  .description {
    margin-block-start: 0;
    margin-block-end: 1.25rem;
    font-size: var(--font-size-md);

    @container (min-width: 249px) {
      font-size: var(--font-size-md);
    }
  }

  .price {
    display: grid;
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-xxl);

    .per {
      font-weight: var(--font-weight-regular);
      font-size: var(--font-size-xs);
      color: var(--color-grey-text);
    }
  }

  .feature-list {
    color: var(--color-text);
    margin-block-start: 2.5rem;
    font-size: var(--font-size-xs);

    .list-item {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 1rem;
      margin-block-end: 0.75rem;

      .iconify {
        font-size: var(--font-size-lg);
        color: var(--color-grey-graphic);

        &.has-feature {
          color: var(--color-green);
        }
      }

      &::marker {
        color: var(--color-green);
      }
    }
  }

  .button {
    width: 100%;
    margin-block-start: 2.5rem;
    align-self: end;
    /* justify-self: end; */
  }
}
</style>

<script setup lang="ts">
useHead({ title: 'Skeleton loading screen' });

const skeletonAnimation = ref<'shimmer' | 'pulse'>('shimmer');

const skeletonAnimations = [
  {
    value: 'shimmer',
    label: 'shimmer',
  },
  {
    value: 'pulse',
    label: 'pulse',
  },
];

const rules = [
  {
    title: 'Decorative',
    text: 'A Skeleton is hidden from assistive technology: it says nothing by itself.',
  },
  {
    title: 'Say it is loading',
    text: 'The element it stands in for carries aria-busy="true".',
  },
  {
    title: 'In a table',
    text: 'Table renders its own placeholder rows with the skeleton prop.',
  },
];
</script>

<template>
  <div class="demo-page skeleton-page">
    <p class="demo-eyebrow">Feedback</p>
    <h1>Skeleton screens</h1>
    <p class="demo-lead">
      A placeholder in the shape of the content while a page loads, which makes
      the wait feel shorter. Background: Nielsen Norman Group on
      <Button
        to="https://www.nngroup.com/articles/skeleton-screens"
        label="skeleton screens"
        variant="link"
        target="_blank"
      />.
    </p>

    <ul role="list" class="demo-grid">
      <li v-for="rule in rules" :key="rule.title" class="demo-tile">
        <strong>{{ rule.title }}</strong>
        <span>{{ rule.text }}</span>
      </li>
    </ul>

    <section class="demo-section" aria-labelledby="skeleton-lines">
      <div class="section-topbar">
        <h2 id="skeleton-lines">Skeleton</h2>

        <Popover icon="material-symbols:settings-rounded" :max-width="480">
          <div class="popover-settings-content">
            <h2>Props</h2>

            <div class="props-wrapper">
              <Select
                v-model="skeletonAnimation"
                :options="skeletonAnimations"
                label="animation"
                size="sm"
              />

              <code>{{`<Skeleton animation="${skeletonAnimation}" />`}}</code>
            </div>
          </div>
        </Popover>
      </div>
      <p class="demo-hint">
        <code>size</code> sets the height and <code>width</code> takes any CSS
        width, <code>100%</code> by default. <code>animation</code> is
        <code>shimmer</code> (the default) or <code>pulse</code>, and changes
        every skeleton on this page.
      </p>

      <Card>
        <div class="skeleton-wrapper">
          <div class="flex-wrapper">
            <Skeleton :animation="skeletonAnimation" size="md" width="30%" />
            <span />
            <Skeleton :animation="skeletonAnimation" size="md" width="60px" />
            <Skeleton :animation="skeletonAnimation" size="md" width="70px" />
          </div>
          <Spacer size="sm" />

          <Skeleton :animation="skeletonAnimation" size="sm" width="90%" />
          <Skeleton :animation="skeletonAnimation" size="sm" />
          <Skeleton :animation="skeletonAnimation" size="sm" width="95%" />
          <Skeleton :animation="skeletonAnimation" size="sm" />
          <Skeleton :animation="skeletonAnimation" size="sm" width="60%" />

          <Spacer size="md" />
          <Skeleton :animation="skeletonAnimation" size="sm" width="20%" />

          <Spacer size="xxs" />
          <Skeleton :animation="skeletonAnimation" size="xs" width="90%" />
          <Skeleton :animation="skeletonAnimation" size="xs" width="95%" />
          <Skeleton :animation="skeletonAnimation" size="xs" width="50%" />
        </div>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="skeleton-circle">
      <h2 id="skeleton-circle">Circle variant</h2>
      <p class="demo-hint">
        <code>variant="circle"</code> makes a circle as wide and as high as its
        <code>size</code>, alone or next to lines.
      </p>

      <Card>
        <div class="circle-skeleton-wrapper">
          <div class="flex-wrapper">
            <Skeleton
              :animation="skeletonAnimation"
              size="xxl"
              variant="circle"
            />
            <Skeleton
              :animation="skeletonAnimation"
              size="xl"
              variant="circle"
            />
            <Skeleton
              :animation="skeletonAnimation"
              size="lg"
              variant="circle"
            />
            <Skeleton
              :animation="skeletonAnimation"
              size="md"
              variant="circle"
            />
            <Skeleton
              :animation="skeletonAnimation"
              size="sm"
              variant="circle"
            />
            <Skeleton
              :animation="skeletonAnimation"
              size="xs"
              variant="circle"
            />
            <Skeleton
              :animation="skeletonAnimation"
              size="xxs"
              variant="circle"
            />
          </div>

          <div class="flex-wrapper">
            <Skeleton
              :animation="skeletonAnimation"
              size="lg"
              variant="circle"
            />
            <div class="flex-wrapper">
              <Skeleton :animation="skeletonAnimation" size="sm" />
            </div>
          </div>

          <div class="flex-wrapper">
            <div class="flex-wrapper">
              <Skeleton
                :animation="skeletonAnimation"
                size="xl"
                variant="circle"
              />
              <div class="flex-wrapper">
                <Skeleton :animation="skeletonAnimation" size="md" />
                <Skeleton :animation="skeletonAnimation" size="md" />
              </div>
            </div>
          </div>

          <div class="flex-wrapper">
            <div class="flex-wrapper">
              <Skeleton
                :animation="skeletonAnimation"
                size="xxl"
                variant="circle"
              />
              <div class="flex-wrapper">
                <Skeleton :animation="skeletonAnimation" size="lg" />
                <Skeleton :animation="skeletonAnimation" size="lg" />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </section>
  </div>
</template>

<style>
.demo-page.skeleton-page {
  .section-topbar {
    margin-block-end: 0.5rem;

    > h2 {
      margin-block: 0;
    }
  }

  .popover-content {
    h2 {
      margin-block-end: 1rem;
    }
  }

  .card {
    margin-block-end: 0;
  }

  .skeleton-wrapper {
    display: grid;
    gap: 0.25rem;
  }

  .circle-skeleton-wrapper {
    display: grid;
    gap: 2rem;
  }
}
</style>

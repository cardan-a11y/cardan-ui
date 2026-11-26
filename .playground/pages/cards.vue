<script setup lang="ts">
useHead({ title: 'Cards & graphics' });

const deliverables = ['WCAG 2.2 report', 'Improvement plan', 'Statement'];

const steps = [
  {
    icon: 'material-symbols:explore-outline-rounded',
    title: 'Explore',
    text: 'Agree on the situation, the level of knowledge and the goals.',
  },
  {
    icon: 'material-symbols:fact-check-outline-rounded',
    title: 'Examine',
    text: 'Audits show where digital accessibility stands today.',
  },
  {
    icon: 'material-symbols:trending-up-rounded',
    title: 'Improve',
    text: 'Training and hands-on support for designers and developers.',
  },
  {
    icon: 'material-symbols:all-inclusive',
    title: 'Embed',
    text: 'Accessibility anchored in teams, processes and decisions.',
  },
];

const circles = [
  { tone: 'accent', label: 'Certificate', title: 'CPACC Preparation' },
  { tone: 'white', label: 'Light', title: 'The brand guide' },
  { tone: 'green-bg', label: 'Light green', title: 'Sector insights' },
];

const tintedPosts = [
  {
    tone: 'accent-bg',
    label: 'Webinar · 1:1',
    title: 'The EAA: what to arrange before June?',
  },
  {
    tone: 'secondary',
    label: 'Customer story · 1:1',
    title: 'From audit to two million customers',
  },
  {
    tone: 'green-bg',
    label: 'Academy · 1:1',
    title: 'CPACC training starts in January',
  },
];
</script>

<template>
  <div class="demo-page cards-page">
    <p class="demo-eyebrow">Brand</p>
    <h1>Cards & graphics</h1>
    <p class="demo-lead">
      Surface, line and circle. Flat and calm: a tint groups content, never a
      shadow.
    </p>

    <section class="demo-section" aria-labelledby="cards-surface">
      <h2 id="cards-surface">The surface</h2>
      <p class="demo-hint">
        A block has <code>--radius-xl</code>, a card inside it
        <code>--radius-lg</code>. A card on the page gets a 1px border, a tinted
        block none. On a tint, text and icons are <code>--color-text</code>.
      </p>

      <div class="demo-grid">
        <Card
          background-color="accent-bg"
          border-color="transparent"
          border-radius="xl"
        >
          <Icon name="material-symbols:account-balance-outline-rounded" />
          <h3>Government</h3>
          <p>Know where you stand with the law.</p>
          <Icon
            name="material-symbols:chevron-right-rounded"
            class="cards-end"
          />
        </Card>

        <Card
          background-color="secondary"
          border-color="transparent"
          border-radius="xl"
        >
          <Icon name="material-symbols:fact-check-outline-rounded" />
          <h3>Audits</h3>
          <p>A final verdict on your compliance, with a clear plan.</p>
          <Button
            variant="black"
            size="sm"
            label="Plan an audit"
            class="cards-end"
          />
        </Card>

        <Card
          background-color="green-bg"
          border-color="transparent"
          border-radius="xl"
        >
          <Icon name="material-symbols:checklist-rounded" />
          <h3>What you get</h3>
          <ul role="list">
            <li v-for="item in deliverables" :key="item">
              <Icon name="material-symbols:check-rounded" />
              {{ item }}
            </li>
          </ul>
        </Card>

        <Card border-radius="xl">
          <Icon name="material-symbols:trending-up-rounded" />
          <h3>Customer satisfaction</h3>
          <p class="cards-figure"><span>+</span>15%</p>
          <p class="cards-end cards-note">Sample data</p>
        </Card>
      </div>

      <pre><code>{{ `<Card background-color="accent-bg" border-color="transparent" border-radius="xl">` }}</code></pre>
    </section>

    <section class="demo-section" aria-labelledby="cards-line">
      <h2 id="cards-line">Block with a line</h2>
      <p class="demo-hint">
        For steps in a fixed order. No surface, no frame: a 1px line in
        <code>--color-grey-text</code> at the start of the text.
      </p>

      <ol role="list" class="demo-grid cards-steps">
        <li v-for="step in steps" :key="step.title">
          <Icon :name="step.icon" />
          <h3>{{ step.title }}</h3>
          <p>{{ step.text }}</p>
        </li>
      </ol>
    </section>

    <section class="demo-section" aria-labelledby="cards-circle">
      <h2 id="cards-circle">The circle</h2>
      <p class="demo-hint">
        One large circle, centred, a third to half of it in view. Always one
        tone darker than its surface: purple, green, their tints, beige or
        white. In the playground: <code>.brand-circle</code>.
      </p>

      <div class="demo-grid">
        <div
          v-for="circle in circles"
          :key="circle.tone"
          :class="['cards-art', 'brand-circle', `cards-art--${circle.tone}`]"
        >
          <span class="cards-art-label">{{ circle.label }}</span>
          <strong>{{ circle.title }}</strong>
        </div>
      </div>
    </section>

    <section class="demo-section" aria-labelledby="cards-examples">
      <h2 id="cards-examples">Examples</h2>
      <p class="demo-hint">
        A fixed structure: the label on top, the title 24px below it, the logo
        at the bottom. So the title starts in the same place everywhere.
      </p>

      <div class="demo-grid cards-posts">
        <div class="cards-art brand-circle cards-art--accent">
          <span class="cards-art-label">LinkedIn · 1:1</span>
          <strong>1 in 4 people gets stuck online.</strong>
          <CardanLogo variant="white" />
        </div>

        <div class="cards-art brand-circle cards-art--white">
          <CardanLogo />
          <div class="cards-art-stack">
            <Chip color="green" label="Certificate" size="sm" />
            <strong>CPACC Preparation</strong>
            <span>Cardan Academy</span>
          </div>
        </div>

        <div class="cards-art brand-circle cards-art--green light-mode">
          <span class="cards-art-label">Event · 1:1</span>
          <strong>The EAA in practice</strong>
          <CardanLogo variant="white" />
        </div>

        <div
          v-for="post in tintedPosts"
          :key="post.tone"
          :class="['cards-art', 'cards-art--tinted', `cards-art--${post.tone}`]"
        >
          <span class="cards-art-label">{{ post.label }}</span>
          <strong>{{ post.title }}</strong>
          <CardanLogo />
        </div>
      </div>
    </section>
  </div>
</template>

<style>
.cards-page {
  .demo-grid {
    --demo-column: 13rem;
  }

  .card {
    --card-padding-block: 1.75rem;
    --card-padding-inline: 1.75rem;

    display: flex;
    flex-direction: column;
    align-items: start;
    gap: 0.75rem;
    margin-block-end: 0;

    h3,
    p {
      margin-block: 0;
    }

    h3 {
      font-size: var(--font-size-lg);
    }

    > .iconify {
      font-size: var(--font-size-xl);
    }

    ul {
      display: grid;
      gap: 0.5rem;

      li {
        display: flex;
        gap: 0.5rem;
      }

      .iconify {
        flex: none;
        font-size: var(--font-size-md);
        block-size: 1lh;
      }
    }

    .cards-end {
      margin-block-start: auto;
    }

    .cards-figure {
      font-size: var(--font-size-xxxl);
      font-weight: var(--font-weight-bold);
      line-height: 1;

      span {
        color: var(--color-green-text);
      }
    }

    .cards-note {
      padding-block-start: 0.5rem;
      color: var(--color-grey-text);
      font-size: var(--font-size-sm);
    }
  }

  pre {
    margin-block: 1.5rem 0;
  }

  .cards-steps {
    gap: 1.5rem;

    li {
      display: grid;
      align-content: start;
      gap: 0.75rem;
      padding-inline: 2rem 1.5rem;
      border-inline-start: 1px solid var(--color-grey-text);
    }

    h3,
    p {
      margin-block: 0;
    }

    h3 {
      font-size: var(--font-size-xl);
    }

    .iconify {
      font-size: var(--font-size-xl);
    }
  }

  .cards-art {
    --brand-circle-color: color-mix(
      in srgb,
      var(--cards-art-bg),
      var(--color-text) 6%
    );

    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    aspect-ratio: 4 / 3;
    padding: 1.5rem;
    border-radius: var(--radius-xl);
    background-color: var(--cards-art-bg);
    line-height: var(--line-height-heading);

    strong {
      font-size: var(--font-size-xl);
    }

    .cards-art-label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
    }
  }

  .cards-art--accent {
    --cards-art-bg: var(--color-accent);
    --brand-circle-color: color-mix(in srgb, var(--color-accent), black 12%);

    color: var(--color-on-accent);
  }

  /* Fixed artwork, like the logo: white on dark green in both modes */
  .cards-art--green {
    --cards-art-bg: var(--color-green-text);
    --brand-circle-color: color-mix(in srgb, var(--color-green-text), black 12%);

    color: var(--color-white);
  }

  .cards-art--white {
    --cards-art-bg: var(--color-white);
  }

  .cards-art--accent-bg {
    --cards-art-bg: var(--color-accent-bg);
  }

  .cards-art--green-bg {
    --cards-art-bg: var(--color-green-bg);
  }

  .cards-art--secondary {
    --cards-art-bg: var(--color-secondary);
  }

  .cards-posts {
    --demo-column: 16rem;

    .cards-art {
      --brand-circle-size: 160%;
      --brand-circle-top: 66%;

      justify-content: space-between;
      aspect-ratio: 1;
      padding: 1.75rem;

      strong {
        max-inline-size: 90%;
        font-size: clamp(1.5rem, 2.4vw, 1.875rem);
        line-height: 1.15;
      }
    }

    .cards-art--tinted {
      justify-content: start;

      strong {
        margin-block-start: 1.125rem;
      }

      .cardan-logo {
        margin-block-start: auto;
      }
    }

    .cards-art-stack {
      display: grid;
      justify-items: start;
      gap: 0.625rem;

      span:last-child {
        color: var(--color-grey-text);
        font-size: var(--font-size-sm);
      }
    }
  }
}
</style>

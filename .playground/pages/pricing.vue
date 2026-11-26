<script setup lang="ts">
useHead({ title: 'Pricing' });
</script>

<template>
  <div class="demo-page pricing-page">
    <p class="demo-eyebrow">Data</p>
    <h1>Pricing</h1>
    <p class="demo-lead">
      PricingCard shows one plan: its name, its price, what it includes and one
      button.
    </p>

    <section class="demo-section" aria-labelledby="pricing-card">
      <h2 id="pricing-card">Pricing Card</h2>
      <p class="demo-hint">
        <code>price</code> is a number, shown as a whole amount in the language
        of the page; <code>price-text</code> shows a text in its place, and
        without either the card says the price is on request.
        <code>recommended</code> adds the chip and makes the button primary.
      </p>

      <ul class="pricing-notes">
        <li>
          A feature with <code>value: true</code> gets a check, one with
          <code>false</code> a minus, each with a hidden "yes" or "no" for
          screen readers.
        </li>
        <li>
          The title is an <code>h3</code>; <code>h-tag</code> sets another
          level.
        </li>
        <li>
          The button is a link with <code>button-link</code>, and emits
          <code>click</code>.
        </li>
      </ul>

      <ul role="list" class="pricing-cards-list">
        <li>
          <PricingCard
            title="Starter"
            description="Snel voldoen aan de eisen van digitale toegankelijkheid."
            :price="76"
            per-text="Per maand, jaarlijks gefactureerd"
            button-label="Start met Basis"
            :feature-list="[
              {
                value: true,
                label: 'Regelgeving',
              },
              {
                value: true,
                label: 'Automatische audit',
              },
              { value: true, label: 'Toegankelijkheidsverklaring' },
            ]"
          />
        </li>

        <li>
          <PricingCard
            recommended
            title="Plus"
            description="Werken aan digitale toegankelijkheid."
            :price="140"
            per-text="Per maand, jaarlijks gefactureerd"
            button-label="Ga verder met Plus"
            :feature-list="[
              {
                value: true,
                label: 'Alles van Starter',
              },
              {
                value: true,
                label: 'Audit rapportage',
              },
              { value: true, label: 'Probleemoplossing' },
              { value: true, label: '1 uur expert meeting/maand' },
            ]"
          />
        </li>

        <li>
          <PricingCard
            title="Pro"
            description="Complete oplossing, volledige digitale toegankelijkheid."
            :price="180"
            per-text="Per maand, jaarlijks gefactureerd"
            button-label="Ga verder met Pro"
            :feature-list="[
              {
                value: true,
                label: 'Alles van Plus',
              },
              {
                value: true,
                label: 'Volledige audit rapportage',
              },
              { value: true, label: 'Heronderzoeken' },
              { value: true, label: 'Toegankelijkheid updates' },
            ]"
          />
        </li>
      </ul>
    </section>

    <DevOnly>
      <section class="demo-section" aria-labelledby="pricing-table">
        <h2 id="pricing-table">Pricing Table</h2>
        <p class="demo-hint">
          A sketch on Table, a component of the playground and not of the
          layer. It shows in development only.
        </p>

        <Card>
          <PricingTable>
            <thead>
              <tr>
                <th scope="col">
                  <span class="visuallyhidden">Functionaliteit</span>
                </th>

                <th scope="col">
                  <div class="title">Monitor</div>

                  <div class="description">
                    Vanaf €500 per maand,<br />jaarlijks gefactureerd
                  </div>
                  <Button label="Start met Monitor" variant="outline" />
                </th>

                <th scope="col">
                  <div class="title">
                    Govern
                    <Chip label="Aanbevolen" color="accent" />
                  </div>

                  <div class="description">
                    Vanaf €1.500 per maand,<br />jaarlijks gefactureerd
                  </div>
                  <Button label="Ga verder met Govern" variant="primary" />
                </th>

                <th scope="col">
                  <div class="title">Partner</div>

                  <div class="description">
                    Vanaf €4.000 per maand,<br />jaarlijks gefactureerd
                  </div>
                  <Button label="Ga voor Partner" variant="outline" />
                </th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <th colspan="4" scope="rowgroup">Monitoring & Dashboarding</th>
              </tr>
              <tr>
                <th scope="row">Continue WCAG monitoring</th>
                <td><Icon name="material-symbols:check-circle-outline-rounded" /></td>
                <td><Icon name="material-symbols:check-circle-outline-rounded" /></td>
                <td><Icon name="material-symbols:check-circle-outline-rounded" /></td>
              </tr>
              <tr>
                <th scope="row">Accessibility dashboard</th>
                <td><Icon name="material-symbols:check-circle-outline-rounded" /></td>
                <td><Icon name="material-symbols:check-circle-outline-rounded" /></td>
                <td><Icon name="material-symbols:check-circle-outline-rounded" /></td>
              </tr>
              <tr>
                <th scope="row">Inzicht in toegankelijkheidsstatus</th>
                <td><Icon name="material-symbols:check-circle-outline-rounded" /></td>
                <td><Icon name="material-symbols:check-circle-outline-rounded" /></td>
                <td><Icon name="material-symbols:check-circle-outline-rounded" /></td>
              </tr>
              <tr>
                <th scope="row">Overzicht toegankelijkheidsproblemen</th>
                <td><Icon name="material-symbols:check-circle-outline-rounded" /></td>
                <td><Icon name="material-symbols:check-circle-outline-rounded" /></td>
                <td><Icon name="material-symbols:check-circle-outline-rounded" /></td>
              </tr>
              <tr>
                <th scope="row">Release monitoring (na updates)</th>
                <td><Icon name="material-symbols:cancel-outline-rounded" /></td>
                <td><Icon name="material-symbols:check-circle-outline-rounded" /></td>
                <td><Icon name="material-symbols:check-circle-outline-rounded" /></td>
              </tr>
            </tbody>

            <tbody>
              <tr>
                <th colspan="4" scope="rowgroup">Strategie & roadmap</th>
              </tr>
              <tr>
                <th scope="row">Prioritering van problemen</th>
                <td>Basis</td>
                <td>Geprioriteerd + roadmap</td>
                <td>Volledig strategisch gestuurd</td>
              </tr>
              <tr>
                <th scope="row">Concrete verbeter-roadmap</th>
                <td><Icon name="material-symbols:cancel-outline-rounded" /></td>
                <td><Icon name="material-symbols:check-circle-outline-rounded" /></td>
                <td><Icon name="material-symbols:check-circle-outline-rounded" /></td>
              </tr>
              <tr>
                <th scope="row">Strategische toegankelijkheidsplanning</th>
                <td><Icon name="material-symbols:cancel-outline-rounded" /></td>
                <td><Icon name="material-symbols:check-circle-outline-rounded" /></td>
                <td><Icon name="material-symbols:check-circle-outline-rounded" /></td>
              </tr>
              <tr>
                <th scope="row">Executive rapportages (management niveau)</th>
                <td><Icon name="material-symbols:cancel-outline-rounded" /></td>
                <td><Icon name="material-symbols:cancel-outline-rounded" /></td>
                <td><Icon name="material-symbols:check-circle-outline-rounded" /></td>
              </tr>
            </tbody>
          </PricingTable>
        </Card>
      </section>
    </DevOnly>
  </div>
</template>

<style>
.demo-page.pricing-page {
  .pricing-notes {
    margin-block: 0 1.5rem;
    color: var(--color-grey-text);
  }

  .pricing-cards-list {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;

    > li {
      flex: 1 1 15rem;
      max-inline-size: 22rem;

      &:not(:first-child) {
        .feature-list li:first-child {
          margin-block-end: 1.5rem;
          font-weight: var(--font-weight-medium);
          color: var(--color-accent-text);
        }
      }
    }
  }

  .card {
    margin-block-end: 0;
  }
}
</style>

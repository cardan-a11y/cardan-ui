<script setup lang="ts">
useHead({ title: 'Pricing' });
</script>

<template>
  <div class="pricing-page">
    <h1 class="visuallyhidden">Pricing</h1>
    <h2>Pricing Card</h2>

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

      <!-- <li>
        <PricingCard
          title="Enterprise"
          description="Maatwerk voor complexe digitale ecosystemen."
          price-text="Op maat"
          per-text="Jaarlijks gefactureerd"
          button-label="Neem contact op met sales"
          :feature-list="[
            {
              value: true,
              label: 'Alles van Pro',
            },
            {
              value: true,
              label: 'Consectetur adipiscing elit',
            },
            { value: true, label: 'Sed do eiusmod' },
            { value: true, label: 'Labore et dolore' },
          ]"
        />
      </li> -->
    </ul>

    <DevOnly>
      <Card style="margin-block-start: 4rem">
        <h2 class="visuallyhidden">Pricing Table</h2>

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
    </DevOnly>
  </div>
</template>

<style>
.pricing-page {
  h2 {
    margin-block-end: 2.5rem;
  }
}

.pricing-cards-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;

  > li {
    flex-basis: 300px;

    &:not(:first-child) {
      .feature-list li:first-child {
        margin-block-end: 1.5rem;
        font-weight: var(--font-weight-medium);
        color: var(--color-accent-text);
      }
    }
  }
}
</style>

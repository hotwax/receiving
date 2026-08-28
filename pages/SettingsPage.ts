import { type Locator, type Page } from '@playwright/test';

export class SettingsPage {
  readonly page: Page;
  readonly forceScanToggle: Locator;
  readonly receiveByFulfillmentToggle: Locator;
  readonly timeZoneSelect: Locator;
  readonly primaryProductIdentifierSelect: Locator;
  readonly secondaryProductIdentifierSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.forceScanToggle = page.locator('ion-toggle').filter({ hasText: /force scan|require scan/i })
      .or(page.locator('ion-item').filter({ hasText: /force scan|require scan/i }).locator('ion-toggle'))
      .or(page.getByTestId('settings-force-scan-toggle'))
      .first();
    this.receiveByFulfillmentToggle = page.locator('ion-toggle').filter({ hasText: /receive by fulfillment|fulfillment/i })
      .or(page.locator('ion-item').filter({ hasText: /receive by fulfillment|fulfillment/i }).locator('ion-toggle'))
      .or(page.getByTestId('settings-receive-by-fulfillment-toggle'))
      .first();
    this.timeZoneSelect = page.getByRole('heading', { name: 'Timezone' }).or(page.getByText(/Timezone|Time zone/i)).first();
    this.primaryProductIdentifierSelect = page.locator('dxp-product-identifier, [data-testid="settings-primary-product-id-select"]').first();
    this.secondaryProductIdentifierSelect = page.getByTestId('settings-secondary-product-id-select');
  }

  async goto() {
    await this.page.goto('/settings');
    await this.page.waitForLoadState('networkidle');
  }

  async getCurrentFacilityName(): Promise<string> {
    const facilityCard = this.page.locator('ion-card').filter({ hasText: /Specify which facility/i }).or(this.page.locator('ion-card').filter({ hasText: /Facility/i })).first();
    if (await facilityCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      const label = facilityCard.locator('ion-item ion-label').first();
      const text = await label.innerText().catch(() => '');
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      return lines[0] || '';
    }
    return '';
  }

  async openFacilityModal(): Promise<boolean> {
    const changeFacilityBtn = this.page.locator('#open-facility-modal, ion-button:has-text("Change")').first();
    if (await changeFacilityBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await changeFacilityBtn.click({ force: true });
      await this.page.waitForTimeout(1000);
      return true;
    }
    return false;
  }

  async isForceScanEnabled(): Promise<boolean> {
    const isCheckedAttr = await this.forceScanToggle.getAttribute('aria-checked');
    const hasClass = await this.forceScanToggle.getAttribute('class');
    return isCheckedAttr === 'true' || (hasClass !== null && hasClass.includes('toggle-checked'));
  }

  async setForceScan(enable: boolean) {
    const currentState = await this.isForceScanEnabled();
    if (currentState !== enable) {
      await this.forceScanToggle.click({ force: true });
      await this.page.waitForTimeout(800);
    }
  }

  async toggleForceScan(enable: boolean) {
    await this.setForceScan(enable);
  }

  async isReceiveByFulfillmentEnabled(): Promise<boolean> {
    const isCheckedAttr = await this.receiveByFulfillmentToggle.getAttribute('aria-checked');
    const hasClass = await this.receiveByFulfillmentToggle.getAttribute('class');
    return isCheckedAttr === 'true' || (hasClass !== null && hasClass.includes('toggle-checked'));
  }

  async setReceiveByFulfillment(enable: boolean) {
    const currentState = await this.isReceiveByFulfillmentEnabled();
    if (currentState !== enable) {
      await this.receiveByFulfillmentToggle.click({ force: true });
      await this.page.waitForTimeout(800);
    }
  }

  async toggleReceiveByFulfillment(enable: boolean) {
    await this.setReceiveByFulfillment(enable);
  }

  async setTimeZone(timeZone: string) {
    await this.timeZoneSelect.click();
    await this.page.getByRole('radio', { name: timeZone }).click();
    await this.page.getByRole('button', { name: 'OK' }).click();
  }
}

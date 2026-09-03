import { type Locator, type Page, expect } from '@playwright/test';

export class TransferOrderDetailPage {
  readonly page: Page;
  readonly backBtn: Locator;
  readonly allSegment: Locator;
  readonly openSegment: Locator;
  readonly completedSegment: Locator;
  readonly scanItemsInput: Locator;
  readonly scanBtn: Locator;
  readonly saveProgressBtn: Locator;
  readonly receiveAndCompleteBtn: Locator;
  readonly addProductBtn: Locator;
  readonly validationAlert: Locator;
  readonly itemCards: Locator;
  readonly progressBars: Locator;
  readonly unfulfilledItemsBanner: Locator;

  // Add Product modal locators
  readonly addProductModal: Locator;
  readonly addProductSearchInput: Locator;
  readonly addProductAddBtns: Locator;
  readonly addProductCloseBtn: Locator;

  // Discrepancy modal locators
  readonly discrepancyModal: Locator;
  readonly discrepancyRows: Locator;
  readonly discrepancyCheckboxes: Locator;
  readonly discrepancySaveBtn: Locator;
  readonly discrepancyCloseBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.backBtn = page.getByTestId('transfer-order-detail-page-back-btn')
      .or(page.locator('ion-back-button, ion-back-button button'))
      .first();
    this.allSegment = page.getByTestId('transfer-order-detail-page-all-tab').or(page.locator('ion-segment-button[value="all"]')).first();
    this.openSegment = page.getByTestId('transfer-order-detail-page-open-tab').or(page.locator('ion-segment-button[value="open"]')).first();
    this.completedSegment = page.getByTestId('transfer-order-detail-page-received-tab').or(page.locator('ion-segment-button[value="received"]')).first();
    this.scanItemsInput = page.getByTestId('transfer-order-detail-page-scan-input').locator('input').or(page.locator('ion-input[label*="Scan items"] input')).first();
    this.scanBtn = page.getByTestId('transfer-order-detail-page-scan-btn').or(page.locator('ion-button:has-text("Scan")')).first();
    this.saveProgressBtn = page.getByTestId('transfer-order-detail-page-save-progress-btn').or(page.locator('ion-button:has-text("Save Progress")')).first();
    this.receiveAndCompleteBtn = page.getByTestId('transfer-order-detail-page-receive-complete-btn').or(page.locator('ion-button:has-text("Receive and complete")')).first();
    this.addProductBtn = page.getByTestId('transfer-order-detail-page-add-product-btn')
      .or(page.locator('ion-header ion-buttons[slot="end"] ion-button').last())
      .first();
    this.validationAlert = page.locator('ion-alert, .alert-wrapper');
    this.itemCards = page.locator('main ion-card, ion-content ion-card, [data-testid*="item-card"]');
    this.progressBars = page.locator('ion-progress-bar');
    this.unfulfilledItemsBanner = page.locator('main ion-label').filter({ hasText: /Unfulfilled items/i });

    // Add Product Modal
    this.addProductModal = page.locator('ion-modal, [data-testid="transfer-order-add-product-modal-content"], ion-searchbar[data-testid="transfer-order-add-product-search-input"]')
      .filter({ hasText: /Add a product|Search SKU|Enter a SKU/i })
      .or(page.locator('ion-modal:visible'))
      .first();
    this.addProductSearchInput = page.getByTestId('transfer-order-add-product-search-input').locator('input')
      .or(page.locator('ion-modal ion-searchbar input'))
      .first();
    this.addProductAddBtns = page.locator('[data-testid^="transfer-order-add-product-add-btn-"], ion-button:has-text("Add to Transfer Order")');
    this.addProductCloseBtn = page.getByTestId('transfer-order-add-product-modal-close-btn')
      .or(page.locator('ion-modal ion-buttons ion-button:has([icon*="close"]), ion-modal ion-button:has-text("Close")'))
      .first();

    // Discrepancy Modal
    this.discrepancyModal = page.locator('ion-modal, .modal-wrapper')
      .filter({ hasText: /discrepancy|not received as expected|over received|Complete transfer order|Save receiving progress/i });
    this.discrepancyRows = page.locator('[data-testid^="transfer-order-receive-modal-discrepancy-row-"], ion-modal ion-list ion-item');
    this.discrepancyCheckboxes = page.locator('[data-testid^="transfer-order-receive-modal-discrepancy-checkbox-"], ion-modal ion-checkbox');
    this.discrepancySaveBtn = page.getByTestId('transfer-order-receive-modal-save-btn')
      .or(page.locator('ion-modal ion-footer ion-button'))
      .first();
    this.discrepancyCloseBtn = page.getByTestId('transfer-order-receive-modal-close-btn')
      .or(page.locator('ion-modal ion-header ion-button:has([icon*="arrow"])'))
      .first();
  }

  get confirmationAlert(): Locator {
    return this.page.locator('ion-alert, .alert-wrapper');
  }

  get alertProceedBtn(): Locator {
    return this.page.locator('ion-alert button').filter({ hasText: /Proceed|Confirm|Yes/i });
  }

  get alertCancelBtn(): Locator {
    return this.page.locator('ion-alert button').filter({ hasText: /Cancel|No/i });
  }

  get alertOkBtn(): Locator {
    return this.page.locator('ion-alert button').filter({ hasText: /Ok|OK|Dismiss/i });
  }

  get toastNotification(): Locator {
    return this.page.locator('ion-toast, .toast-wrapper, .toast-message');
  }

  async selectAllSegment() {
    const isSegmentVisible = await this.allSegment.isVisible({ timeout: 3000 }).catch(() => false);
    if (isSegmentVisible) {
      await this.allSegment.click({ force: true });
      await this.page.waitForTimeout(500);
    }
  }

  async selectOpenSegment() {
    const isSegmentVisible = await this.openSegment.isVisible({ timeout: 3000 }).catch(() => false);
    if (isSegmentVisible) {
      await this.openSegment.click({ force: true });
      await this.page.waitForTimeout(500);
    }
  }

  async selectCompletedSegment() {
    const isSegmentVisible = await this.completedSegment.isVisible({ timeout: 3000 }).catch(() => false);
    if (isSegmentVisible) {
      await this.completedSegment.click({ force: true });
      await this.page.waitForTimeout(500);
    }
  }

  async searchProduct(sku: string) {
    await this.scanItemsInput.fill(sku);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);
  }

  async simulateHidBarcodeScan(barcode: string) {
    await this.scanItemsInput.fill(barcode);
    await this.scanItemsInput.press('Enter');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(800);
  }

  async getReceiveAllBtnForFirstItem(): Promise<Locator> {
    return this.page.getByRole('button', { name: /Receive All/i }).or(this.page.locator('ion-button:has-text("Receive All")')).first();
  }

  async getQuantityInputForFirstItem(): Promise<Locator> {
    return this.page.getByRole('spinbutton', { name: /Qty/i }).or(this.page.locator('ion-input[label*="Qty"] input, input[type="number"]')).first();
  }

  async getOnHandChipForFirstItem(): Promise<Locator> {
    return this.page.getByText(/on hand/i).first();
  }

  async setQuantityForFirstItem(qty: number | string) {
    const qtyInput = this.page.locator('main ion-card ion-input input, input[type="number"], ion-input[label*="Qty"] input').first();
    await qtyInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await qtyInput.isVisible().catch(() => false)) {
      await qtyInput.click();
      await qtyInput.fill(qty.toString());
      await qtyInput.press('Enter');
      await qtyInput.dispatchEvent('input');
      await qtyInput.dispatchEvent('change');
      await this.page.waitForTimeout(500);
    }
  }

  async clickSaveProgress() {
    await this.saveProgressBtn.click({ force: true });
  }

  async saveProgressAndConfirm(): Promise<boolean> {
    await this.saveProgressBtn.click({ force: true });
    
    // Check if the confirmation alert ("Save progress and receive more later") appears
    const isAlertVisible = await this.confirmationAlert.isVisible({ timeout: 5000 }).catch(() => false);
    if (isAlertVisible) {
      const proceedBtn = this.alertProceedBtn.first();
      await proceedBtn.click({ force: true });
    }
    
    // Wait for network response or toast
    await this.page.waitForLoadState('networkidle').catch(() => {});
    return true;
  }

  async clickReceiveAndComplete() {
    await this.receiveAndCompleteBtn.click({ force: true });
  }

  async getOrderId(): Promise<string> {
    const url = this.page.url();
    const urlMatch = url.match(/\/transfer-order-detail\/([^\/\?]+)/);
    if (urlMatch && urlMatch[1]) {
      return decodeURIComponent(urlMatch[1]);
    }
    const overline = this.page.locator('.doc-id p.overline').first();
    await overline.waitFor({ timeout: 5000 }).catch(() => {});
    const text = await overline.textContent().catch(() => '');
    return text ? text.trim() : '';
  }

  async getOrderName(): Promise<string> {
    const titleLocator = this.page.locator('.doc-id h1, main .doc-id h1, h1').first();
    await titleLocator.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    for (let i = 0; i < 10; i++) {
      const text = await titleLocator.textContent().catch(() => '');
      const cleaned = text?.replace(/Transfer Order:\s*/i, '').replace(/[\n\r]+/g, ' ').trim() || '';
      if (cleaned.length > 0) {
        return cleaned;
      }
      await this.page.waitForTimeout(500);
    }
    return '';
  }

  async confirmDiscrepanciesAndSubmit(): Promise<boolean> {
    const isModalVisible = await this.discrepancyModal.isVisible({ timeout: 5000 }).catch(() => false);
    if (isModalVisible) {
      const checkboxes = this.page.locator('ion-modal ion-checkbox, [data-testid*="discrepancy-checkbox"]');
      const count = await checkboxes.count();
      for (let i = 0; i < count; i++) {
        const cb = checkboxes.nth(i);
        const isChecked = (await cb.getAttribute('aria-checked')) === 'true' || (await cb.getAttribute('checked')) !== null;
        if (!isChecked) {
          await cb.click({ force: true });
          await this.page.waitForTimeout(300);
        }
      }
      await this.page.waitForTimeout(1000);
      const saveBtn = this.discrepancySaveBtn;
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click({ force: true });
      }
      return true;
    }
    return false;
  }

  async getFirstItemReceivedQtyText(): Promise<string> {
    const label = this.page.locator('main ion-card, ion-content ion-card').first().locator('ion-label').filter({ hasText: /Received/i }).first();
    return (await label.textContent().catch(() => ''))?.replace(/\s+/g, ' ').trim() || '';
  }

  async getToastMessage(timeout = 5000): Promise<string> {
    const toast = this.page.locator('ion-toast, .toast-container, .toast-message, [role="alert"]').first();
    const isVisible = await toast.isVisible({ timeout }).catch(() => false);
    if (isVisible) {
      const text = await toast.textContent().catch(() => '');
      return text ? text.replace(/\s+/g, ' ').trim() : '';
    }
    return '';
  }

  async waitForReceiptApiResponse(action: () => Promise<any>, timeout = 12000): Promise<{ status: number; body: any; url: string }> {
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('receipts') || resp.url().includes('/transferOrders/'),
      { timeout }
    ).catch(() => null);

    await action();

    const response = await responsePromise;
    if (response) {
      const status = response.status();
      const body = await response.json().catch(() => null);
      const url = response.url();
      return { status, body, url };
    }
    return { status: 0, body: null, url: '' };
  }
  async fillAllEmptyQuantitiesWithZero() {
    const qtyInputs = this.page.locator('main ion-card ion-input input, input[type="number"]');
    const count = await qtyInputs.count();
    for (let i = 0; i < count; i++) {
      const input = qtyInputs.nth(i);
      const val = await input.inputValue();
      if (!val) {
        await input.fill('0');
        await input.dispatchEvent('input');
        await input.dispatchEvent('change');
      }
    }
    await this.page.waitForTimeout(500);
  }
}


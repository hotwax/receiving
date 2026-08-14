<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button data-testid="create-order-back-btn" slot="start" :default-href="`/transfer-orders`" />
        <ion-title>{{ translate("Create transfer order") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content id="filter-content">
      <div class="find">
        <section class="search">
          <ion-item>
            <ion-input :label="translate('Transfer name')" :placeholder="translate('Name')" v-model="currentOrder.name" />
          </ion-item>
        </section>

        <aside class="filters">
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Assign") }}</ion-card-title>
            </ion-card-header>
            <ion-item :lines="stores.length <= 1 ? 'inset' : undefined">
              <ion-icon :icon="storefrontOutline" slot="start" />
              <ion-select v-if="stores.length > 1" data-testid="create-order-store-select" value="" :label="translate('Product Store')" :placeholder="translate('Select')" interface="popover" v-model="currentOrder.productStoreId" @ionChange="productStoreUpdated()">
                <ion-select-option v-for="store in stores" :value="store.productStoreId" :key="store.productStoreId">{{ store.storeName ? store.storeName : store.productStoreId }}</ion-select-option>
              </ion-select>
              <template v-else>
                <ion-label data-testid="create-order-store-label">{{ translate('Product Store') }}</ion-label>
                <ion-label slot="end" data-testid="create-order-store-value">{{ stores[0].storeName ? stores[0].storeName : stores[0].productStoreId }}</ion-label>
              </template>
            </ion-item>
            <ion-item>
              <ion-icon :icon="sendOutline" slot="start" />
              <ion-label>{{ translate("Origin") }}</ion-label>
              <template v-if="currentOrder.originFacilityId" slot="end">
                <ion-chip data-testid="create-order-origin-chip" outline @click="openSelectFacilityModal('originFacilityId')">
                  {{ getFacilityName(currentOrder.originFacilityId) ? getFacilityName(currentOrder.originFacilityId) : currentOrder.originFacilityId }}
                </ion-chip>
              </template>
              <ion-button data-testid="create-order-origin-assign-btn" v-else slot="end" fill="outline" @click="openSelectFacilityModal('originFacilityId')">
                <ion-icon slot="start" :icon="addCircleOutline" />
                <ion-label>{{ translate("Assign") }}</ion-label>
              </ion-button>
            </ion-item>
            <ion-item lines="none">
              <ion-icon :icon="downloadOutline" slot="start" />
              <ion-label>{{ translate("Destination") }}</ion-label>
              <ion-label>{{ getFacilityName(currentOrder.destinationFacilityId) || currentOrder.destinationFacilityId }}</ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Shipping Method") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-select data-testid="create-order-carrier-select" :label="translate('Carrier')" :placeholder="translate('Select')" v-model="currentOrder.carrierPartyId" interface="popover" @ionChange="selectUpdatedMethod()">
                <ion-select-option :value="carrierPartyId" v-for="(carrierPartyId, index) in Object.keys(shipmentMethodsByCarrier)" :key="index">{{ getCarrierDesc(carrierPartyId) }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-select data-testid="create-order-method-select" :label="translate('Method')" :placeholder="translate('Select')" v-model="currentOrder.shipmentMethodTypeId" v-if="getCarrierShipmentMethods()?.length" interface="popover">
                <ion-select-option :value="shipmentMethod.shipmentMethodTypeId" v-for="(shipmentMethod, index) in getCarrierShipmentMethods()" :key="index">{{ shipmentMethod.description ? shipmentMethod.description : shipmentMethod.shipmentMethodTypeId }}</ion-select-option>
              </ion-select>
              <template v-else>
                <ion-icon :icon="informationCircleOutline" slot="start" />
                <ion-label>{{ translate("No shipment methods found") }}</ion-label>
              </template>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Plan") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-select data-testid="create-order-lifecycle-select" :label="translate('Lifecycle')" placeholder="Select" v-model="currentOrder.statusFlowId" interface="popover">
                <ion-select-option v-for="flow in statusFlows" :key="flow.statusFlowId" :value="flow.statusFlowId">{{ translate(flow.description) }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-label>{{ translate("Ship Date") }}</ion-label>
              <ion-button data-testid="create-order-shipdate-btn" slot="end" class="date-time-button" @click="openDateTimeModal('shipDate')">{{ currentOrder.shipDate ? formatDateTime(currentOrder.shipDate) : translate("Select date") }}</ion-button>
            </ion-item>
            <ion-item>
              <ion-label>{{ translate("Delivery Date") }}</ion-label>
              <ion-button data-testid="create-order-deliverydate-btn" slot="end" class="date-time-button" @click="openDateTimeModal('deliveryDate')">{{ currentOrder.deliveryDate ? formatDateTime(currentOrder.deliveryDate) : translate("Select date") }}</ion-button>
            </ion-item>
          </ion-card>

        </aside>

        <ion-modal class="date-time-modal" :is-open="dateTimeModalOpen" @didDismiss="closeDateTimeModal">
          <ion-content :force-overscroll="false">
            <ion-datetime
              :value="currentOrder[selectedDateFilter] ? currentOrder[selectedDateFilter] : DateTime.now().toISO()"
              :show-clear-button="true"
              show-default-buttons
              presentation="date"
              :min="currentOrder.shipDate ? currentOrder.shipDate : undefined"
              :max="currentOrder.deliveryDate ? currentOrder.deliveryDate : undefined"
              @ionChange="updateDateTimeFilter($event.detail.value)"
            />
          </ion-content>
        </ion-modal>

        <main>
          <ion-card class="add-items">
            <div class="mode">
              <h5 class="ion-margin-horizontal">{{ translate("Add items") }}</h5>
              <ion-segment v-model="mode" @ionChange="segmentChange($event.target.value as string)">
                <ion-segment-button value="scan">
                  <ion-icon :icon="barcodeOutline" />
                </ion-segment-button>
                <ion-segment-button value="search">
                  <ion-icon :icon="searchOutline" />
                </ion-segment-button>
              </ion-segment>
            </div>
            <div id="scan" v-show="mode === 'scan'">
              <ion-item lines="full">
                <ion-input ref="scanInput" v-model="queryString" :label="translate('Scan barcode')" :placeholder="barcodeIdentificationDesc[barcodeIdentifier] || barcodeIdentifier" @ionBlur="isScanningEnabled = false" @ionFocus="isScanningEnabled = true" @keyup.enter="queryString = $event.target.value; scanProduct()" />
              </ion-item>
              <ion-item lines="none" v-if="searchedProduct.productId">
                <ion-thumbnail slot="start">
                  <DxpShopifyImg :src="getProduct(searchedProduct.productId)?.mainImageUrl || searchedProduct.mainImageUrl" :key="getProduct(searchedProduct.productId)?.mainImageUrl || searchedProduct.mainImageUrl" />
                </ion-thumbnail>
                <ion-label>
                  {{ commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(searchedProduct.productId)) }}
                  <p>{{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(searchedProduct.productId)) ? commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(searchedProduct.productId)) : getProduct(searchedProduct.productId)?.internalName }}</p>
                  <p v-if="commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(searchedProduct.productId)) !== 'null'">{{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(searchedProduct.productId)) }}</p>
                </ion-label>
                <ion-icon v-if="!pendingProductIds.has(searchedProduct.productId)" :icon="checkmarkDoneOutline" color="success" slot="end" />
                <ion-spinner v-else name="crescent" slot="end" />
              </ion-item>

              <ion-item lines="none" v-else-if="searchedProduct.scannedId && !searchedProduct.productId">
                <ion-icon :icon="cloudOfflineOutline" slot="start" />
                <ion-label>
                  {{ searchedProduct.scannedId }} {{ translate("not found") }}
                  <p>{{ translate("Try searching using a keyword instead") }}</p>
                </ion-label>
                <ion-button size="small" slot="end" color="primary" @click="openAddProductModal">
                  <ion-icon slot="start" :icon="searchOutline" />
                  {{ translate("Search") }}
                </ion-button>
              </ion-item>

              <ion-item lines="none" v-else-if="!isScanningEnabled">
                <ion-thumbnail slot="start">
                  <DxpShopifyImg />
                </ion-thumbnail>
                <ion-label>
                  {{ translate("Your scanner isn’t focused yet.") }}
                  <p>{{ translate("Scanning is set to") }} {{ barcodeIdentificationDesc[barcodeIdentifier] || barcodeIdentifier }}</p>
                  <p v-if="barcodeIdentifier !== 'SKU'">{{ translate("Swap to SKU from the settings page") }}</p>
                </ion-label>
                <ion-button slot="end" color="warning" size="small" @click="enableScan">
                  <ion-icon slot="start" :icon="locateOutline" />
                  {{ translate("Focus scanning") }}
                </ion-button>
              </ion-item>

              <ion-item lines="none" v-else>
                <ion-thumbnail slot="start">
                  <DxpShopifyImg />
                </ion-thumbnail>
                <ion-label>
                  {{ translate("Begin scanning products to add them to this transfer") }}
                  <p>{{ translate("Scanning is set to") }} {{ barcodeIdentificationDesc[barcodeIdentifier] || barcodeIdentifier }}</p>
                  <p v-if="barcodeIdentifier !== 'SKU'">{{ translate("Swap to SKU from the settings page") }}</p>
                </ion-label>
                <ion-badge slot="end" color="success">{{ translate("start scanning") }}</ion-badge>
              </ion-item>
            </div>
            <div id="search" v-show="mode === 'search'">
              <ion-searchbar data-testid="search-product-input" ref="searchInput" v-model="queryString" :placeholder="translate('Search')" @ionClear="clearSearch" />

              <ion-item lines="none" v-if="isSearchingProduct">
                <ion-spinner name="crescent" />
              </ion-item>

              <ion-list lines="none" v-else-if="searchedProduct.productId">
                <ion-item>
                  <ion-thumbnail slot="start">
                    <DxpShopifyImg :src="searchedProduct.mainImageUrl" :key="searchedProduct.mainImageUrl" />
                  </ion-thumbnail>
                  <ion-label>
                    {{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(searchedProduct.productId)) ? commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(searchedProduct.productId)) : getProduct(searchedProduct.productId)?.internalName }}
                    <p v-if="commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(searchedProduct.productId)) !== 'null'">{{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(searchedProduct.productId)) }}</p>
                  </ion-label>
                  <template v-if="!isProductInOrder(searchedProduct.productId)">
                    <ion-button data-testid="add-to-transfer-btn" :disabled="pendingProductIds.has(searchedProduct.productId)" slot="end" fill="outline" @click="addSearchedOrderItem">
                      {{ pendingProductIds.has(searchedProduct.productId) ? translate("Adding...") : translate("Add to Transfer") }}
                    </ion-button>
                  </template>
                  <template v-else>
                    <ion-icon slot="end" :icon="checkmarkCircle" color="success" />
                  </template>
                </ion-item>
                <ion-item button v-if="productSearchCount > 1" data-testid="view-more-results" detail @click="openAddProductModal">
                  {{ translate("View more results", { count: productSearchCount - 1 }) }}
                </ion-item>
              </ion-list>

              <ion-list lines="none" v-else-if="queryString">
                <ion-item>
                  <ion-icon :icon="cloudOfflineOutline" slot="start" />
                  <ion-label>
                    {{ translate("No product found") }}
                    <p>{{ translate("Try a different keyword") }}</p>
                  </ion-label>
                </ion-item>
              </ion-list>

              <ion-item lines="none" v-else>
                <ion-icon :icon="shirtOutline" slot="start" />
                {{ translate("Search for products by their Parent name, SKU or UPC") }}
              </ion-item>
            </div>
          </ion-card>

          <hr />

          <div class="list-item" v-for="(item, index) in currentOrder.items" :key="index" :id="item.scannedId ? item.scannedId : commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))">
            <ion-item lines="none">
              <ion-thumbnail slot="start">
                <Image :src="getProduct(item.productId)?.mainImageUrl" />
              </ion-thumbnail>
              <ion-label>
                {{ commonUtil.getProductIdentificationValue(useProductStore().getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}
                <p>{{ commonUtil.getProductIdentificationValue(useProductStore().getProductIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
              </ion-label>
            </ion-item>
            <!-- <div class="tablet"></div> -->
            <ion-item>
              <ion-input type="number" :label="translate('Qty')" label-placement="floating" min="0" v-model="item.quantity" :clear-input="true" />
            </ion-item>
            <!-- <div class="tablet"></div> -->
            <ion-button slot="end" fill="clear" color="danger" @click="removeItem(item)">
              <ion-icon :icon="trashOutline" slot="icon-only" />
            </ion-button>
          </div>
          <div v-if="!currentOrder.items?.length" class="empty-state" data-testid="create-order-empty">
            <p>{{ translate("No item added to order") }}</p>
          </div>
        </main>
      </div>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button data-testid="create-order-submit-btn" @click="createOrder()">
          <ion-icon :icon="checkmarkDoneOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonBadge, IonButton, IonCard, IonCardHeader, IonCardTitle, IonChip, IonContent, IonDatetime, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonModal, IonPage, IonSearchbar, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonSpinner, IonThumbnail, IonTitle, IonToolbar, onIonViewDidEnter, modalController } from '@ionic/vue';
import { addCircleOutline, barcodeOutline, checkmarkCircle, checkmarkDoneOutline, cloudOfflineOutline, informationCircleOutline, locateOutline, searchOutline, sendOutline, shirtOutline, storefrontOutline, downloadOutline, trashOutline } from 'ionicons/icons';
import { computed, nextTick, ref, watch } from "vue";
import { commonUtil, DxpShopifyImg, emitter, logger, translate, useSolrSearch } from '@common';
import Image from '@/components/Image.vue';
import AddProductModal from '@/components/AddProductModal.vue';
import SelectFacilityModal from '@/components/SelectFacilityModal.vue';
import router from '@/router';
import { DateTime } from 'luxon';
import Actions from '@/authorization/actions';
import { useProductStore as useProduct } from "@/store/product";
import { useProductStore } from "@/store/productStore";
import { useTransferOrderStore } from "@/store/transferorder";
import { useUserStore as useAppUserStore } from "@/store/user";
import { useUtilStore } from "@/store/util";

const orderStore = useTransferOrderStore();
const product = useProduct();
const productStore = useProductStore();
const userStore = useAppUserStore();
const utilStore = useUtilStore();

let timeoutId = ref();
const isSearchingProduct = ref(false);
const searchedProduct = ref({}) as any;
const queryString = ref("");
const mode = ref("scan");
const isScanningEnabled = ref(false);
const lastScannedId = ref("");
const scanInput = ref("") as any;
const searchInput = ref("") as any;
const productSearchCount = ref(0);
const barcodeIdentificationDesc = ref({}) as any;
const pendingProductIds = ref(new Set()) as any;
const dateTimeModalOpen = ref(false);
const selectedDateFilter = ref("");
const currencyUom = ref("");
const currentOrder = ref<{
  name: string;
  productStoreId: string;
  originFacilityId: string;
  destinationFacilityId: string;
  carrierPartyId: string;
  shipmentMethodTypeId: string;
  items: any[];
  statusFlowId: string;
  shipDate: string;
  deliveryDate: string;
  [key: string]: any;
}>({
  name: "",
  productStoreId: "",
  originFacilityId: "",
  destinationFacilityId: "",
  carrierPartyId: "",
  shipmentMethodTypeId: "",
  items: [],
  statusFlowId: "TO_Receive_Only",
  shipDate: "",
  deliveryDate: ""
});
//TODO: In future when transfers app is migrated to Moqui, fetch the status flows using API
const statusFlows = [
  {
    statusFlowId: "TO_Fulfill_And_Receive",
    description: "Fulfill & Receive"
  },
  {
    statusFlowId: "TO_Fulfill_Only",
    description: "Fulfill only"
  },
  {
    statusFlowId: "TO_Receive_Only",
    description: "Receive only"
  }
]

const getProduct = computed(() => product.getProduct)
const barcodeIdentifier = computed(() => productStore.getBarcodeIdentifierPref)
const productIdentificationPref = computed(() => productStore.getProductIdentificationPref)
const shipmentMethodsByCarrier = computed(() => utilStore.getShipmentMethodsByCarrier)
const getCarrierDesc = computed(() => utilStore.getCarrierDesc)
const facilities = computed(() => productStore.getProductStoreFacilities)
const stores = computed(() => productStore.currentFacility.productStores)
// Implemented watcher to display the search spinner correctly. Mainly the watcher is needed to not make the findProduct call always and to create the debounce effect.
// Previously we were using the `debounce` property of ion-input but it was updating the searchedString and making other related effects after the debounce effect thus the spinner is also displayed after the debounce
// effect is completed.
watch(queryString, (value) => {
  if (mode.value === "scan") return;
  const searchedString = value?.trim();

  if (timeoutId.value) clearTimeout(timeoutId.value);
  if (!searchedString) {
    isSearchingProduct.value = false;
    searchedProduct.value = {};
    return;
  }

  isSearchingProduct.value = true;
  // Storing the setTimeoutId in a variable as watcher is invoked multiple times creating multiple setTimeout instance those are all called, but we only need to call the function once.
  timeoutId.value = setTimeout(() => {
    findProduct(searchedString);
  }, 800);
}, { deep: true })

onIonViewDidEnter(async () => {
  emitter.emit("presentLoader")
  const currentProductStoreId = (productStore.getCurrentProductStore as any)?.productStoreId || "";
  currentOrder.value.productStoreId = currentProductStoreId
  await Promise.allSettled([
    productStore.fetchAllProductStores(),
    currentProductStoreId ? productStore.fetchProductStoreFacilities(currentProductStoreId) : Promise.resolve(),
    utilStore.fetchStoreCarrierAndMethods(currentProductStoreId),
    utilStore.fetchCarriersDetail()
  ])
  await fetchProductStoreDetails(currentProductStoreId);
  await fetchBarcodeIdentificationDesc();
  if(Object.keys(shipmentMethodsByCarrier.value)?.length) {
    currentOrder.value.carrierPartyId = Object.keys(shipmentMethodsByCarrier.value)[0]
    selectUpdatedMethod()
  }

  currentOrder.value.destinationFacilityId = productStore.getCurrentFacility?.facilityId || ""
  emitter.emit("dismissLoader")
})

async function fetchProductStoreDetails(productStoreId: string) {
  try {
    const resp = await productStore.fetchProductStoreDetails({ productStoreId: productStoreId });
    if(!commonUtil.hasError(resp)) {
      currencyUom.value = resp.data.defaultCurrencyUomId;
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error(err);
  }
}

async function fetchBarcodeIdentificationDesc() {
  try {
    const resp = await product.fetchBarcodeIdentificationDesc({ parentTypeId: "HC_GOOD_ID_TYPE" });

    if (!commonUtil.hasError(resp) && resp.data?.length) {
      barcodeIdentificationDesc.value = resp.data.reduce((identifierDesc: any, identifier: any) => {
        identifierDesc[identifier.goodIdentificationTypeId] = identifier.description;
        return identifierDesc;
      }, {});
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error("Failed to fetch product identification descriptions", err);
  }
}

async function scanProduct() {
  const scannedId = queryString.value?.trim();
  if (!scannedId) return;
  queryString.value = "";

  if (timeoutId.value) {
    clearTimeout(timeoutId.value);
    timeoutId.value = null;
  }

  isSearchingProduct.value = true;
  const productFound: any = await findProduct(scannedId);
  if (productFound) {
    await addOrderItem(productFound, scannedId);
  }
}

async function addOrderItem(productToAdd: any, scannedId?: string) {
  if (!productToAdd?.productId) return;

  const alreadyAdded = findAndScrollToExisting(scannedId, productToAdd.productId);
  if (alreadyAdded) {
    queryString.value = "";
    return;
  }

  if (pendingProductIds.value.has(productToAdd.productId)) return;
  pendingProductIds.value.add(productToAdd.productId);

  try {
    let newProduct = {
      productId: productToAdd.productId,
      sku: productToAdd.sku,
      quantity: 0,
      isChecked: false,
      scannedId
    } as any;

    const stock = await fetchStock(newProduct.productId);
    if(stock?.qoh || stock?.qoh === 0) {
      newProduct = { ...newProduct, qoh: stock.qoh, atp: stock.atp };
    }

    currentOrder.value.items.push(newProduct);

    if (scannedId) {
      searchedProduct.value = { ...newProduct, productId: productToAdd.productId, mainImageUrl: productToAdd.mainImageUrl };
    } else {
      searchedProduct.value = {};
      queryString.value = "";
    }
  } catch (err) {
    searchedProduct.value = {};
    logger.error(`Failed to add product ${productToAdd.productId}:`, err);
  } finally {
    pendingProductIds.value.delete(productToAdd.productId);
  }
}

async function addSearchedOrderItem() {
  const productId = searchedProduct.value?.productId;
  if (!productId) return;
  await addOrderItem(getProduct.value(productId));
}

function isProductInOrder(productId: string) {
  return currentOrder.value.items?.some((item: any) => item.productId === productId);
}

function findAndScrollToExisting(identifier?: string, productId?: string) {
  const items = currentOrder.value.items || [];
  const existing = items.find((item: any) => {
    if (productId && item.productId === productId) return true;
    const idVal = item.scannedId ? item.scannedId : commonUtil.getProductIdentificationValue(barcodeIdentifier.value, getProduct.value(item.productId));
    return identifier && idVal === identifier;
  });

  if (existing) {
    scrollToProduct(existing);
    return true;
  }
  return false;
}

function scrollToProduct(item: any) {
  lastScannedId.value = item.scannedId ? item.scannedId : commonUtil.getProductIdentificationValue(barcodeIdentifier.value, getProduct.value(item.productId));
  const el = document.getElementById(item.scannedId ? item.scannedId : commonUtil.getProductIdentificationValue(barcodeIdentifier.value, getProduct.value(item.productId)));
  if (el) el.scrollIntoView({ behavior: "smooth" });
  setTimeout(() => lastScannedId.value = "", 3000);
}

function clearQuery() {
  queryString.value = "";
  searchedProduct.value = {};
}

function clearSearch() {
  queryString.value = "";
  searchedProduct.value = {};
}

async function enableScan() {
  mode.value = "scan";
  isScanningEnabled.value = true;
  setTimeout(() => {
    scanInput.value?.$el.setFocus?.();
  }, 0);
}

async function enableSearch() {
  mode.value = "search";
  await nextTick();
  searchInput.value?.$el.setFocus?.();
  isScanningEnabled.value = false;
}

function segmentChange(modeValue: string) {
  clearQuery();
  modeValue === "search" ? enableSearch() : isScanningEnabled.value = false;
}

async function openAddProductModal() {
  const addProductModal = await modalController.create({
    component: AddProductModal,
    componentProps: {
      query: searchedProduct.value.scannedId || queryString.value,
      addProductToQueue: (itemToAdd: any) => addOrderItem(itemToAdd.product),
      isProductInOrder,
      pendingProductIds: pendingProductIds.value
    }
  });

  addProductModal.onDidDismiss().then(async () => {
    queryString.value = "";
  });
  await addProductModal.present();
}

async function productStoreUpdated() {
  await productStore.fetchProductStoreFacilities(currentOrder.value.productStoreId)

  currentOrder.value.originFacilityId = "";
  if(currentOrder.value.items.length) refetchAllItemsStock()

  await utilStore.fetchStoreCarrierAndMethods(currentOrder.value.productStoreId);
  if(Object.keys(shipmentMethodsByCarrier.value)?.length) {
    currentOrder.value.carrierPartyId = Object.keys(shipmentMethodsByCarrier.value)[0]
    selectUpdatedMethod()
  }
}

function selectUpdatedMethod() {
  const shipmentMethods = getCarrierShipmentMethods()
  if(shipmentMethods?.length) currentOrder.value.shipmentMethodTypeId = shipmentMethods[0]?.shipmentMethodTypeId
}

function getCarrierShipmentMethods() {
  return currentOrder.value.carrierPartyId && shipmentMethodsByCarrier.value[currentOrder.value.carrierPartyId]
}

function getFacilityName(facilityId: any) {
  return facilities.value?.find((facility: any) => facility.facilityId === facilityId)?.facilityName
}

async function createOrder() {
  if(!currentOrder.value.items?.length) {
    commonUtil.showToast(translate("Please add atleast one item in the order."), { position: 'top' });
    return;
  }

  if(!currentOrder.value.name.trim()) {
    commonUtil.showToast(translate("Please give some valid transfer order name."), { position: 'top' })
    return;
  }

  if(!currentOrder.value.productStoreId || !currentOrder.value.originFacilityId || !currentOrder.value.destinationFacilityId || !currentOrder.value.carrierPartyId || !currentOrder.value.shipmentMethodTypeId) {
    commonUtil.showToast(translate("Please select all the required properties assigned to the order."), { position: 'top' })
    return;
  }

  if(currentOrder.value.originFacilityId === currentOrder.value.destinationFacilityId) {
    commonUtil.showToast(translate("Origin and destination facility can't be same."), { position: 'top' })
    return;
  }


  const isItemQuantityInvalid = currentOrder.value.items.some((item: any) => !Number(item.quantity) || Number(item.quantity) < 0)
  if(isItemQuantityInvalid) {
    commonUtil.showToast(translate("Order items must have a valid ordered quantity."), { position: 'top' })
    return;
  }

  if(!currentOrder.value.statusFlowId) {
    commonUtil.showToast(translate("Please select transfer order lifecycle."), { position: 'top' });
    return;
  }

  emitter.emit("presentLoader", { message: translate("Creating transfer order..."), backdropDismiss: false });

  const productIds = currentOrder.value.items?.map((item: any) => item.productId);
  const productAverageCostDetail = await utilStore.fetchProductsAverageCost(productIds, currentOrder.value.originFacilityId)

	const order = {
		orderName: currentOrder.value.name.trim(),
		orderTypeId: "TRANSFER_ORDER",
		customerId: "COMPANY",
		statusId: "ORDER_CREATED",
		productStoreId: currentOrder.value.productStoreId,
		statusFlowId: currentOrder.value.statusFlowId,
    currencyUom: currencyUom.value || 'USD',
		orderDate: DateTime.now().toFormat("yyyy-MM-dd HH:mm:ss.SSS"),
		entryDate: DateTime.now().toFormat("yyyy-MM-dd HH:mm:ss.SSS"),
		originFacilityId: currentOrder.value.originFacilityId,
    'org.apache.ofbiz.order.order.OrderStatus': {
      statusId: 'ORDER_CREATED',
      statusDatetime: DateTime.now().toMillis(),
      statusUserLogin: userStore.getUserProfile.username,
    },
		shipGroups: [
			{
				shipGroupSeqId: "00001",
				facilityId: currentOrder.value.originFacilityId,
				orderFacilityId: currentOrder.value.destinationFacilityId,
				carrierPartyId: currentOrder.value.carrierPartyId,
				shipmentMethodTypeId: currentOrder.value.shipmentMethodTypeId,
				estimatedShipDate: currentOrder.value.shipDate? DateTime.fromISO(currentOrder.value.shipDate).toFormat("yyyy-MM-dd 23:59:59.000") : "",
				estimatedDeliveryDate: currentOrder.value.deliveryDate ? DateTime.fromISO(currentOrder.value.deliveryDate).toFormat("yyyy-MM-dd 23:59:59.000"): "",
				items: currentOrder.value.items.map((item: any) => {
					return {
						orderItemTypeId: "PRODUCT_ORDER_ITEM",
						productId: item.productId,
						sku: item.sku,
						statusId: "ITEM_CREATED",
						quantity: Number(item.quantity),
						unitPrice: productAverageCostDetail[item.productId] || 0.0,
					}
				})
			}]
	} as any;

  let grandTotal = 0;
  order.shipGroups[0].items.map((item: any) => {
    grandTotal += Number(item.quantity) * Number(item.unitPrice)
  })

  order["grandTotal"] = grandTotal

  const addresses = await productStore.fetchFacilityAddresses([currentOrder.value.originFacilityId, currentOrder.value.destinationFacilityId])
  addresses.map((address: any) => {
    if(address.facilityId === currentOrder.value.originFacilityId) {
      order.shipGroups[0].shipFrom = {
        postalAddress: {
          id: address.contactMechId
        }
      }
    }
    if(address.facilityId === currentOrder.value.destinationFacilityId) {
      order.shipGroups[0].shipTo = {
        postalAddress: {
          id: address.contactMechId
        }
      }
    }
  })

  try {
    const resp = await orderStore.createOrder({ payload: order })
    if(!commonUtil.hasError(resp)) {
      commonUtil.showToast(translate("Order has been created and sent for admin approval"))
      router.replace("/transfer-orders")
      emitter.emit("dismissLoader")
    } else {
      throw resp.data;
    }
  } catch(error: any) {
    logger.error(error)
    emitter.emit("dismissLoader")
    commonUtil.showToast(translate("Failed to create order."), { position: 'top' })
  }
}

function removeItem(selectedItem: any) {
  currentOrder.value.items = currentOrder.value.items.filter((item: any) => selectedItem.productId !== item.productId)
}

async function openSelectFacilityModal(facilityType: any) {
  const addressModal = await modalController.create({
    component: SelectFacilityModal,
    componentProps: { selectedFacilityId: currentOrder.value[facilityType], facilities: facilities.value }
  })

  addressModal.onDidDismiss().then(async(result: any) => {
    if(result.data?.selectedFacilityId) {
      currentOrder.value[facilityType] = result.data.selectedFacilityId
      if(facilityType === "originFacilityId") {
        if(currentOrder.value.items.length) refetchAllItemsStock()
      }
    }
  })

  addressModal.present()
}

async function refetchAllItemsStock() {
  emitter.emit("presentLoader", { message: "Updating items...", backdropDismiss: false });
  const responses = await Promise.allSettled(currentOrder.value.items.map((item: any) => fetchStock(item.productId)))
  currentOrder.value.items.map((item: any, index: any) => {
    if(responses[index].status === "fulfilled") {
      item["qoh"] = responses[index]?.value?.qoh
      item["atp"] = responses[index]?.value?.atp
    }
  })
  emitter.emit("dismissLoader")
}

async function findProduct(value: string) {
  if (!value) {
    isSearchingProduct.value = false;
    return null;
  }

  try {
    const payload: any = {
      filters: {},
      viewSize: 1
    };

    if (mode.value === "scan") {
      payload.filters["goodIdentifications"] = { value: `${barcodeIdentifier.value}/${value}` };
    } else {
      payload.keyword = value;
    }
    const resp = await useSolrSearch().searchProducts(payload);

    if (resp.total) {
      productSearchCount.value = resp.total;
      const item = resp.products[0];
      product.addProductToCached(item);
      searchedProduct.value = { productId: item.productId, mainImageUrl: item.mainImageUrl };
      isSearchingProduct.value = false;
      return item;
    } else {
      searchedProduct.value = { scannedId: value };
      isSearchingProduct.value = false;
      return null;
    }
  } catch (err) {
    logger.error(err);
    searchedProduct.value = {};
    isSearchingProduct.value = false;
  }
}

async function fetchStock(productId: string) {
  try {
    const resp: any = await utilStore.getInventoryAvailableByFacility({
      productId,
      facilityId: currentOrder.value.originFacilityId
    });

    if(!commonUtil.hasError(resp)) {
      return resp.data;
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error(err)
    return null;
  }
}

function formatDateTime(date: any) {
  const dateTime = DateTime.fromISO(date);
  return commonUtil.getDateWithOrdinalSuffix(dateTime.toMillis());
}

function updateDateTimeFilter(value: any) {
  currentOrder.value[selectedDateFilter.value] = value;
}

function closeDateTimeModal() {
  dateTimeModalOpen.value = false;
  selectedDateFilter.value = "";
}

function openDateTimeModal(type: any) {
  dateTimeModalOpen.value = true;
  selectedDateFilter.value = type;
}
</script>

<style scoped>
.list-item {
  --columns-desktop: 5;
  border-bottom: var(--border-medium);
}

/* Added width property as after updating to ionic7 min-width is getting applied on ion-label inside ion-item
which results in distorted label text and thus reduced ion-item width */
.list-item > ion-item {
  width: 100%;
}

.item-qty-actions {
  grid-column: span 2;
}

.find > .filters{
  display: unset;
}

.date-time-modal {
  --width: 320px;
  --height: 400px;
  --border-radius: 8px;
}

.pointer {
  cursor: pointer;
}

.add-items .mode {
  display: flex;
}

.add-items .mode ion-segment {
  grid-auto-columns: minmax(auto, 150px);
  justify-content: start;
  flex: 0 1 max-content;
}

@media (min-width: 991px) {
  .find {
    margin-right: 0;
  }
}
</style>

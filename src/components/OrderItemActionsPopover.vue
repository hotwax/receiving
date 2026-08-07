<template>
  <ion-content>
    <ion-list>
      <ion-list-header v-if="item?.productId" data-testid="order-item-actions-popover-header">{{ commonUtil.getProductIdentificationValue(useProductStore().getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}</ion-list-header>
      <ion-item button @click="handleItemAction('bookQOH')" data-testid="order-item-action-book-qoh">
        {{ translate("Book QoH") }}
      </ion-item>
      <ion-item button @click="handleItemAction('bookATP')" data-testid="order-item-action-book-atp">
        {{ translate("Book ATP") }}
      </ion-item>
      <ion-item button lines="none" @click="handleItemAction('remove')" data-testid="order-item-action-remove">
        {{ translate("Remove from order") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonContent, IonItem, IonList, IonListHeader, popoverController } from "@ionic/vue"
import { commonUtil, translate } from "@common"
import { computed , defineProps } from "vue";
import { useProductStore as useProduct } from "@/store/product";
import { useProductStore } from "@/store/productStore";

defineProps(["item"]);
const getProduct = computed(() => useProduct().getProduct)

function handleItemAction(action: string) {
  popoverController.dismiss({ action })
}
</script>

import { showToast as utilShowToast } from '@common/utils/core';
import { defineStore } from "pinia";
import { default as api } from '@common/core/remoteApi';
import { default as emitter } from '@common/core/emitter';
import { translate } from '@common/core/i18n';
import { useProductStore } from "@/store/productStore";

export const useShipmentStore = defineStore("shipment", {
  actions: {
    async receiveReturnShipment(payload: any) {
      emitter.emit("presentLoader");
      const productStore = useProductStore();
      const itemsToReceive = payload.isMultiReceivingEnabled
        ? payload.items
        : payload.items.filter((item: any) => item.quantityReceived === 0);
      const items = itemsToReceive.map((item: any) => {
        return {
          shipmentItemSeqId: item.itemSeqId,
          productId: item.productId,
          quantityAccepted: item.quantityAccepted,
          orderId: item.orderId,
          orderItemSeqId: item.orderItemSeqId,
          unitCost: 0.0,
          locationSeqId: item.locationSeqId,
        };
      });

      try {
        const resp = await api({
          url: `oms/returnShipments/${payload.shipmentId}/receive`,
          method: "POST",
          data: {
            shipmentId: payload.shipmentId,
            items,
            facilityId: productStore.getCurrentFacility.facilityId
          }
        });

        if (resp && resp?.status === 200) {
          emitter.emit("dismissLoader");
          return true;
        }
      } catch (err) {
        utilShowToast(translate("Something went wrong, please try again"));
      }
      emitter.emit("dismissLoader");
      return false;
    },
  },
});

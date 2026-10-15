import { defineStore } from "pinia";
import { api, commonUtil, emitter, logger, translate } from "@common";
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

        if (resp?.status === 200 && !commonUtil.hasError(resp)) {
          emitter.emit("dismissLoader");
          return true;
        } else {
          throw resp;
        }
      } catch (err) {
        const serverError = commonUtil.getErrorMessage(err, translate("Please contact administrator."));
        logger.error("Failed to receive return shipment", serverError);
        commonUtil.showToast(`${translate("Failed to receive return shipment.")} ${serverError}`);
      }
      emitter.emit("dismissLoader");
      return false;
    },
  },
});

import { defineStore } from "pinia";
import { api, commonUtil } from "@common";

export const usePartyStore = defineStore("party", {
  state: () => ({
    namesByLoginId: {} as any,
  }),
  getters: {},
  actions: {
    async getReceiversDetails(receiversLoginIds: any) {
      const unavailableReceiversLoginIds = receiversLoginIds.filter((receiversLoginId: any) => !this.namesByLoginId[receiversLoginId]);

      if (!unavailableReceiversLoginIds.length) return this.namesByLoginId;

      let resp: any;
      const params = {
        userLoginId: unavailableReceiversLoginIds,
        userLoginId_op: "in",
        pageSize: unavailableReceiversLoginIds.length
      };
      try {
        resp = await api({
          url: "oms/users",
          method: "GET",
          params: params,
        });
        if (resp.status == 200 && !commonUtil.hasError(resp) && resp.data.length > 0) {
          const receiversDetails = resp.data;

          receiversDetails.forEach((receiverDetails: any) => {
            receiverDetails.fullName = [receiverDetails.firstName, receiverDetails.lastName].filter(Boolean).join(" ");
            this.namesByLoginId[receiverDetails.userLoginId] = receiverDetails;
          });
        } else {
          console.error(resp);
        }
      } catch (err) {
        console.error(err);
      }
      return this.namesByLoginId;
    },
    async resetReceiversDetails() {
      this.namesByLoginId = {};
    },
  },
  persist: true,
});

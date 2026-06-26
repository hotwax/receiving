import { defineStore } from "pinia";
import { api, commonUtil } from "@common";

export const useUtilStore = defineStore("util", {
  state: () => ({
    status: {} as any,
  }),
  getters: {
    getStatusDesc: (state) => (statusId: string) => state.status[statusId],
  },
  actions: {
    async fetchStatus(statusIds: Array<string>) {
      const cachedStatus = JSON.parse(JSON.stringify(this.status));
      const statusIdFilter = statusIds.reduce((filter: Array<string>, statusId: any) => {
        if (!cachedStatus[statusId]) {
          filter.push(statusId);
        }
        return filter;
      }, []);

      if (statusIdFilter.length <= 0) return cachedStatus;

      try {
        const resp = await api({
          url: "admin/status",
          method: "GET",
          params: {
            pageSize: statusIdFilter.length,
            statusId: statusIdFilter,
            statusId_op: "in",
          },
        });
        if (resp.status === 200 && !commonUtil.hasError(resp) && resp.data.length > 0) {
          const statuses = resp.data;
          statuses.reduce((cached: any, status: any) => {
            cached[status.statusId] = status.description;
            return cached;
          }, cachedStatus);
          this.status = cachedStatus;
        }
      } catch (err) {
        console.error("Something went wrong while fetching status");
      }
      return cachedStatus;
    },
  },
  persist: true,
});

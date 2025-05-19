export default interface TransferOrderState {
  transferOrder: {
    list: any,
    total: number,
    query: {
      viewIndex: number,
      viewSize: any,
      queryString: string,
      selectedShipmentMethods: Array<string>,
      selectedStatuses: Array<string>
    }
  },
  current: any
}
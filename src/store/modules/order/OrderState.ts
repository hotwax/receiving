export default interface OrderState {
  purchaseOrders: {
    list: any;
    total: number;
  },
  current: {
    orderId: string;
    externalOrderId: string;
    items: []
  }
}
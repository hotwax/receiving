export default interface ProductState {
  cached: any;
  list: {
    total: number;
    items: any[];
  }
  searchedProduct: any[]
}
import { Product } from '@/adapter'

export default interface ProductState {
  cached: any;
  list: {
    total: number;
    items: Array<Product>;
  }
}
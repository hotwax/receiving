import { translate } from '@hotwax/dxp-components'
import store from '@/store'
import { loadingController } from '@ionic/vue'
import { ProductService } from '@/services/ProductService';

const login = async (payload: any) => store.dispatch('user/login', payload);

const logout = async (payload: any) => store.dispatch('user/logout', payload);

const fetchProducts = async (payload: any) => ProductService.fetchProducts(payload)

const loader = {
  value: null as any,
  present: async (message: string) => {
    if (!loader.value) {
      loader.value = await loadingController
        .create({
          message: translate(message),
          translucent: false,
          backdropDismiss: false
        });
    }
    loader.value.present();
  },
  dismiss: () => {
    if (loader.value) {
      loader.value.dismiss();
      loader.value = null as any;
    }
  }
}

export {
  fetchProducts,
  login,
  loader,
  logout
}
import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Shipments from '@/views/Shipments.vue'
import ShipmentDetails from '@/views/ShipmentDetails.vue'
import Settings from "@/views/Settings.vue"
import PurchaseOrders from "@/views/PurchaseOrders.vue"
import PurchaseOrderDetail from "@/views/PurchaseOrderDetail.vue"
import store from '@/store'
import Shopify from '@/views/Shopify.vue'
import Returns from '@/views/Returns.vue'
import ReturnDetails from '@/views/ReturnDetails.vue'
import TransferOrders from '@/views/TransferOrders.vue';
import TransferOrderDetail from '@/views/TransferOrderDetail.vue';

import { hasPermission } from '@/authorization';
import { showToast } from '@/utils'

import 'vue-router'
import { DxpLogin, translate, useAuthStore } from '@hotwax/dxp-components';
import { loader } from '@/user-utils';

// Defining types for the meta values
declare module 'vue-router' {
  interface RouteMeta {
    permissionId?: string;
  }
}

const authGuard = async (to: any, from: any, next: any) => {
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated || !store.getters['user/isAuthenticated']) {
    await loader.present('Authenticating')
    // TODO use authenticate() when support is there
    const redirectUrl = window.location.origin + '/login'
    window.location.href = `${process.env.VUE_APP_LOGIN_URL}?redirectUrl=${redirectUrl}`
    loader.dismiss()
  }
  next()
};

const loginGuard = (to: any, from: any, next: any) => {
  const authStore = useAuthStore()
  if (authStore.isAuthenticated && !to.query?.token && !to.query?.oms) {
    next('/')
  }
  next();
};

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/shipments'
  },
  {
    path: '/shipments',
    name: 'Shipments',
    component: Shipments,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_SHIPMENTS_VIEW"
    }
  },
  {
    path: '/shipment/:id',
    name: 'ShipmentDetails',
    component: ShipmentDetails,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_SHIPMENT_DETAIL_VIEW"
    }
  },
  {
    path: '/login',
    name: 'DxpLogin',
    component: DxpLogin,
    beforeEnter: loginGuard
  },
  {
    path: "/settings",
    name: "Settings",
    component: Settings,
    beforeEnter: authGuard
  },
  {
    path: '/purchase-orders',
    name: 'PurchaseOrders',
    component: PurchaseOrders,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_PURCHASEORDERS_VIEW"
    }
  },
  {
    path: "/purchase-order-detail/:slug",
    name: "PurchaseOrderDetail",
    component: PurchaseOrderDetail,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_PURCHASEORDER_DETAIL_VIEW"
    }
  },
  {
    path: '/shopify',
    name: 'Shopify',
    component: Shopify
  },
  {
    path: '/returns',
    name: 'Returns',
    component: Returns,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_RETURNS_VIEW"
    }
  },
  {
    path: '/return/:id',
    name: 'ReturnDetails',
    component: ReturnDetails,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_RETURN_DETAIL_VIEW"
    }
  },
  {
    path: '/transfer-orders',
    name: 'TransferOrders',
    component: TransferOrders,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_TRANSFERORDERS_VIEW"
    }
  },
  {
    path: "/transfer-order-detail/:slug",
    name: "TransferOrderDetail",
    component: TransferOrderDetail,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_TRANSFERORDER_DETAIL_VIEW"
    }
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})


router.beforeEach((to, from) => {
  if (to.meta.permissionId && !hasPermission(to.meta.permissionId)) {
    let redirectToPath = from.path;
    // If the user has navigated from Login page or if it is page load, redirect user to settings page without showing any toast
    if (redirectToPath == "/login" || redirectToPath == "/") redirectToPath = "/settings";
    else {
      showToast(translate('You do not have permission to access this page'));
    }
    return {
      path: redirectToPath,
    }
  }
})

export default router
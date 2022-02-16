import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Shipments from '@/views/Shipments.vue'
import ShipmentDetails from '@/views/ShipmentDetails.vue'
import Login from '@/views/Login.vue'
import Settings from "@/views/Settings.vue"
import PurchaseOrders from "@/views/PurchaseOrders.vue"
import PurchaseOrderDetail from "@/views/PurchaseOrderDetail.vue"
import store from '@/store'
import Shopify from '@/views/Shopify.vue'

const authGuard = (to: any, from: any, next: any) => {
  if (store.getters['user/isAuthenticated']) {
      next()
  } else {
    next("/login")
  }
};

const loginGuard = (to: any, from: any, next: any) => {
  if (!store.getters['user/isAuthenticated']) {
      next()
  } else {
    next("/")
  }
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
    beforeEnter: authGuard
  },
  {
    path: '/shipment/:id',
    name: 'ShipmentDetails',
    component: ShipmentDetails,
    beforeEnter: authGuard
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
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
    beforeEnter: authGuard
  },
  {
    path: "/purchase-order-detail/:slug",
    name: "PurchaseOrderDetail",
    component: PurchaseOrderDetail,
    beforeEnter: authGuard
  },
  {
    path: '/shopify',
    name: 'Shopify',
    component: Shopify
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
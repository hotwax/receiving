import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Receiving from '@/views/Receiving.vue'
import Shipment from '@/views/Shipment.vue'
import Login from '@/views/Login.vue'
import Settings from "@/views/Settings.vue"
import PurchaseOrderDetail from "@/views/PurchaseOrderDetail.vue"
import PurchaseOrders from "@/views/PurchaseOrders.vue"
import store from '@/store'

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
    redirect: '/receiving'
  },
  {
    path: '/receiving',
    name: 'Receiving',
    component: Receiving,
    beforeEnter: authGuard
  },
  {
    path: '/shipment/:id',
    name: 'Shipment',
    component: Shipment,
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
    path: "/purchase-order-details/:slug",
    name: "PurchaseOrderDetail",
    component: PurchaseOrderDetail,
    beforeEnter: authGuard
  },
  {
    path: '/purchase-orders',
    name: 'PurchaseOrders',
    component: PurchaseOrders,
    beforeEnter: authGuard
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
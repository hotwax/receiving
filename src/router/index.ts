import { isAppEmbedded as utilIsAppEmbedded, showToast as utilShowToast } from '@common/utils/core';
import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/store/user';
import Actions from '@/authorization/actions';
import { translate } from '@common/core/i18n';
import { useAuth } from '@common/composables/useAuth';

import { businessOutline, calendarOutline, gitPullRequestOutline, settingsOutline } from "ionicons/icons";

// Defining types for the meta values
declare module 'vue-router' {
  interface RouteMeta {
    permissionId?: string;
    title?: string;
    icon?: string;
    menuIndex?: number;
    childRoutes?: string[];
  }
}

const authGuard = async (to: any, from: any, next: any) => {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value) {
    if (utilIsAppEmbedded()) {
      next('/shopify-login')
    } else {
      next('/login');
    }
  } else {
    next()
  }
};

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/transfer-orders'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@common/components/Login.vue')
  },
  {
    path: '/shopify-login',
    name: 'ShopifyLogin',
    component: () => import('@common/components/ShopifyLogin.vue')
  },
  {
    path: "/settings",
    name: "Settings",
    component: () => import('@/views/Settings.vue'),
    beforeEnter: authGuard,
    meta: {
      title: "Settings",
      icon: settingsOutline,
      menuIndex: 5
    }
  },
  {
    path: '/purchase-orders',
    name: 'PurchaseOrders',
    component: () => import('@/views/PurchaseOrders.vue'),
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_PURCHASEORDERS_VIEW,
      title: "Purchase Orders",
      icon: calendarOutline,
      menuIndex: 4,
      childRoutes: ["/purchase-order-detail/"]
    }
  },
  {
    path: "/purchase-order-detail/:slug",
    name: "PurchaseOrderDetail",
    component: () => import('@/views/PurchaseOrderDetail.vue'),
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_PURCHASEORDER_DETAIL_VIEW
    }
  },
  {
    path: '/shopify-app-install',
    name: 'ShopifyAppInstall',
    component: () => import('@common/components/ShopifyAppInstall.vue')
  },
  {
    path: '/returns',
    name: 'Returns',
    component: () => import('@/views/Returns.vue'),
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_RETURNS_VIEW,
      title: "Returns",
      icon: gitPullRequestOutline,
      menuIndex: 3,
      childRoutes: ["/return/"]
    }
  },
  {
    path: '/return/:id',
    name: 'ReturnDetails',
    component: () => import('@/views/ReturnDetails.vue'),
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_RETURN_DETAIL_VIEW
    }
  },
  {
    path: '/transfer-orders',
    name: 'TransferOrders',
    component: () => import('@/views/TransferOrders.vue'),
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_TRANSFERORDERS_VIEW,
      title: "Transfer Orders",
      icon: businessOutline,
      menuIndex: 2,
      childRoutes: ["/transfer-order-detail/"]
    }
  },
  {
    path: '/create-order',
    name: 'CreateOrder',
    component: () => import('@/views/CreateOrder.vue'),
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_TRANSFERORDER_CREATE
    }
  },
  {
    path: "/transfer-order-detail/:slug",
    name: "TransferOrderDetail",
    component: () => import('@/views/TransferOrderDetail.vue'),
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_TRANSFERORDER_DETAIL_VIEW
    }
  },
  // {
  //   path: '/notifications',
  //   name: "Notifications",
  //   component: Notifications,
  //   beforeEnter: authGuard,
  // }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})


router.beforeEach((to, from) => {
  // Enforce the canonical version URL on every navigation (no-op until the version is resolved, or if
  // already canonical). Redirect cancels this navigation. Logic lives in useAuth so it's shared.
  if (useAuth().checkAppVersionRedirect()) return false;

  const userStore = useUserStore();
  if (to.meta.permissionId && !userStore.hasPermission(to.meta.permissionId)) {
    let redirectToPath = from.path;
    // If the user has navigated from Login page or if it is page load, redirect user to settings page without showing any toast
    if (redirectToPath == "/login" || redirectToPath == "/") redirectToPath = "/settings";
    else {
      utilShowToast(translate('You do not have permission to access this page'));
    }
    return {
      path: redirectToPath,
    }
  }
})

export default router

import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Shipments from '@/views/Shipments.vue'
import ShipmentDetails from '@/views/ShipmentDetails.vue'
import Settings from "@/views/Settings.vue"
import PurchaseOrders from "@/views/PurchaseOrders.vue"
import PurchaseOrderDetail from "@/views/PurchaseOrderDetail.vue"
import Returns from '@/views/Returns.vue'
import ReturnDetails from '@/views/ReturnDetails.vue'
import TransferOrders from '@/views/TransferOrders.vue';
import TransferOrderDetail from '@/views/TransferOrderDetail.vue';
import { useUserStore } from '@/store/user';
import { translate, commonUtil, useAuth, ShopifyLogin, ShopifyAppInstall, Login } from '@common'

import { businessOutline, calendar, download, gitPullRequestOutline, settingsOutline } from "ionicons/icons";

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
    if (commonUtil.isAppEmbedded()) {
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
    redirect: '/shipments'
  },
  {
    path: '/shipments',
    name: 'Shipments',
    component: Shipments,
    beforeEnter: authGuard,
    meta: {
      permissionId: "FULFILLMENT_LEGACY_APP_VIEW",
      title: "Shipments",
      icon: download,
      menuIndex: 1,
      childRoutes: ["/shipment/"]
    }
  },
  {
    path: '/shipment/:id',
    name: 'ShipmentDetails',
    component: ShipmentDetails,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_SHIPMENTS_VIEW"
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/shopify-login',
    name: 'ShopifyLogin',
    component: ShopifyLogin
  },
  {
    path: "/settings",
    name: "Settings",
    component: Settings,
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
    component: PurchaseOrders,
    beforeEnter: authGuard,
    meta: {
      permissionId: "",
      title: "Purchase Orders",
      icon: calendar,
      menuIndex: 4,
      childRoutes: ["/purchase-order-detail/"]
    }
  },
  {
    path: "/purchase-order-detail/:slug",
    name: "PurchaseOrderDetail",
    component: PurchaseOrderDetail,
    beforeEnter: authGuard,
    meta: {
      permissionId: ""
    }
  },
  {
    path: '/shopify-app-install',
    name: 'ShopifyAppInstall',
    component: ShopifyAppInstall
  },
  {
    path: '/returns',
    name: 'Returns',
    component: Returns,
    beforeEnter: authGuard,
    meta: {
      permissionId: "",
      title: "Returns",
      icon: gitPullRequestOutline,
      menuIndex: 3,
      childRoutes: ["/return/"]
    }
  },
  {
    path: '/return/:id',
    name: 'ReturnDetails',
    component: ReturnDetails,
    beforeEnter: authGuard,
    meta: {
      permissionId: ""
    }
  },
  {
    path: '/transfer-orders',
    name: 'TransferOrders',
    component: TransferOrders,
    beforeEnter: authGuard,
    meta: {
      permissionId: "FULFILLMENT_APP_VIEW",
      title: "Transfer Orders",
      icon: businessOutline,
      menuIndex: 2,
      childRoutes: ["/transfer-order-detail/"]
    }
  },
  {
    path: "/transfer-order-detail/:slug",
    name: "TransferOrderDetail",
    component: TransferOrderDetail,
    beforeEnter: authGuard,
    meta: {
      permissionId: "FULFILLMENT_APP_VIEW"
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
  const userStore = useUserStore();
  // Handling the case to hide TO or shipment page dynamically and not added generic code,
  // as this is not something that needs to be handled for all the pages and this might need to be removed in future
  if (userStore.hasPermission("FULFILLMENT_LEGACY_APP_VIEW") && userStore.hasPermission("FULFILLMENT_APP_VIEW") && (to.name === "TransferOrders" || to.name === "TransferOrderDetail")) {
    let redirectToPath = from.path;
    // If the user has navigated from Login page or if it is page load, redirect user to settings page without showing any toast
    if (redirectToPath == "/login" || redirectToPath == "/") redirectToPath = "/settings";
    else {
      commonUtil.showToast(translate('You do not have permission to access this page'));
    }
    return {
      path: redirectToPath,
    }
  } else if (!userStore.hasPermission("FULFILLMENT_LEGACY_APP_VIEW") && !userStore.hasPermission("FULFILLMENT_APP_VIEW") && (to.name === "Shipments" || to.name === "ShipmentDetails")) {
    return true;
  } else if (!userStore.hasPermission("FULFILLMENT_LEGACY_APP_VIEW") && userStore.hasPermission("FULFILLMENT_APP_VIEW") && (to.name === "Shipments" || to.name === "ShipmentDetails")) {
    return {
      path: "/transfer-orders",
    };
  }

  if (to.meta.permissionId && !userStore.hasPermission(to.meta.permissionId)) {
    let redirectToPath = from.path;
    // If the user has navigated from Login page or if it is page load, redirect user to settings page without showing any toast
    if (redirectToPath == "/login" || redirectToPath == "/") redirectToPath = "/settings";
    else {
      commonUtil.showToast(translate('You do not have permission to access this page'));
    }
    return {
      path: redirectToPath,
    }
  }
})

export default router

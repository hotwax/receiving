import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../app/services/auth/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('../app/pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'home',
    canLoad: [AuthGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('../app/pages/home/home.module').then( m => m.HomePageModule),
      },
      {
        path: ':id',
        loadChildren: () => import('../app/pages/shipment/shipment.module').then( m => m.ShipmentPageModule)
      }
    ]
  },
  {
    path: 'purchase-orders',
    canLoad: [AuthGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('../app/pages/purchase-orders/purchase-orders.module').then( m => m.PurchaseOrdersModule),
      },
      {
        path: ':id',
        loadChildren: () => import('../app/pages/purchase-orders-details/purchase-orders-details.module').then( m => m.PurchaseOrdersDetailsModule)
      }
    ]
  },
  {
    path: 'add-product-modal',
    loadChildren: () => import('../app/pages/add-product-modal/add-product-modal.module').then( m => m.AddProductModalPageModule)
  },
  {
    path: 'settings',
    canLoad: [AuthGuard],
    loadChildren: () => import('../app/pages/settings/settings.module').then( m => m.SettingsPageModule)
  },
  {
    path: 'shopify-install',
    loadChildren: () => import('../app/pages/shopify-install/shopify-install.module').then( m => m.ShopifyInstallPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }

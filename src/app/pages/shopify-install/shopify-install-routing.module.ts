import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ShopifyInstallPage } from './shopify-install.page';

const routes: Routes = [
  {
    path: '',
    component: ShopifyInstallPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ShopifyInstallPageRoutingModule {}

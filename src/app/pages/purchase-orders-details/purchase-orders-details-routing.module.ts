import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PurchaseOrdersDetails } from './purchase.orders.details';

const routes: Routes = [
  {
    path: '',
    component: PurchaseOrdersDetails
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PurchaseOrdersDetailsRoutingModule {}

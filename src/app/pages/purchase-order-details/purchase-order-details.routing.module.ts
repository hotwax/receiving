import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {PurchaseOrderDetailsComponent} from './purchase-order-details.component';


const routes: Routes = [
  {
    path: '',
    component: PurchaseOrderDetailsComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PurchaseOrderDetailsRoutingModule { }

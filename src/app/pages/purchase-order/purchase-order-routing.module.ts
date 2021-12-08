import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import {PurchaseOrderComponent} from './purchase-order.component';
import {PurchaseOrderDetailsComponent} from '../purchase-order-details/purchase-order-details.component';

const routes: Routes = [
    {
        path: '',
        component: PurchaseOrderComponent,
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class PurchaseOrderRoutingModule {}

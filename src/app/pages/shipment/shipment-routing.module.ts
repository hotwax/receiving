import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ShipmentPage } from './shipment.page';

const routes: Routes = [
  {
    path: '',
    component: ShipmentPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ShipmentPageRoutingModule {}

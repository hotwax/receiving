import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AddProductModalPage } from './add-product-modal.page';

const routes: Routes = [
  {
    path: '',
    component: AddProductModalPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddProductModalPageRoutingModule {}

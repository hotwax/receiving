import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PurchaseOrdersDetailsRoutingModule } from './purchase-orders-details-routing.module';
import { PurchaseOrdersDetails } from './purchase.orders.details';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from '../../components/components.module';

@NgModule({
  imports: [
    CommonModule,
    ComponentsModule,
    FormsModule,
    IonicModule,
    PurchaseOrdersDetailsRoutingModule,
    TranslateModule
  ],
  declarations: [PurchaseOrdersDetails]
})
export class PurchaseOrdersDetailsModule {}

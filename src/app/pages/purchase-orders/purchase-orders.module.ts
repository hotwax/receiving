import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { PurchaseOrders } from './purchase.orders';

import { PurchaseOrdersRoutingModule } from './purchase-orders-routing.module';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from '../../components/components.module';

@NgModule({
  imports: [
    CommonModule,
    ComponentsModule,
    FormsModule,
    IonicModule,
    PurchaseOrdersRoutingModule,
    TranslateModule
  ],
  declarations: [PurchaseOrders]
})
export class PurchaseOrdersModule {}

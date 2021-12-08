import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import {PurchaseOrderComponent} from './purchase-order.component';
import { PurchaseOrderRoutingModule } from './purchase-order-routing.module';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from '../../components/components.module';


@NgModule({
  declarations: [PurchaseOrderComponent],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    ComponentsModule,
    PurchaseOrderRoutingModule
  ]
})
export class PurchaseOrderModule { }

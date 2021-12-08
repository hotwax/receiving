import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PurchaseOrderDetailsRoutingModule } from './purchase-order-details.routing.module';
import {PurchaseOrderDetailsComponent} from './purchase-order-details.component';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from '../../components/components.module';


@NgModule({
  declarations: [PurchaseOrderDetailsComponent],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    ComponentsModule,
    PurchaseOrderDetailsRoutingModule
  ]
})
export class PurchaseOrderDetailsModule { }

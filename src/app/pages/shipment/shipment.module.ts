import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ShipmentPageRoutingModule } from './shipment-routing.module';
import { ShipmentPage } from './shipment.page';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from '../../components/components.module';

@NgModule({
  imports: [
    CommonModule,
    ComponentsModule,
    FormsModule,
    IonicModule,
    ShipmentPageRoutingModule,
    TranslateModule
  ],
  declarations: [ShipmentPage]
})
export class ShipmentPageModule {}

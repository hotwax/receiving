import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AddProductModalPageRoutingModule } from './add-product-modal-routing.module';
import { AddProductModalPage } from './add-product-modal.page';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from '../../components/components.module';

@NgModule({
  imports: [
    CommonModule,
    ComponentsModule,
    FormsModule,
    IonicModule,
    AddProductModalPageRoutingModule,
    TranslateModule
  ],
  declarations: [AddProductModalPage]
})
export class AddProductModalPageModule {}

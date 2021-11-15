import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { ShopifyInstallPageRoutingModule } from './shopify-install-routing.module';

import { ShopifyInstallPage } from './shopify-install.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ShopifyInstallPageRoutingModule,
    TranslateModule
  ],
  declarations: [ShopifyInstallPage]
})
export class ShopifyInstallPageModule {}

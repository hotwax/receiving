import { Component, OnInit } from '@angular/core';
import { ShopifyProvider } from '../../providers/shopify.provider'
import { TranslateService } from '@ngx-translate/core';
import { MenuController } from '@ionic/angular';

@Component({
  selector: 'app-shopify-install',
  templateUrl: './shopify-install.page.html',
})
export class ShopifyInstallPage implements OnInit {
  companyLogo = 'assets/imgs/hc.png';
  shopOrigin = 'hc-sandbox.myshopify.com';
  constructor(
    private shopifyProvider: ShopifyProvider,
    public translate: TranslateService,
    public menu: MenuController
    ) { }

  ngOnInit() {
    this.menu.enable(false, 'menu');
    this.shopifyProvider.initialise().then(() => {
      this.shopifyProvider.install();
    });
  }

  install(shopOrigin) {
    this.shopifyProvider.install(shopOrigin);
  }


}

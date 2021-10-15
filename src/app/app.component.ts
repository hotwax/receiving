import { Component } from '@angular/core';

import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { TranslateService } from '@ngx-translate/core';
import { AuthProvider } from '../app/providers/auth.provider';
import { Router } from '@angular/router';
import { UtilProvider } from '../app/providers/util.provider';
import { ShopifyProvider } from '../app/providers/shopify.provider';
import { environment } from '../environments/environment';
import { Location } from '@angular/common';


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    public translate: TranslateService,
    public authProvider: AuthProvider,
    public router: Router,
    public utilProvider: UtilProvider,
    private shopifyProvider: ShopifyProvider,
    public location: Location
  ) {
    this.initializeApp();
    this.localizeApplication();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
      let urlParamaterMap;
      const urlParamater = window.location.search.substring(1);
      if (urlParamater) {
        urlParamaterMap = JSON.parse('{"' + decodeURI(urlParamater).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
      } else {
        urlParamaterMap = {};
      }
      if (environment.SHOPIFY_API_KEY
          && environment.SHOPIFY_API_SECRET
          && environment.SHOPIFY_REDIRECT_URI) {
        // apiKey of App from Partner dashboard
        const apiKey = environment.SHOPIFY_API_KEY;
        const apiSecret = environment.SHOPIFY_API_SECRET;
        // App URL that handles the Code and generates the access token
        // We can also use the base path. Need to think about it
        const redirectUri = environment.SHOPIFY_REDIRECT_URI;
        this.shopifyProvider.initialise({ apiKey, apiSecret, redirectUri, shop: urlParamaterMap.shop }).then(() => {
          // Parameters has code then only it is an Auth request
          if (urlParamaterMap.code && this.shopifyProvider.verifyHMAC(urlParamaterMap)) {
            // If it is an verified request redirect to app
            const accessTokenUrl = environment.BASE_URL + 'getShopifyAccessToken';
            this.shopifyProvider.getAccessToken(accessTokenUrl).then(() => {
              const appURL = this.shopifyProvider.generateAppURL();
              window.location.assign(appURL);
            }).catch((error) => {
              // TODO Display error message
              console.log(error);
            });
          }
          this.shopifyProvider.createApp();
        });
      }
      // TODO Handle it in a better way
      if (this.location.path() !== '/shopify-install') {
        if (this.authProvider.isAuthenticated()) {
          this.router.navigate(['home']);
        } else {
          this.router.navigate(['login']);
        }
      }
    });
  }

  localizeApplication() {
    const browserLanguage = this.translate.getBrowserLang();
    if (browserLanguage) {
      this.translate.setDefaultLang(browserLanguage);
    } else {
      this.translate.use('en');
    }
  }

}

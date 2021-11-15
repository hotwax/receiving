import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { get } from 'scriptjs';
import CryptoES from 'crypto-es';

@Injectable()
export class ShopifyProvider {
  // apiKey of App from Partner dashboard
  private apiKey;
  private apiSecret;
  // App URL that handles the Code and generates the access token
  private redirectUri;
  private shopOrigin;
  private AppBridge;
  private code;
  constructor(private http: HttpClient) {}

  initialise(config?) {
    return new Promise((resolve, reject) => {
      if (config) {
        this.apiSecret = config.apiSecret;
        this.apiKey = config.apiKey;
        this.redirectUri = config.redirectUri;
        this.shopOrigin = config.shop;
        this.code = config.code;
      }
      // TODO Check if npm app bridge works directly
      get('https://unpkg.com/@shopify/app-bridge', () => {
        this.AppBridge = window['app-bridge'];
        resolve(this.AppBridge);
      });
    });
  }

  install(shopOrigin?) {
    // When we have shop value passed through params
    if (shopOrigin) {
      this.shopOrigin = shopOrigin;
    }
    if (this.shopOrigin) {
      // URL that redirects to Installation page with require permissions in params
      const permissionUrl = 'https://' + this.shopOrigin + '/admin' + '/oauth/authorize?client_id=' +
          this.apiKey + '&scope=read_products,read_content&redirect_uri=' + this.redirectUri;
      // If the current window is the 'parent', change the URL by setting location.href
      if (window.top === window.self) {
          window.location.assign(permissionUrl);
      // If the current window is the 'child', change the parent's URL with Shopify App Bridge's Redirect action
      } else {
        // TODO Check if we can remove this
          this.AppBridge.createApp({
              apiKey: this.apiKey,
              shopOrigin: this.shopOrigin,
               // This defines whether token will be user based or not
               // https://shopify.dev/concepts/about-apis/authentication#api-access-modes
              access_mode: 'per-user',
              forceRedirect: true // This is required to show app as embedded
          });

      }
    }
  }

  createApp() {
    // TODO Add configuration for embedded and non embedded apps
    // If the current window is not the 'child', it is not the embedded Shopify POS app
    if (window.top !== window.self) {
      this.AppBridge.createApp({
        apiKey: this.apiKey,
        shopOrigin: this.shopOrigin,
        access_mode: 'per-user', // https://shopify.dev/concepts/about-apis/authentication#api-access-modes
        forceRedirect: true // This is required to show app as embedded
      });
    }
  }

  getAccessToken(url) {
    // TODO Call directly to Shopify with multipart request
    return new Promise((resolve, reject) => {
        this.http.post(url , {
            client_id: this.apiKey,
            client_secret: this.apiSecret,
            code: this.code,
            shop: this.shopOrigin
        }).subscribe((data) => {
            resolve(data);
        }, error => {
            console.log(error);
            reject(error);
        });
    });
  }

  generateAppURL() {
    return 'https://' + this.shopOrigin + '/admin/apps/' + this.apiKey;
  }

  verifyHMAC(urlParamaterMap) {
    // TODO Use Nounce
    const message = Object.keys(urlParamaterMap)
        .filter((key) => key !== 'hmac')
        .map((key) => {
            return encodeURIComponent(key) + '=' + encodeURIComponent(urlParamaterMap[key]);
        }).join('&');
    const hmac = urlParamaterMap.hmac;
    const hash = CryptoES.HmacSHA256(message, this.apiSecret);
    return hmac === hash.toString(CryptoES.enc.Hex);
  }

}

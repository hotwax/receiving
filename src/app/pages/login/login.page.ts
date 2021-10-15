import { Component, OnInit } from '@angular/core';
import { AuthProvider } from '../../providers/auth.provider';
import { MenuController, NavController } from '@ionic/angular';
import { WidgetProvider } from '../../providers/widget.provider';
import { TranslateService } from '@ngx-translate/core';
import { HttpStatusCode } from '../../../shared/HttpStatusCode';
import { HcProvider } from '../../providers/hc.provider';
import { StorageProvider } from '../../providers/storage.provider';
import { UtilProvider } from '../../providers/util.provider';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {

  username;
  password;
  constructor(
    public authProvider: AuthProvider,
    private navCtrl: NavController,
    private widget: WidgetProvider,
    public translate: TranslateService,
    private menu: MenuController,
    private hcProvider: HcProvider,
    private storageProvider: StorageProvider,
    private utilProvider: UtilProvider
  ) {
      this.menu.enable(this.authProvider.isAuthenticated(), 'menu');
      this.setDefaultCredentials();
  }

  ngOnInit() {
  }

  setDefaultCredentials() {
    this.username = 'kevin.jackson';
    this.password = 'hotwax@786';
  }

  login(username, password) {
    if (username && password) {
      this.widget.presentLoader('');
      this.authProvider.login(username, password).then((data: boolean) => {
        if (data) {
          this.hcProvider.callRequest('get', 'user-profile').subscribe((data: any) => {
            if((data.facilities.length > 0) && data.facilities[0].facilityId) {
              this.menu.enable(this.authProvider.isAuthenticated(), 'menu');
              this.navCtrl.navigateRoot(['/home']);
              // The loader will be dismissed on home component after getting data from incoming-shipments API
              this.storageProvider.setLocalStorageItem('userProfile', JSON.stringify(data))
              this.storageProvider.setLocalStorageItem('facilities', JSON.stringify(data.facilities));
              this.utilProvider.setFacility(0, data.facilities);
            } else {
              this.widget.showToast(this.translate.instant('NoPermission'));
              this.widget.dismissLoader();
            }
          }, (err) => {
            this.widget.showToast((this.translate.instant('LoginError')));
            this.storageProvider.removeLocalStorageItem('token');
            this.widget.dismissLoader();
          })
        } else {
          this.widget.dismissLoader();
          this.widget.showToast(this.translate.instant('InvalidLoginCredentialError'));
        }
      }).catch((error) => {
        this.widget.dismissLoader();
        if (error.status !== HttpStatusCode.OK) {
          if (error.status === HttpStatusCode.UNAUTHORIZED) {
            this.widget.showToast(this.translate.instant('LoginFailedError'));
          }
          if (error.status === HttpStatusCode.BAD_REQUEST) {
            this.widget.showToast(this.translate.instant('InvalidLoginCredentialError'));
          }
          if (error.status === HttpStatusCode.NOT_FOUND) {
            this.widget.showToast(this.translate.instant('SomethingWentWrong'));
          }
        }
      });
    } else {
      this.setDefaultCredentials();
    }
  }

}

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { StorageProvider } from '../../providers/storage.provider';
import { UtilProvider } from '../../providers/util.provider';
import { AlertController, MenuController } from '@ionic/angular';
import { AuthProvider } from '../../providers/auth.provider';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  facilities: any = [];
  facilityIndex: number;
  constructor(
    public translate: TranslateService,
    private storageProvider: StorageProvider,
    public utilProvider: UtilProvider,
    public authProvider: AuthProvider,
    private alertCtrl: AlertController,
    public menu: MenuController,
    public router: Router
  ) {

    this.facilities = JSON.parse(this.storageProvider.getLocalStorageItem('facilities'))
    if (this.facilities) {
      let selectedFacility = JSON.parse(this.storageProvider.getLocalStorageItem("selectedFacility"));//get user facility from localstorage "selectedFacility"
      let index = this.facilities.findIndex(facility => {
        if (facility.name) {
          return facility.name == selectedFacility.name;
        }
        else {
          return facility.facilityId == selectedFacility.facilityId;
        }
      });
      this.facilityIndex = index;
    }
  }

  setFacility() {
    this.utilProvider.setFacility(this.facilityIndex, this.facilities);
  }

  ngOnInit() {
  }

  async logout() {
    const confirmLogoutAlert = await this.alertCtrl.create({
      header: this.translate.instant('Logout'),
      message: this.translate.instant('ConfirmLogout'),
      buttons: [{
        text: this.translate.instant('No')
      },
      {
        text: this.translate.instant('Yes'),
        handler: () => {
          this.authProvider.logout();
          this.router.navigate(['/']);
          this.menu.enable(this.authProvider.isAuthenticated(), 'menu');
        }
      }]
    });
    await confirmLogoutAlert.present();
  }

}

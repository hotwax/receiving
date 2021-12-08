import { Component, OnInit } from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {ActivatedRoute, Router} from '@angular/router';
import {AlertController, ModalController, Platform} from '@ionic/angular';
import {HcProvider} from '../../providers/hc.provider';
import {StorageProvider} from '../../providers/storage.provider';
import {WidgetProvider} from '../../providers/widget.provider';
import {UtilProvider} from '../../providers/util.provider';
import {AddProductModalPage} from '../add-product-modal/add-product-modal.page';

@Component({
  selector: 'app-purchase-order',
  templateUrl: './purchase-order.component.html',
  styleUrls: ['./purchase-order.component.scss'],
})
export class PurchaseOrderComponent implements OnInit {

  viewSize: number = 10;
  viewIndex: number = 0;
  shipmentId: string = '';
  constructor(
      public translate: TranslateService,
      public utilProvider: UtilProvider,
      private widgetProvider: WidgetProvider
  ) {
  }

  ionViewWillEnter() {
    if(!this.shipmentId) {
      if(!this.widgetProvider.isLoading) this.widgetProvider.presentLoader('')
      this.getShipments(this.viewSize, this.viewIndex);
    }
  }

  getShipments(viewSize, viewIndex, event?) {
    this.utilProvider.getShipments(viewSize, viewIndex).then((data: any) => {
      if (event) {
        if (data.length) {
          // In case of infinite scrolling, push the data to shared variable
          this.utilProvider.shipments.push.apply(this.utilProvider.shipments, data);
        } else {
          // If we dont get more shipments on next viewIndex then a toast msg will be displayed.
          this.widgetProvider.showToast(this.translate.instant('AllShipmentsLoaded'));
        }
      } else {
        // Otherwise assign the data to shared variable
        this.utilProvider.shipments = data;
      }
      this.widgetProvider.dismissLoader();
    }).catch((e) => {
      this.widgetProvider.dismissLoader();
    })
  }

  ngOnInit() {
  }

  loadMoreShipments() {
    this.viewIndex = Math.ceil((this.viewIndex * this.viewSize + 1) / this.viewSize);
    // Display loader while tapping on Load more shipments button
    if(!this.widgetProvider.isLoading) this.widgetProvider.presentLoader('');
    this.getShipments(this.viewSize, this.viewIndex, event)
  }

  getShipment(event, shipmentId) {
    if (event && event.key === 'Enter') {
      this.widgetProvider.presentLoader('');
      this.utilProvider.getShipments(this.viewSize, this.viewIndex, shipmentId).then((data: any) => {
        if(data.length) {
          this.utilProvider.shipments = data;
        } else {
          this.shipmentId = '';
          this.widgetProvider.showToast(this.translate.instant('NoResultsFound') + ' ' + shipmentId);
        }
        this.widgetProvider.dismissLoader();
      }).catch((e) => {
        this.widgetProvider.dismissLoader();
      })
    }
  }

  clearShipment() {
    this.widgetProvider.presentLoader('');
    this.getShipments(10, 0)
  }

}

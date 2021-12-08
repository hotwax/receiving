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
  selector: 'app-purchase-order-details',
  templateUrl: './purchase-order-details.component.html',
  styleUrls: ['./purchase-order-details.component.scss'],
})
export class PurchaseOrderDetailsComponent implements OnInit {

  public isModalOpen = false;
  public modalKeyListener;
  public shipment:any = {};
  public SKU: any;
  constructor(
      public translate: TranslateService,
      private activatedRoute: ActivatedRoute,
      private modalController: ModalController,
      private hcProvider: HcProvider,
      private storageProvider: StorageProvider,
      private widgetProvider: WidgetProvider,
      public utilProvider: UtilProvider,
      private router: Router,
      private alertController: AlertController,
      public platform: Platform
  ) {
    this.modalKeyListener = (ev: any) => {
      if (ev.ctrlKey && ev.key === 'o') {
        ev.preventDefault();
        this.addProduct();
      }
    }
    window.addEventListener('keydown', this.modalKeyListener);
  }

  ngOnInit() {
    this.activatedRoute.paramMap.subscribe(paramMap => {
      if(!paramMap.has('id')) {
        return;
      }
      const shipmentId = paramMap.get('id');
      let storedShipment = JSON.parse(this.storageProvider.getLocalStorageItem(shipmentId));
      if(storedShipment) {
        this.shipment = storedShipment;
      } else {
        this.getShipmentDetail(shipmentId);
      }
    })
  }

  ionViewDidLeave() {
    window.removeEventListener('keydown', this.modalKeyListener);
  }

  getShipmentDetail(shipmentId) {
    this.widgetProvider.presentLoader('');
    let params = { shipmentId: shipmentId };
    this.hcProvider.callRequest('get', 'shipment-detail', params).subscribe(
        (data: any) => {
          if (data) {
            this.shipment = data;
            this.shipment.items.map(item => {
              if(this.shipment.statusId === 'PURCH_SHIP_RECEIVED') {
                item.progress = 1
              } else {
                // After fetching shipment detail, added progress field in each items because we need to show progress as per the value of quantityAccepted
                item.progress = 0;
              }
            })
            this.storageProvider.setLocalStorageItem(shipmentId, JSON.stringify(this.shipment));
          }
          this.widgetProvider.dismissLoader();
        },
        (err) => {
          this.widgetProvider.dismissLoader();
          this.widgetProvider.showToast(err);
        }
    )
  }

  receiveAll(item) {
    // Accept the quantity as same as ordered quantity
    this.shipment.items.filter(ele => {
      if(ele.itemSeqId == item.itemSeqId) {
        ele.quantityAccepted = ele.quantityOrdered;
        // The 'value' properties of progress bar should be between 0 and 1 hence set the value accordingly.
        ele.progress = ele.quantityAccepted / ele.quantityOrdered
        this.storageProvider.setLocalStorageItem(this.shipment.shipmentId, JSON.stringify(this.shipment))
      }
    })
  }

  setAcceptedQuantity(item, qty) {
    // WM can accept less or more than ordered quantity
    item.progress = qty / item.quantityOrdered;
    this.shipment.items.filter(ele => {
      if(ele.productId == item.productId && ele.itemSeqId == item.itemSeqId) {
        ele.quantityAccepted = qty;
        this.storageProvider.setLocalStorageItem(this.shipment.shipmentId, JSON.stringify(this.shipment))
      }
    })
  }

  async receiveShipmentItems() {
    const alert = await this.alertController.create({
      cssClass: '',
      header: this.translate.instant('CompleteShipment'),
      message: this.translate.instant('ConfirmQuantity'),
      buttons: [
        {
          text: this.translate.instant('Cancel'),
          role: 'cancel', // This handler will be invoked on tapping backdrop
          cssClass: '',
          handler: () => {
          }
        }, {
          text: this.translate.instant('Complete'),
          handler: () => {
            let shipmentParam = {
              shipmentId: this.shipment.shipmentId,
              statusId : "PURCH_SHIP_RECEIVED"
            }
            this.widgetProvider.presentLoader('');
            this.shipment.items.filter(item => {
              if(item.quantityAccepted > 0) {
                let params = {
                  shipmentId: this.shipment.shipmentId,
                  facilityId: this.utilProvider.facilityId,
                  shipmentItemSeqId: item.itemSeqId,
                  productId: item.productId,
                  quantityAccepted: item.quantityAccepted,
                  locationSeqId: this.shipment.locationSeqId
                }
                this.hcProvider.callRequest('post', 'receiveShipmentItem', params).subscribe((data: any) => {
                  if( data.body && (item.quantityAccepted == data.body.quantityAccepted)) {
                    this.hcProvider.callRequest('post', 'updateShipment', shipmentParam).subscribe((data: any) => {
                      if(data.body && data.body._EVENT_MESSAGE_) {
                        this.storageProvider.removeLocalStorageItem(this.shipment.shipmentId);
                        this.widgetProvider.showToast(this.translate.instant('ShipmentReceived') + ' ' + data.body.shipmentId)
                        this.router.navigateByUrl('/home');
                      }
                    })
                    this.widgetProvider.dismissLoader();
                  } else {
                    this.widgetProvider.dismissLoader();
                    this.widgetProvider.showToast(this.translate.instant('SomethingWentWrong'));
                  }
                }, (err) => {
                  this.widgetProvider.dismissLoader();
                  this.widgetProvider.showToast(err);
                })
              } else {
                // Further we will remove this toast once the functionality is available to close shipment
                this.widgetProvider.dismissLoader();
                this.widgetProvider.showToast(this.translate.instant('ZeroQuantity'))
              }
            })
          }
        }
      ]
    });
    await alert.present();
  }

  scanProduct(event, SKU) {
    if (event && event.key === 'Enter') {
      this.widgetProvider.presentLoader('');
      let query = `filters={internalName=${SKU}}`;
      this.utilProvider.findProduct(query).then((data: any) => {
        if(data.length) {
          this.shipment.items.filter((item) => (item.sku == data[0].sku))
              .map(updateItem => {
                if(updateItem) {
                  // If entered SKU matched then increased the quantity by 1
                  updateItem.quantityAccepted++;
                  this.storageProvider.setLocalStorageItem(this.shipment.shipmentId, JSON.stringify(this.shipment))
                } else {
                  // Otherwise toast message will be displayed
                  this.widgetProvider.showToast(this.translate.instant('ScannedItemNotFound'))
                }
              })
        }
        this.widgetProvider.dismissLoader();
      }).catch((e) => {
        this.widgetProvider.dismissLoader();
      })
    }
  }

  async addProduct() {
    // If the modal is already opened then again the modal should not be open
    if(!this.isModalOpen) {
      const modal = await this.modalController.create({
        component: AddProductModalPage,
        cssClass: '',
        componentProps: {
          'shipment': this.shipment
        }
      });
      // Initially the flag is false hence set it to true after opening the modal
      this.isModalOpen = true;
      modal.onDidDismiss().then(() => {
        // After dismissing the modal, set the flag to false so that modal can be open with either click event or CTRL+ command
        this.isModalOpen = false;
      });
      return await modal.present();
    }
  }

}

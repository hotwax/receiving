import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ModalController } from '@ionic/angular';
import { WidgetProvider } from '../../providers/widget.provider';
import { HcProvider } from '../../providers/hc.provider';
import { StorageProvider } from '../../providers/storage.provider';
import { UtilProvider } from '../../providers/util.provider';
@Component({
  selector: 'app-add-product-modal',
  templateUrl: './add-product-modal.page.html',
  styleUrls: ['./add-product-modal.page.scss'],
})
export class AddProductModalPage implements OnInit {

  @ViewChild('autoFocus') autoFocus: any;
  @Input() shipment: any;
  public items: any = [];
  public keyword: any;

  constructor(
    public translate: TranslateService,
    private modalCtrl: ModalController,
    private widgetProvider: WidgetProvider,
    private hcProvider: HcProvider,
    private storageProvider: StorageProvider,
    private utilProvider: UtilProvider
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.widgetProvider.setAutoFocus(this.autoFocus);
  }

  closeModal() {
    this.modalCtrl.dismiss({
      'dismissed': true
    });
  }

  getProducts(event, keyword) {
    if (event && event.key === 'Enter') {
      this.widgetProvider.presentLoader('');
      let query = `keyword=${keyword}`
      this.utilProvider.findProduct(query).then((data: any) => {
        if(data.length) {
          this.items = data;
          this.items.map(item => {
            this.shipment.items.filter(shipmentItem => {
              /*  * isAlreadyAdded flag is used to display the addToShipment button and checkmark icon
                  * If item already added in the shipment then checkmark icon will be dipslayed otherwise addToShipment button will be displayed
              */
              item.isAlreadyAdded = item.id == shipmentItem.productId
            })
          })
        }
        this.widgetProvider.dismissLoader();
      }).catch((e) => {
        this.widgetProvider.dismissLoader();
      })
    }
  }

  addToShipment(item) {
    this.widgetProvider.presentLoader('');
    let params = { shipmentId: this.shipment.shipmentId, quantity: 0, productId: item.id };
    this.hcProvider.callRequest('post', 'addShipmentItem', params).subscribe((data: any) => {
      if(data.body) {
        // After adding the item we need to show the checkmark-circle icon hence set the flag to true
        item.isAlreadyAdded = true;
        let addedItem = {
          "itemSeqId": data.body.shipmentItemSeqId,
          "productId": item.id,
          "imageUrl" : item.imageUrl,
          "sku" : item.sku,
          "productName" : item.name,
          "quantityOrdered" : data.body.quantity,
          "quantityAccepted" : data.body.quantity
        }
        this.shipment.items.push(addedItem);
        // Stored shipment with updated shipmentItem in the storage
        this.storageProvider.setLocalStorageItem(this.shipment.shipmentId, JSON.stringify(this.shipment))
      }
      this.widgetProvider.dismissLoader();
    }, (err) => {
      this.widgetProvider.showToast(this.translate.instant('ASSomethingWentWrong'));
      this.widgetProvider.dismissLoader();
    })
  }

}

import { Injectable } from "@angular/core";
import { StorageProvider } from '../providers/storage.provider';
import { HcProvider } from '../providers/hc.provider';

@Injectable()
export class UtilProvider {

  public facilityId: any;
  public facilityName: string;
  public shipments: any[] = [];

  constructor(
    private storageProvider: StorageProvider,
    private hcProvider: HcProvider,
  ) {
    let selectedFacility = JSON.parse(localStorage.getItem("selectedFacility"))
    if(selectedFacility) {
      this.facilityId = selectedFacility.facilityId;
      this.facilityName = selectedFacility.name;
    } else {
      let userProfile = JSON.parse(localStorage.getItem('userProfile'));
      // Initially get first facilityId from the response, later on it will change as per the value of dropdown on settings page.
      if (userProfile) {
        this.facilityId = userProfile.facilities[0].facilityId;
        this.facilityName = userProfile.facilities[0].name;
      }
    }
  }

  setFacility(index, facilities) {
    let name= "";
    if (facilities[index].name) {
      name= facilities[index].name;
    } else {
      name= facilities[index].facilityId;
    }
    /* Update the value of facilityId as per the facility select from dropdown.
      Further APIs will be called using this updated value of facilityId
    */
    this.facilityId = facilities[index].facilityId;
    this.facilityName = facilities[index].name;
    let selectedFacility = {
      'name': name,
      'facilityId': facilities[index].facilityId
    }
    this.storageProvider.setLocalStorageItem('selectedFacility', JSON.stringify(selectedFacility));
  }

  getShipments(viewSize, viewIndex, shipmentId?) {
    let params = {};
    return new Promise((resolve, reject) => {
      params = { viewSize: viewSize, viewIndex: viewIndex, facilityId: this.facilityId, statusId: 'PURCH_SHIP_SHIPPED' };
      if (shipmentId) params = { shipmentId: shipmentId, facilityId: this.facilityId };
      this.hcProvider.callRequest('get', 'incoming-shipments', params).subscribe((data: any) => {
        if(data.docs) {
          resolve(data.docs);
        }
      }, (err) => {
        reject(err);
      });
    });
  }

  findProduct(query) {
    return new Promise((resolve, reject) => {
      this.hcProvider.callRequest('post', encodeURI('products?'+ query )).subscribe((data: any) => {
        if(data.docs) {
          resolve(data.docs);
        }
      }, (err) => {
        reject(err);
      });
    });
  }

}
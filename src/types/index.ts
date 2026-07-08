export interface UploadRequest {
    params?: any;
    fileName?: string;
    uploadData: any;
}

export interface Facility {
  facilityId: string;
  facilityName?: string;
  facilityTypeId?: string;
  parentFacilityId?: string;
  ownerPartyId?: string;
  defaultInventoryItemTypeId?: string;
  facilitySize?: number;
  facilitySizeUomId?: string;
  productStoreId?: string;
  externalId?: string;
  description?: string;
}

export interface UserProfile {
  partyId: string;
  firstName: string;
  lastName: string;
  userLoginId: string;
  userTimeZone: string;
  facilityId?: string;
  facilities?: Facility[];
  moquiUserId?: string;
}
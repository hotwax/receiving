export default interface UserState {
    token: string;
    current: any;
    currentFacility: object | null;
    currentEComStore: object;
    instanceUrl: string;
    facilityLocationsByFacilityId: any;
    productIdentificationPref: any;
    permissions: any;
}
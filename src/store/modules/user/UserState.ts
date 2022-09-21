export default interface UserState {
    token: string;
    current: object | null;
    currentFacility: object | null;
    facilityLocations: any;
    currentEComStore: object;
    instanceUrl: string;
}
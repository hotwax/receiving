export default interface UserState {
    token: string;
    current: object | null;
    currentFacility: object | null;
    currentFacilityLocation: object | null;
    instanceUrl: string;
}
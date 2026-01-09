export default interface UserState {
    token: string;
    current: any;
    currentEComStore: object;
    instanceUrl: string;
    facilityLocationsByFacilityId: any;
    omsRedirectionInfo: {
        url: string;
        token: string;
    }
    permissions: any;
    pwaState: any;
    notifications: any;
    notificationPrefs: any;
    firebaseDeviceId: string;
    hasUnreadNotifications: boolean;
    allNotificationPrefs: any;
}
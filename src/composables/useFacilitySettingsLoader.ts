import { type WatchSource, watch } from 'vue';
import { useProductStore } from '@/store/productStore';

// Receiving settings come from the current facility's product store when it has one, otherwise the defaults apply.
// This optional lookup runs once login has finished and again whenever the facility changes; it never delays or blocks login.
export const useFacilitySettingsLoader = (loginReady: WatchSource<boolean>, isAuthenticated: WatchSource<boolean>) => {
  const productStore = useProductStore();

  watch([loginReady, isAuthenticated, () => productStore.getCurrentFacility?.facilityId], ([ready, authenticated, facilityId]) => {
    if (ready && authenticated && facilityId) void productStore.loadFacilitySettings(facilityId as string);
  }, { immediate: true });
};

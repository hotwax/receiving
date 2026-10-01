import { shallowRef } from 'vue';
import { useAuth } from '@common/composables/useAuth';
import { commonUtil } from '@common/utils/commonUtil';
import { configureReceiving, enableReceivingSession, receivingScope } from './receivingClient';

// Reloads can resume an authenticated session; a new login must finish app setup first.
export const receivingLoginReady = shallowRef(true);

export function beginReceivingLogin() {
  receivingLoginReady.value = false;
  void configureReceiving();
}

export function finishReceivingLogin() {
  enableReceivingSession();
  receivingLoginReady.value = true;
}

export function syncReceivingSession(facilityId?: string, userId?: string) {
  // Like the route guard, validate at the point of use. Older AccxUI versions
  // can retain a false auth computed after the user-ID cookie arrives at login.
  const authenticated = receivingLoginReady.value && useAuth().isAuthenticated.value;
  const token = commonUtil.getToken();
  const maargUrl = commonUtil.getMaargURL();
  if (!authenticated || !token || !facilityId || !userId || !maargUrl) {
    return configureReceiving();
  }
  return configureReceiving({
    scope: receivingScope(maargUrl, commonUtil.getOmsURL(), userId),
    maargUrl, token, facilityId, moqui: commonUtil.isMoqui(),
  });
}

import { toastController } from '@ionic/vue';
import { translate, useUserStore } from '@hotwax/dxp-components'
import { Plugins } from '@capacitor/core';
import { DateTime } from "luxon";

// TODO Use separate files for specific utilities

// TODO Remove it when HC APIs are fully REST compliant
const hasError = (response: any) => {
  return typeof response.data != "object" || !!response.data._ERROR_MESSAGE_ || !!response.data._ERROR_MESSAGE_LIST_ || !!response.data.error;
}

const showToast = async (message: string, options?: any) => {
  const config = {
    message,
    ...options
  } as any;

  if(!options?.position) config.position = 'bottom';

  if(options?.canDismiss) {
    config.buttons = [
      {
        text: translate('Dismiss'),
        role: 'cancel',
      },
    ]
  }

  if(!options?.manualDismiss && !options?.duration) config.duration = 3000;

  const toast = await toastController.create(config)
  // present toast if manual dismiss is not needed
  return !options?.manualDismiss ? toast.present() : toast
}

const copyToClipboard = async (value: string, text?: string) => {
  const { Clipboard } = Plugins;

  await Clipboard.write({
    string: value,
  }).then(() => {
    text ? showToast(translate(text)) : showToast(translate("Copied", { value }));
  });
}

const handleDateTimeInput = (dateTimeValue: any) => {
  // TODO Handle it in a better way
  // Remove timezone and then convert to timestamp
  // Current date time picker picks browser timezone and there is no supprt to change it
  const dateTime = DateTime.fromISO(dateTimeValue, { zone: 'utc' }).toFormat("yyyy-MM-dd'T'HH:mm:ss")
  return DateTime.fromISO(dateTime).toMillis()
}

const getCurrentFacilityId = () => {
  const currentFacility: any = useUserStore().getCurrentFacility;
  return currentFacility?.facilityId
}

const hasWebcamAccess = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (stream.getVideoTracks().length > 0) {
      return { success: true };
    } else {
      return { success: false, message: translate("Camera access not allowed") };
    }
  } catch (error: any) {
    return { success: false, message: `${translate("Error accessing webcam")}: ${error.message }`};
  }
}

export { handleDateTimeInput, getCurrentFacilityId, showToast, hasError, copyToClipboard, hasWebcamAccess }

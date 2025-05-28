import { toastController } from '@ionic/vue';
import { translate } from '@/i18n'
import { Plugins } from '@capacitor/core';
import productHelpers from './product'
import { DateTime } from "luxon";

// TODO Use separate files for specific utilities

// TODO Remove it when HC APIs are fully REST compliant
const hasError = (response: any) => {
  return typeof response.data != "object" || !!response.data._ERROR_MESSAGE_ || !!response.data._ERROR_MESSAGE_LIST_ || !!response.data.error;
}

const showToast = async (message: string) => {
  const toast = await toastController
    .create({
      message,
      duration: 3000,
      position: 'bottom',
    })
  return toast.present();
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

const getFeatures = (productFeatures: any) => {
  const features = productFeatures
    ?.sort((firstFeature: string, secondFeature: string) => firstFeature.split('/')[0].localeCompare(secondFeature.split('/')[0]))
    ?.map((feature: string) => feature.substring(feature.indexOf("/") + 1)) // Not using split method as we may have features with value as `Size/N/S` and thus the only value returned is N when accessing 1st index considering that 1st index will have actual feature value, so we need to have some additional handling in case of split method
    ?.join(' ');
  return features || "";
}

export { getFeatures, handleDateTimeInput, showToast, hasError, copyToClipboard, productHelpers }

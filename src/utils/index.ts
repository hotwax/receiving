import { toastController } from '@ionic/vue';
import { translate } from '@/i18n'
import { Plugins } from '@capacitor/core';
import productHelpers from './product'
import { DateTime } from "luxon";

// TODO Use separate files for specific utilities

// TODO Remove it when HC APIs are fully REST compliant
const hasError = (response: any) => {
    return !!response.data._ERROR_MESSAGE_ || !!response.data._ERROR_MESSAGE_LIST_;
}

const showToast = async (message: string, configButtons?: any) => {
  const defaultButtons = [{
    text: 'Dismiss',
    role: 'cancel'
  }]

  if (configButtons) defaultButtons.push(...configButtons);

  const toast = await toastController
    .create({
      message: message,
      duration: 3000,
      position: 'top',
      buttons: defaultButtons
    })
  return toast.present();
}

const copyToClipboard = async (text: string) => {
    const { Clipboard } = Plugins;

    await Clipboard.write({
      string: text,
    }).then(() => {
        showToast(translate("Copied", { text }));
    });
}

const handleDateTimeInput = (dateTimeValue: any) => {
  // TODO Handle it in a better way
  // Remove timezone and then convert to timestamp
  // Current date time picker picks browser timezone and there is no supprt to change it
  const dateTime = DateTime.fromISO(dateTimeValue, { zone: 'utc' }).toFormat("yyyy-MM-dd'T'HH:mm:ss")
  return DateTime.fromISO(dateTime).toMillis()
}

export { handleDateTimeInput, showToast, hasError, copyToClipboard, productHelpers }

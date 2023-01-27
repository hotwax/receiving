import { toastController } from '@ionic/vue';
import { translate } from '@/i18n'
import { Plugins } from '@capacitor/core';
import productHelpers from './product'

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

export { showToast, hasError, copyToClipboard, productHelpers }

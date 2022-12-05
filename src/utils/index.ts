import { toastController } from '@ionic/vue';
import { translate } from '@/i18n'
import { Plugins } from '@capacitor/core';

// TODO Use separate files for specific utilities

// TODO Remove it when HC APIs are fully REST compliant
const hasError = (response: any) => {
    return !!response.data._ERROR_MESSAGE_ || !!response.data._ERROR_MESSAGE_LIST_;
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

const copyToClipboard = async (text: string) => {
    const { Clipboard } = Plugins;

    await Clipboard.write({
      string: text,
    }).then(() => {
        showToast(translate("Copied", { text }));
    });
}

const getProductIdentificationValue = (id: string, product: any) => {

  // handled this case as on page load initially the data is not available, so not to execute furthur code
  // untill product are available
  if(!Object.keys(product).length) {
    return;
  }

  let value = product[id]

  // considered that the goodIdentification will always have values in the format "id/value" and there will be no entry like "id/"
  const identification = product['goodIdentifications'].find((identification: string) =>  identification.startsWith(id + "/"))

  if(identification) {
    const goodIdentification = identification.split('/')
    value = goodIdentification[1]
  }

  return value;
}

export { showToast, hasError, copyToClipboard, getProductIdentificationValue }

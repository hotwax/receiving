<template>
  <ion-toolbar>
    <ion-buttons slot="end" @click="closeScanner()">
      <ion-button>
        <ion-icon :icon="closeOutline" />
      </ion-button>
    </ion-buttons>
  </ion-toolbar>

  <div class="scanner">
    <!-- Conditionally render the "Start Scanning" button based on camera access -->
    <ion-button v-if="!hasCameraAccess" @click="openScanner">Start Scanning</ion-button>

    <!-- Load the barcode scanner only if camera access is granted -->
    <StreamBarcodeReader
      v-if="hasCameraAccess"
      @decode="onDecode"
      @loaded="onLoaded"
    />
  </div>
</template>

<script>
import { StreamBarcodeReader } from "vue-barcode-reader";
import { IonButton, IonButtons, IonIcon, IonToolbar, modalController, alertController } from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';

export default {
  name: 'Scanner',
  components: {
    IonButton,
    IonButtons,
    IonIcon,
    IonToolbar,
    StreamBarcodeReader,
  },
  data() {
    return {
      hasCameraAccess: false, // Track if the camera access is granted
    };
  },
  methods: {
    // Request camera access when the user interacts
    async requestCameraAccess() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (stream) {
          this.hasCameraAccess = true; // Access granted, show scanner
        }
      } catch (error) {
        console.error('Camera access denied:', error);
        this.hasCameraAccess = false; // Access denied, show alert
        this.showAlert('Camera permission is denied. Please enable the camera permission in your device settings to use the scanner.');
      }
    },
    // Show an alert when camera access is denied
    async showAlert(message) {
      const alert = await alertController.create({
        header: 'Camera Permission Denied',
        message: message,
        buttons: ['OK'],
      });
      await alert.present();
    },
    // Triggered by user clicking "Start Scanning" button
    async openScanner() {
      await this.requestCameraAccess(); // Ask for camera access
      if (this.hasCameraAccess) {
        // Button will automatically disappear and scanner will be displayed
      }
    },
    onDecode(result) {
      modalController.dismiss({ dismissed: true }, result);
    },
    closeScanner() {
      modalController.dismiss({ dismissed: true });
    },
  },
  setup() {
    return {
      closeOutline,
    };
  },
};
</script>


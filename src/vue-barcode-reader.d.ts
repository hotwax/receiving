declare module 'vue-barcode-reader' {
  import { DefineComponent } from 'vue'
  export const StreamBarcodeReader: DefineComponent<Record<string, any>, Record<string, any>, any>
  export const ImageBarcodeReader: DefineComponent<Record<string, any>, Record<string, any>, any>
}

import { Product } from "@/adapter";

const getProductIdentificationValue = (productIdentifier: string, product: Product) => {

  let value = product[productIdentifier]

  if(!value) {
    value = product['identifications']?.find((identification: any) => identification.productIdTypeEnumId === productIdentifier)?.idValue
  }

  return value;
}

export default { getProductIdentificationValue }
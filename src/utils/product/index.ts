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

export default { getProductIdentificationValue }
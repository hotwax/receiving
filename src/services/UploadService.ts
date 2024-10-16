import { api } from '@/adapter';
import { UploadRequest } from '@/types'

const uploadJsonFile = async (payload: any): Promise <any>  => {
  return api({
    url: "uploadAndImportFile",
    method: "post",
    ...payload
  });
}

const prepareUploadJsonPayload = (request: UploadRequest) => {
  const blob = new Blob([JSON.stringify(request.uploadData)], { type: 'application/json'});
  const formData = new FormData();
  const fileName =  request.fileName ? request.fileName : Date.now() + ".json" ;
  formData.append("uploadedFile", blob, fileName);
  if (request.params) {
    for (const key in request.params) {
        formData.append(key, request.params[key]);
      }
  }
  return {
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data;'
    }
  }
}

const fetchDataManagerLog = async (payload: any): Promise<any> => {
  return api({
    url: "/performFind",
    method: "POST",
    data: payload
  })
}

export const UploadService = {
  fetchDataManagerLog,
  prepareUploadJsonPayload,
  uploadJsonFile
}
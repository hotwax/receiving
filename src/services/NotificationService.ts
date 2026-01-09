import { client, hasError } from '@/adapter';
import store from "@/store";

/**
 * Retrieves notification enum IDs based on the provided enum type ID.
 *
 * @param enumTypeId - The ID of the enum type to retrieve.
 * @returns A promise that resolves to the data containing the notification enum IDs.
 * @throws An error object with code and message if the request fails.
 */
const getNotificationEnumIds = async (enumTypeId: string): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];
  const params = {
    enumTypeId,
    pageSize: 200
  }

  try {
    const resp = await client({
      url: "admin/enums",
      method: "get",
      baseURL,
      params,
      headers: {
        "api_key": omsRedirectionInfo.token,
        "Content-Type": "application/json"
      }
    }) as any;

    if (!hasError(resp)) {
      return Promise.resolve(resp.data);
    } else {
      throw resp.data;
    }
  } catch (err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    });
  }
}

/**
 * Retrieves the notification user preference type IDs for a specific application and user.
 *
 * @param applicationId - The ID of the application for which to retrieve notification preferences.
 * @param userId - The ID of the user whose notification preferences are being retrieved.
 * @param filterConditions - Optional additional filter conditions to apply to the request.
 * @returns A promise that resolves to the notification user preference type IDs or rejects with an error object.
 *
 * @throws {Object} An error object containing a code and message if the request fails.
 */
const getNotificationUserPrefTypeIds = async (applicationId: string, userId: string, filterConditions = {}): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];
  const params = {
    topicTypeId: applicationId,
    userId,
    pageSize: 200,
    ...filterConditions
  }

  try {
    const resp = await client({
      url: "firebase/user/notificationtopic",
      method: "get",
      params,
      baseURL,
      headers: {
        "api_key": omsRedirectionInfo.token,
        "Content-Type": "application/json"
      }
    }) as any;

    if (!hasError(resp)) {
      return Promise.resolve(resp.data);
    } else {
      throw resp.data;
    }
  } catch (err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    });
  }
}

/**
 * Stores the client registration token for a device in the application.
 *
 * @param registrationToken - The registration token to be stored.
 * @param deviceId - The unique identifier for the device.
 * @param applicationId - The unique identifier for the application.
 * @returns A promise that resolves with the server response data if successful, or rejects with an error object.
 * @throws {Object} An error object containing a code, message, and server response if the operation fails.
 */
const storeClientRegistrationToken = async (registrationToken: string, deviceId: string, applicationId: string): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];
  const payload = {
    registrationToken,
    deviceId,
    applicationId
  }

  try {
    const resp = await client({
      url: "firebase/token",
      method: "post",
      data: payload,
      baseURL,
      headers: {
        "api_key": omsRedirectionInfo.token,
        "Content-Type": "application/json"
      }
    }) as any;

    if (!hasError(resp)) {
      return Promise.resolve(resp.data);
    } else {
      throw resp.data;
    }
  } catch (err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    });
  }
}

/**
 * Removes the client registration token for a specified device and application.
 *
 * @param deviceId - The unique identifier for the device.
 * @param applicationId - The unique identifier for the application.
 * @returns A promise that resolves with the response data if successful, or rejects with an error object.
 * @throws {Object} An error object containing a code, message, and server response if the operation fails.
 */
const removeClientRegistrationToken = async (deviceId: string, applicationId: string): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];
  const params = {
    deviceId,
    applicationId
  }

  try {
    const resp = await client({
      url: "firebase/token",
      method: "delete",
      params,
      baseURL,
      headers: {
        "api_key": omsRedirectionInfo.token,
        "Content-Type": "application/json"
      }
    }) as any;

    if (!hasError(resp)) {
      return Promise.resolve(resp.data);
    } else {
      throw resp.data;
    }
  } catch (err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    });
  }
}

/**
 * Subscribes to a specified topic for a given application.
 *
 * @param topicName - The name of the topic to subscribe to.
 * @param applicationId - The ID of the application requesting the subscription.
 * @returns A promise that resolves with the response data if successful, or rejects with an error object if an error occurs.
 *
 * @throws {Error} If the subscription fails, an error object with a code and message will be thrown.
 */
const subscribeTopic = async (topicName: string, applicationId: string): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];
  const params = {
    topicName,
    applicationId
  }

  try {
    const resp = await client({
      url: "firebase/topic",
      method: "post",
      data: params,
      baseURL,
      headers: {
        "api_key": omsRedirectionInfo.token,
        "Content-Type": "application/json"
      }
    }) as any;

    if (!hasError(resp)) {
      return Promise.resolve(resp.data);
    } else {
      throw resp.data;
    }
  } catch (err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    });
  }
}

/**
 * Unsubscribes from a specified Firebase topic for a given application.
 *
 * @param topicName - The name of the topic to unsubscribe from.
 * @param applicationId - The ID of the application to which the topic belongs.
 * @returns A promise that resolves with the response data if successful, or rejects with an error object if an error occurs.
 *
 * @throws {Object} An error object containing a code and message if the operation fails.
 */
const unsubscribeTopic = async (topicName: string, applicationId: string): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];
  const params = {
    topicName,
    applicationId
  }

  try {
    const resp = await client({
      url: "firebase/topic",
      method: "delete",
      data: params,
      baseURL,
      headers: {
        "api_key": omsRedirectionInfo.token,
        "Content-Type": "application/json"
      }
    }) as any;

    if (!hasError(resp)) {
      return Promise.resolve(resp.data);
    } else {
      throw resp.data;
    }
  } catch (err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    });
  }
}

export const NotificationService = {
  getNotificationEnumIds,
  getNotificationUserPrefTypeIds,
  removeClientRegistrationToken,
  storeClientRegistrationToken,
  subscribeTopic,
  unsubscribeTopic
}
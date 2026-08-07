/**
 * App actions mapped to the server permissions they require.
 *
 * Views, components and routes should always refer to an action from this file instead of
 * hardcoding a server permission, so that a permission change is a one line change here.
 *
 * The value is the permission expression evaluated by `hasPermission` of the user store.
 * It supports the `OR` and `AND` operators, and an empty value means the action is allowed
 * for every logged in user.
 */
export default {
  APP_PURCHASEORDERS_VIEW: "",
  APP_PURCHASEORDER_DETAIL_VIEW: "",
  APP_RETURNS_VIEW: "",
  APP_RETURN_DETAIL_VIEW: "",
  APP_TRANSFERORDERS_VIEW: "",
  APP_TRANSFERORDER_DETAIL_VIEW: "",
  APP_TRANSFERORDER_CREATE: "",
  APP_SHIPMENT_UPDATE: "RECEIVING_ADMIN",
  APP_RECVG_ADMIN: "COMMON_ADMIN",
  APP_PRODUCT_IDENTIFIER_UPDATE: "COMMON_ADMIN",
  APP_BARCODE_IDENTIFIER_UPDATE: "COMMON_ADMIN",
  APP_UPDT_FULFILL_FORCE_SCAN_CONFIG: "COMMON_ADMIN",
  APP_UPDT_RECEIVE_FLOW_CONFIG: "COMMON_ADMIN"
} as const satisfies Record<string, string>

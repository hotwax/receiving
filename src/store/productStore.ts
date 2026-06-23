import { defineStore } from 'pinia'
import { api, commonUtil, logger, translate, useEmbeddedAppStore, useSolrSearch } from '@common'
import { useUserStore } from '@/store/user'
const defaultProductStoreSettings = JSON.parse(import.meta.env.VITE_DEFAULT_PRODUCT_STORE_SETTINGS as string || '{}')

export const useProductStore = defineStore('productStore', {
  state: () => ({
    currentFacility: {
      facilityId: "",
      facilityName: "",
      productStores: []
    } as any,
    currentProductStore: {} as any,
    settings: {
      forceScan: "",
      receiveByFulfillment: "",
      productIdentifier: {
        productIdentificationPref: {
          primaryId: '',
          secondaryId: ''
        },
        productIdentificationOptions: [] as any[],
        sampleProducts: [],
        currentSampleProduct: null
      },
      barcodeIdentifier: {
        barcodeIdentifierPref: "",
        barcodeIdentifierOptions: [] as any[],
      },
    } as any,
    userFacilities: {} as any,
    facilityLocationsByFacilityId: {} as any,
  }),

  getters: {
    getCurrentFacility: (state) => state.currentFacility,
    getCurrentProductStore: (state) => state.currentProductStore,
    getProductStores: (state) => state.currentFacility.productStores || [],
    getFacilities: (state) => state.userFacilities || [],
    getSettings: (state) => state.settings,
    getProductIdentificationPref: (state) => state.settings.productIdentifier.productIdentificationPref,
    getBarcodeIdentifierPref: (state) => state.settings.barcodeIdentifier.barcodeIdentifierPref,
    getProductIdentificationOptions: (state) => state.settings.productIdentifier.productIdentificationOptions,
    getBarcodeIdentifierOptions: (state) => state.settings.barcodeIdentifier.barcodeIdentifierOptions,
    getCurrentSampleProduct: (state) => state.settings.productIdentifier.currentSampleProduct,
    isProductStoreSettingEnabled: (state) => (settingTypeEnumId: string) => {
      const stateKey = defaultProductStoreSettings[settingTypeEnumId]?.stateKey || settingTypeEnumId
      return state.settings[stateKey] === "Y"
    },
    getFacilityLocationsByFacilityId: (state) => (facilityId: string) => state.facilityLocationsByFacilityId[facilityId] ? state.facilityLocationsByFacilityId[facilityId] : []
  },

  actions: {
    setCurrentFacility(facility: any) {
      this.currentFacility = facility
    },
    async setCurrentProductStore(store: any) {
      this.currentProductStore = store
      await this.fetchProductStoreDependencies(store.productStoreId)
    },
    async fetchUserFacilities() {
      const userStore = useUserStore();
      let facilityIds: Array<string> = [];
      let filters: any = {};
      let resp = {} as any

      const partyId = userStore.getUserProfile?.partyId;
      const isAdminUser = userStore.hasPermission("COMMON_ADMIN");

      try {
        this.currentFacility = {
          ...this.currentFacility,
          productStores: []
        }

        // Fetch the facilities associated with party
        if (partyId && !isAdminUser) {
          try {
            resp = await api({
              url: `admin/user/${partyId}/facilities`,
              method: "GET",
              params: {
                pageSize: 500
              }
            } as any);

            // Filtering facilities on which thruDate is set, as we are unable to pass thruDate check in the api payload
            // Considering that the facilities will always have a thruDate of the past.
            const facilities = resp.data.filter((facility: any) => !facility.thruDate)

            facilityIds = facilities.map((facility: any) => facility.facilityId);
            if (!facilityIds.length) {
              return Promise.reject({
                code: 'error',
                message: 'Failed to fetch user facilities',
                serverResponse: resp.data
              })
            }
          } catch (error) {
            return Promise.reject({
              code: 'error',
              message: 'Failed to fetch user associated facilities',
              serverResponse: error
            })
          }
        }

        // Only Location's facility for Shopify POS Users.
        const shopifyLocationId = useEmbeddedAppStore().getPosLocationId
        if (commonUtil.isAppEmbedded() && shopifyLocationId) {
          const locationFacilityId = await this.fetchShopifyShopLocation({
            shopifyLocationId,
            pageSize: 1
          })
          if (locationFacilityId)  {
            // Here facility ids can be empty the logged in user is admin,
            // though we're syncing new embedded app users with store manager group this check is required,
            // push logged in facility id to avoid error in login.
            if (facilityIds.length) facilityIds = facilityIds.filter((id: any) => id === locationFacilityId)
            else facilityIds.push(locationFacilityId)
          }
          else facilityIds = [];
          if (!facilityIds.length) {
            return Promise.reject({
              code: 'error',
              message: 'Failed to fetch user facilities for Shopify POS location',
              serverResponse: resp.data
            })
          }
        }

        if (facilityIds.length) {
          filters = {
            facilityId: facilityIds.join(","),
            facilityId_op: "in",
            pageSize: facilityIds.length
          }
        }

        const params = {
          url: "oms/facilities",
          method: "GET",
          params: {
            pageSize: 500,
            facilityTypeId: "VIRTUAL_FACILITY",
            facilityTypeId_not: "Y",
            parentTypeId: "VIRTUAL_FACILITY",
            parentTypeId_not: "Y",
            ...filters
          }
        }

        resp = await api(params);
        this.userFacilities = resp.data
        this.setCurrentFacility(resp.data[0])
      } catch (error: any) {
        logger.error("error", error);
        return Promise.reject(new Error(error));
      }
    },
    async setFacilityPreference(payload: any) {
      const userStore = useUserStore();
      try {
        await api({
          url: "admin/user/preferences",
          method: "PUT",
          data: {
            userId: userStore.getUserProfile.userId,
            preferenceKey: 'SELECTED_FACILITY',
            preferenceValue: payload.facilityId,
          }
        });
      } catch (error) {
        console.error('error', error)
      }
      this.currentFacility = payload;
    },
    async fetchFacilityPreference() {
      const userStore = useUserStore();
      let facilityId: string | undefined;
      try {
        const locationId = useEmbeddedAppStore().getPosLocationId;
        if (commonUtil.isAppEmbedded() && locationId) {
          facilityId = await this.fetchShopifyShopLocation({
            shopifyLocationId: locationId,
            pageSize: 1,
          });
          if (!facilityId) {
            throw new Error("Failed to fetch location information. Please contact the administrator.");
          }
        } else {
          const preferredFacilityResp = await api({
            url: "admin/user/preferences",
            method: "GET",
            params: {
              pageSize: 1,
              userId: userStore.current.userId,
              preferenceKey: "SELECTED_FACILITY"
            },
          }) as any;
          facilityId = preferredFacilityResp.data?.[0]?.preferenceValue;
        }

        if (facilityId) {
          const facility = this.userFacilities.find((f: any) => f.facilityId === facilityId);
          if (!facility && commonUtil.isAppEmbedded() && locationId) {
            throw new Error("User is not associated with this location. Please contact the administrator.");
          }
          if (facility) {
            this.currentFacility = facility;
            return;
          }
        }
      } catch (err) {
        logger.error('Failed to resolve facility preference:', err)
      }
      // Fallback to first associated facility
      if (this.userFacilities?.length) {
        this.currentFacility = this.userFacilities[0];
      }
    },
    async fetchProductStores(currentFacilityId?: string) {
      try {
        const facilityId = currentFacilityId ?? this.currentFacility.facilityId;
        const pageSize = 200;

        const resp = await api({
          url: `oms/facilities/${facilityId}/productStores`,
          method: "GET",
          params: {
            pageSize,
            facilityId
          }
        }) as any;

        const stores = resp.data.filter((store: any) => !store.thruDate)

        if (stores.length) {
          // Fetching all stores for the store name
          try {
            const productStoresResp = await api({
              url: "admin/productStores",
              method: "GET",
              params: {
                pageSize: 200
              }
            }) as any;
            const productStores = productStoresResp.data;
            const productStoresMap = {} as any;
            productStores.map((store: any) => productStoresMap[store.productStoreId] = store.storeName)
            stores.map((store: any) => store.storeName = productStoresMap[store.productStoreId])
          } catch (error) {
            console.error(error);
          }
        }

        const productStores = [...stores]
        productStores.push({
          productStoreId: "",
          storeName: "None",
        });

        this.currentFacility = {
          ...this.currentFacility,
          productStores
        }
        this.setCurrentProductStore(productStores[0])
      } catch (error: any) {
        logger.error("error", error);
        return Promise.reject(new Error(error));
      }
    },
    async fetchProductStoreDependencies(productStoreId: string) {
      await useProductStore().fetchProductStoreSettings(productStoreId)
        .catch((error) => logger.error(error))
    },

    async fetchProductStoreSettings(productStoreId: string) {
      const productStoreSettings = {} as any

      if (productStoreId) {
        const payload = {
          productStoreId,
          settingTypeEnumId: Object.keys(defaultProductStoreSettings),
          settingTypeEnumId_op: "in",
          pageIndex: 0,
          pageSize: 50
        }
        try {
          const resp = await api({
            url: `/oms/dataDocumentView`,
            method: "POST",
            data: {
              dataDocumentId: "ProductStoreSetting",
              customParametersMap: payload
            }
          }) as any

          resp?.data?.entityValueList?.forEach((productSetting: any) => {
            productStoreSettings[productSetting.settingTypeEnumId] = productSetting.settingValue
          })
        } catch (error) {
          logger.error("Failed to fetch settings", error)
        }
      }

      Object.entries(defaultProductStoreSettings).forEach(([settingTypeEnumId, setting]: any) => {
        const { stateKey, value } = setting;
        const settingValue = productStoreSettings[settingTypeEnumId];
        let finalValue;
        try {
          finalValue = settingValue ? JSON.parse(settingValue) : value;
        } catch (e) {
          finalValue = settingValue; // fallback to raw value
        }

        const keys = stateKey.split('.');
        let current = this.settings;

        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];

          if (i === keys.length - 1) {
            current[key] = finalValue;
          } else {
            // ensure object exists at each level
            if (!current[key] || typeof current[key] !== 'object') {
              current[key] = {};
            }
            current = current[key];
          }
        }
      })
    },

    async setProductStoreSetting(productStoreId: string, settingTypeEnumId: string, settingValue: any) {
      try {
        const payloadSettingValue = typeof settingValue === 'object' ? JSON.stringify(settingValue) : settingValue;
        const resp = await api({
          url: `admin/productStores/${productStoreId}/settings`,
          method: 'POST',
          data: {
            productStoreId,
            settingTypeEnumId,
            settingValue: payloadSettingValue
          }
        })
        if (!commonUtil.hasError(resp)) {
          const defaultSetting = defaultProductStoreSettings[settingTypeEnumId]
          const { stateKey } = defaultSetting
          const keys = stateKey.split('.');
          let current = this.settings;

          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            if (i === keys.length - 1) {
              current[key] = settingValue;
            } else {
              // ensure object exists at each level
              if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
              }
              current = current[key];
            }
          }
          commonUtil.showToast(translate('Product Store setting updated successfully.'))
        } else {
          throw resp
        }
      } catch (err) {
        commonUtil.showToast(translate('Failed to update Product Store setting.'))
        logger.error(err)
      }
    },

    async prepareProductIdentifierOptions() {
      //static identifications 
      const productIdentificationOptions = [
        { goodIdentificationTypeId: "productId", description: "Product ID" },
        { goodIdentificationTypeId: "groupId", description: "Group ID" },
        { goodIdentificationTypeId: "groupName", description: "Group Name" },
        { goodIdentificationTypeId: "internalName", description: "Internal Name" },
        { goodIdentificationTypeId: "parentProductName", description: "Parent Product Name" },
        { goodIdentificationTypeId: "primaryProductCategoryName", description: "Primary Product Category Name" },
        { goodIdentificationTypeId: "title", description: "Title" }
      ]
      //good identification types
      let fetchedGoodIdentificationOptions = []
      try {
        const resp: any = await api({
          url: "oms/goodIdentificationTypes",
          method: "get",
          params: {
            parentTypeId: "HC_GOOD_ID_TYPE",
            pageSize: 50
          }
        });

        fetchedGoodIdentificationOptions = resp.data
      } catch (error) {
        console.error('Failed to fetch good identification types', error)
      }

      // Merge the arrays and remove duplicates
      this.settings.productIdentifier.productIdentificationOptions = Array.from(new Set([...productIdentificationOptions, ...fetchedGoodIdentificationOptions])).sort();
      this.settings.barcodeIdentifier.barcodeIdentifierOptions = fetchedGoodIdentificationOptions
    },

    async fetchProducts() {
      try {
        const resp = await useSolrSearch().searchProducts({
          viewSize: 10
        })

        if (resp.products.length) {
          this.settings.productIdentifier.sampleProducts = resp.products;
          this.shuffleProduct()
        } else {
          throw resp
        }
      } catch (error: any) {
        console.error(error)
      }
    },
    shuffleProduct() {
      if (this.settings.productIdentifier.sampleProducts.length) {
        const randomIndex = Math.floor(Math.random() * this.settings.productIdentifier.sampleProducts.length)
        this.settings.productIdentifier.currentSampleProduct = this.settings.productIdentifier.sampleProducts[randomIndex]
      } else {
        this.settings.productIdentifier.currentSampleProduct = null
      }
    },
    async getFacilityLocations(facilityId: string) {
      if (this.facilityLocationsByFacilityId[facilityId]) {
        return this.facilityLocationsByFacilityId[facilityId];
      }

      let resp = [] as any;
      try {
        resp = await api({
          url: `oms/facilities/${facilityId}/locations`,
          method: "GET",
          params: {
            pageSize: 50
          }
        }) as any;

        if (resp.status === 200 && !commonUtil.hasError(resp)) {
          this.facilityLocationsByFacilityId[facilityId] = resp.data;
        }
      } catch (err) {
        console.error('Error', err);
      }
      return resp.data;
    },
    clearFacilities() {
      this.userFacilities = {};
      this.facilityLocationsByFacilityId = {};
    },
    async fetchShopifyShopLocation(payload: { shopifyLocationId: string, pageSize: number }): Promise<any> {
      try {
        const resp = await api({ url: "oms/shopifyShops/locations", method: "GET", params: payload }) as any;
        return Promise.resolve(resp.data[0]?.facilityId)
      } catch(error) {
        return Promise.reject({ code: "error", message: "Failed to fetch location information", serverResponse: error })
      }
    },
  },
  persist: true
})

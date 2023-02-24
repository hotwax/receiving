import { PartyService } from "@/services/PartyService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import PartyState from './PartyState'
import * as types from './mutation-types'
import { hasError } from '@/utils'


const actions: ActionTree<PartyState, RootState> = {

  async getReceiversDetails({commit, state}, receiversLoginIds) {
    const unavailableReceiversLoginIds = receiversLoginIds.filter((receiversLoginId: any) => !state.namesByLoginId[receiversLoginId]);

    if(!unavailableReceiversLoginIds.length) return state.namesByLoginId;

    let resp;
    const params = {
      "inputFields": {
        "userLoginId": unavailableReceiversLoginIds,
        "userLoginId_op": 'in'
      },
      "fieldList": ["firstName", "lastName", "userLoginId"],
      "entityName": "PartyAndUserLoginAndPerson",
      "viewSize": unavailableReceiversLoginIds.length,
      "noConditionFind": "Y"
    }
    try { 
      resp = await PartyService.getReceiversDetails(params);
      if (resp.status == 200 && !hasError(resp) && resp.data.count > 0) {
        const receiversDetails = resp.data.docs;

        const receiversDetailsByLoginId = receiversDetails.reduce((receiversDetailByLoginId: any, receiverDetails: any) => {
          receiverDetails.fullName = receiverDetails.firstName + ' ' + receiverDetails.lastName;
          receiversDetailByLoginId[receiverDetails.userLoginId] = receiverDetails;
          return receiversDetailByLoginId;
        }, {});
        commit(types.PARTY_NAMES_BY_LOGIN_ID_UPDATED, receiversDetailsByLoginId);
      } else {
        console.error(resp);
      }
    } catch(err) {
      console.error(err);
    }
    return state.namesByLoginId;
  }
}

export default actions;

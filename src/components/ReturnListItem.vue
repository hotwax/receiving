<template>
  <ion-item button @click="viewReturn()">
    <ion-label>
      <h2>{{ returnShipment.id }}</h2>
      <p>{{ returnShipment.noOfItem }} {{ (returnShipment.noOfItem > 1 ? 'Items' : 'Item') }}</p>
    </ion-label>
    <ion-note slot="end">{{ returnShipment.estimatedArrivalDate && returnShipment.returnStatus !== "Received"  ? ($filters.formatDate(returnShipment.estimatedArrivalDate)) : returnShipment.returnStatus }}</ion-note>
  </ion-item>
</template>
  
<script lang="ts">
  import { defineComponent } from 'vue'
  import {
    IonItem,
    IonLabel,
    IonNote
  } from '@ionic/vue'
  import { useRouter } from 'vue-router'
  import { useStore } from 'vuex';
  
  export default defineComponent({
    name: "ReturnListItem",
    components: {
      IonItem,
      IonLabel,
      IonNote,
    },
    props: ["returnShipment"],
    methods: {
      async viewReturn () {
        this.store.dispatch('return/setCurrent', { returnId: this.returnShipment.id }).then((resp) => {
          if (resp.items) {
            this.router.push({ path: `/return/${this.returnShipment.id}` });
          }
        });
      }
    },
    setup() {
      const router = useRouter();
      const store = useStore();
      
      return {
        router,
        store
      }
    },
  })
</script>
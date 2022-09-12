<template>
  <ion-item button @click="viewReturn()">
    <ion-label>
      <h2>{{ return.id }}</h2>
      <p>{{ return.noOfItem }} {{ (return.noOfItem > 1 ? 'Items' : 'Item') }}</p>
    </ion-label>
    <ion-note slot="end">{{ return.estimatedArrivalDate && return.returnStatus !== "Received"  ? ($filters.formatDate(return.estimatedArrivalDate)) : return.returnStatus }}</ion-note>
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
    props: ["return"],
    methods: {
      async viewReturn () {
        this.store.dispatch('return/setCurrent', { returnId: this.return.id }).then((resp) => {
          if (resp.items) {
            this.router.push({ path: `/return/${this.return.id}` });
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
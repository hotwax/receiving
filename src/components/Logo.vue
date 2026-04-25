<template>
  <figure>
    <img class="light" src="../assets/images/LogoLight.png" :alt="translate('HotWax Commerce')"/>
    <img class="dark" src="../assets/images/LogoDark.png" :alt="translate('HotWax Commerce')"/>
  </figure>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { translate } from '@hotwax/dxp-components'

export default defineComponent({
  setup() {
    return {
      translate
    }
  },
  name: "Logo",
})
</script>

<style scoped>
.dark {
  display: none;
}

@media (prefers-color-scheme: dark) {
  .dark {
    display: unset;
  }
  
  .light {
    display: none;
  }
}
</style>
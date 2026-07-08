<template>
  <img :data-testid="testId" :src="imageUrl"/>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import defaultImage from "@/assets/images/defaultImage.png";

const props = defineProps(['src', 'testId']);
const resourceUrl = ref(import.meta.env.VITE_RESOURCE_URL || '');
const imageUrl = ref(defaultImage);

onMounted(() => {
  setImageUrl();
});

watch(() => props.src, () => {
  setImageUrl();
});

function checkIfImageExists(src: string) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = function () {
      resolve(true);
    }
    img.onerror = function () {
      reject(false);
    }
    img.src = src;
  })
}

function setImageUrl() {
  if (props.src) {
    if (props.src.indexOf('assets/') != -1) {
      imageUrl.value = props.src;
    } else if (props.src.startsWith('http')) {
      checkIfImageExists(props.src).then(() => {
        imageUrl.value = props.src;
      }).catch(() => {
        console.error("Image doesn't exist");
      })
    } else {
      const url = resourceUrl.value.concat(props.src)
      checkIfImageExists(url).then(() => {
        imageUrl.value = url;
      }).catch(() => {
        console.error("Image doesn't exist");
      })
    }
  }
}
</script>

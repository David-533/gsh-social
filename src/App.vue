<script setup>
import { useRoute } from "vue-router";
import SocialLayout from "./components/SocialLayout.vue";

const route = useRoute();
</script>

<template>
  <SocialLayout v-if="route.meta.social">
    <RouterView />
  </SocialLayout>
  <RouterView v-else />
</template>

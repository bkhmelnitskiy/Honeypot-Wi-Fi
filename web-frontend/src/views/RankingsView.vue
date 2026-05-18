<script setup>
import Contributors from "@/components/Contributors.vue"
</script>
<template>
  <main>
    <Contributors />
  </main>
  
</template>

<style lang="scss">
.window{
    padding: 1rem;
    border-radius: 1rem;
    box-shadow: 0 1px 4px var(--contrast-color);
    min-width: 32rem;
    height: auto;
}

main{
    display: flex;
    justify-content: center;
    align-items: center;
}
</style>

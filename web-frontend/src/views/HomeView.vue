<script setup>
import { onMounted } from 'vue'
import Contributors from '@/components/Contributors.vue'
import ScansChart from '@/components/ScansChart.vue'
import TotalScans from '@/components/TotalScans.vue'
import { useGlobalStatsStore } from '@/stores/globalStats'

const stats = useGlobalStatsStore()
onMounted(() => stats.fetchGlobalStats())
</script>

<template>
  <main class="home">
    <TotalScans />
    <Contributors />
    <ScansChart />
  </main>
</template>

<style lang="scss">
.home>.window{
    padding: 1rem;
    border-radius: 1rem;
    box-shadow: 0 1px 4px var(--contrast-color);
    min-width: 32rem;
    height: auto;
}

main.home{
    display: flex;
    flex-wrap: wrap;
    justify-content: unset;
    align-items: unset;
}
</style>

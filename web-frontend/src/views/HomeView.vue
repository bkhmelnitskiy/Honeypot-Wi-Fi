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
  <main>
    <TotalScans />
    <Contributors />
    <ScansChart />
  </main>
</template>

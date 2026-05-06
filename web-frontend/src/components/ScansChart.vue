<template>
    <div>
        <h2>Scans per day</h2>
                   
        <div v-for="entry in stats.globalStats?.scans_per_day" :key="entry.date">
            <span>{{ entry.date }} : </span>
            <span>{{ entry.count }}</span>
        </div>
    </div>
</template>
//  build chart here (maybe with chart.js or something similar)
<script setup>
import { useGlobalStatsStore } from '@/stores/globalStats'

const stats = useGlobalStatsStore()
</script>

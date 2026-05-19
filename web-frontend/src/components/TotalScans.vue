<template>
    <div class="window" style="height: min-content; min-width: fit-content; width: calc(50% - 0.5rem);">
        <h1 style="padding-bottom: 0.75rem;">Global stats</h1>
        <div class="stat">
            <span class="text">Total scans globally:</span>
            <span class="value">{{ stats.globalStats?.total_scans }}</span>
        </div>
        <div class="stat">
            <span class="text">Total networks globally:</span>
            <span class="value">{{ stats.globalStats?.total_networks }}</span>
        </div>
        <div class="stat">
            <span class="text">Total users:</span>
            <span class="value">{{ stats.globalStats?.total_users }}</span>
        </div>
        <div class="stat">
            <span class="text">Average safety score:</span>
            <span class="value">{{ stats.globalStats?.avg_safety_score }}</span>
        </div>
    </div>
</template>
// tutaj możesz użyć czego tam chcesz 
<script setup>
import { useGlobalStatsStore } from '@/stores/globalStats'

const stats = useGlobalStatsStore()
</script>

<style lang="scss">
.stat {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
}
.text {
    padding-right: 1rem;
    vertical-align: bottom;
    font-size: larger;
}
.value {
    font-size: 1.3rem;
}
</style>
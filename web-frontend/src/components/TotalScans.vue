<template>
    <div>
        no tutaj możesz użyć czego tam chcesz 
        <div>
            <span>Total scans globally:</span>
            <span>{{ stats.globalStats?.total_scans }}</span>
        </div>
        <div>
            <span>Total networks globally:</span>
            <span>{{ stats.globalStats?.total_networks }}</span>
        </div>
        <div>
            <span>Total users:</span>
            <span>{{ stats.globalStats?.total_users }}</span>
        </div>
        <div>
            <span>Average safety score:</span>
            <span>{{ stats.globalStats?.avg_safety_score }}</span>
        </div>
    </div>
</template>

<script setup>
import { useGlobalStatsStore } from '@/stores/globalStats'

const stats = useGlobalStatsStore()
</script>

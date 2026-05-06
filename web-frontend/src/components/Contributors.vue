<template>
    <div>
        <h2>Top contributors</h2>
        <div v-for="(contributor, index) in stats.globalStats?.top_contributors" :key="contributor.display_name">
            <span> #{{ index + 1 }} &nbsp;&nbsp;&nbsp;&nbsp; </span>  
            <span> {{ contributor.display_name }} &nbsp;&nbsp;&nbsp;&nbsp;</span>
            <span>{{ contributor.total_scans }} contributions</span>
        </div>
    </div>
</template>
// remove the spaces in the template and use CSS

<script setup>
import { useGlobalStatsStore } from '@/stores/globalStats'

const stats = useGlobalStatsStore()
</script>

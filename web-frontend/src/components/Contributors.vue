<template>
    <div id="contributors" class="window" style="height: min-content; min-width: fit-content;">
        <h1>Top contributors</h1>
        <table style="padding-top: 8px;">
        <tr v-for="(contributor, index) in stats.globalStats?.top_contributors" :key="contributor.display_name">
            <td 
                class="size color"
                :class="{
                    'number_1': index === 0,
                    'number_2': index === 1,
                    'number_3': index === 2,
                }"
                >#{{ index + 1 }}</td>  
            <td 
                class="size"
                :class="{
                    'number_1': index === 0,
                    'number_2': index === 1,
                    'number_3': index === 2,
                }"
                >{{ contributor.display_name }}</td>
            <td 
                class="size"
                :class="{
                    'number_1': index === 0,
                    'number_2': index === 1,
                    'number_3': index === 2,
                }"
                style="color: var(--font-light);"
                >{{ contributor.total_scans }} contributions</td>
        </tr>
        </table>
    </div>
</template>
// remove the spaces in the template and use CSS

<script setup>
import { useGlobalStatsStore } from '@/stores/globalStats'

const stats = useGlobalStatsStore()
</script>

<style lang="scss">
td {
    text-align: center;
    padding: 1px 0.5rem;
}

.number_1.color {
    color: #FFD342;
}

.number_1.size {
    font-size: 1.5rem;
    padding: 1px 0.75rem;
}

.number_2.color {
    color: #B2B2B2;
}

.number_2.size {
    font-size: 1.35rem;
    padding: 2px 0.675rem;
}

.number_3.color {
    color: #804307;
}

.number_3.size {
    font-size: 1.2rem;
    padding: 1px 0.6rem;
}

#contributors {
    width: fit-content;
    box-sizing: border-box;
}
</style>
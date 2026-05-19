<template>
    <div class="window" style="height: min-content; width: 100%; box-sizing: border-box;">
        <h1>Scans per day</h1>
        <div class="chart_container" style="position: relative;">
            <canvas id="scans_per_day"></canvas>
        </div>
        <div v-if="errorMessage" class="error">Failed to load chart data</div>
    </div>
</template>


<script setup>
import { useGlobalStatsStore } from '@/stores/globalStats'
const stats = useGlobalStatsStore()

import { Chart } from "chart.js/auto"
import { ref, onMounted } from 'vue';
import { errorMessages } from 'vue/compiler-sfc';

const errorMessage = ref('')

console.log(stats.globalStats?.scans_per_day)
function makeChart(){
    try{
        const ctx = document.getElementById('scans_per_day');

        new Chart(ctx, {
            type: 'line',
            data: {
            labels: stats.globalStats?.scans_per_day.reverse().map(row => row.date),
            datasets: [{
                label: ' contributions',
                data: stats.globalStats?.scans_per_day.map(row => row.count),
                borderWidth: 1,
                borderColor: 'rgb(120, 202, 233)',
                tension: 0.4,
                fill: {
                    target: 'origin',
                    above: 'rgba(120, 202, 233, 0.5)'
                },
                pointStyle: false,
                
            }]
            },
            options: {
                responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            family: 'Michroma',
                            style: 'normal',
                            size: 8,
                            color: 'rgb(178, 178, 178)'
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'Michroma',
                            style: 'normal',
                            size: 8,
                            color: 'rgb(178, 178, 178)'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
            }
        });
    } catch (error) {
        errorMessage.value = 'Failed to load chart data'
        console.error(error)
    }
}

onMounted(makeChart)
</script>

<style lang="scss">

.chart_container {
    position: relative;
    margin-top: 1.5rem;
    margin-right: 1rem;
    width: 100%;
}

// canvas{
//     // border-radius: 1rem;
//     // padding: 1rem;
//     // box-shadow: inset 0px 1px 4px var(--contrast-color);
// }

.error{
    color: var(--red)
}
</style>
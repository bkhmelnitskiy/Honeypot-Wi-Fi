<template>
    <div class="window net_details" style="min-width: 42rem; width: 100%; max-width: 50rem; box-sizing: border-box;">
        <h2>Network details</h2>

        <div v-if="errorMessage">{{ errorMessage }}</div>

        <div v-if="network" class="param_list">
            <div class="position">
                <label>SSID:</label>
                <span>{{ network.ssid }}</span>
            </div>
            <div class="position">
                <label>BSSID:</label>
                <span>{{ network.bssid }}</span>
            </div>
            <div class="position">
                <label>Channel:</label>
                <span>{{ network.channel }}</span>
            </div>
            <div class="position">
                <label>Encryption:</label>
                <span>{{ network.encryption_type }}</span>
            </div>
            <div class="position">
                <label>Location:</label>
                <span>{{ network.gps_latitude }}, {{ network.gps_longitude }}</span>
            </div>
            <div class="position">
                <label>Total scans:</label>
                <span>{{ network.total_scans }}</span>
            </div>
            <div class="position">
                <label>Users scanned:</label>
                <span>{{ network.total_users_scanned }}</span>
            </div>
            <div class="position">
                <label>Average score:</label>
                <span>{{ network.avg_safety_score }}/100</span>
            </div>
            <div class="position">
                <label>Min score:</label>
                <span>{{ network.min_safety_score }}/100</span>
            </div>
            <div class="position">
                <label>Max score:</label>
                <span>{{ network.max_safety_score }}/100</span>
            </div>

            <div>
                <h3 style="margin-top: 1rem; margin-bottom: 0.5rem;">Scan history:</h3>
                <div class="list_bg" style="min-width: 100%;">
                    <div class="list" style="max-height: 45rem; overflow-y: auto; pointer-events: auto;">
                        <div v-if="!network.scan_history?.length" class="list_item"><a class="description">No history available</a></div>
                        <div v-for="(entry, i) in network.scan_history" :key="i" class="list_item">
                            <div class="position">
                                <span>{{ entry.date }}</span>
                                <span>Score: {{ entry.safety_score }}/100</span>
                            </div>
                            <div v-if="entry.attacks.length" style="color: var(--font-light); width: 100%;">
                                <h4>Detected atttacks:</h4>
                                <table style="width: 100%;">
                                    <tr v-for="(attack, j) in entry.attacks" :key="j">
                                        <td style="text-align: left; padding: 0;">{{ attack.attack_type }}</td>
                                        <td style="text-align: center; padding: 0;" :class="{
                                            'red': attack.severity === 'CRITICAL' || attack.severity === 'HIGH',
                                            'yellow': attack.severity === 'MEDIUM',
                                            'green': attack.severity === 'LOW'
                                        }">{{ attack.severity }}</td>
                                        <td style="text-align: right; padding: 0;">confidence: {{ attack.confidence }}</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>
                </div> 
            </div>
            <nav class="buttons">
                <button @click="emit('back')">Back</button>
                <button @click="emit('done')">Done</button>
            </nav>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'

const props = defineProps({
    id: { type: String, required: true }
})
const emit = defineEmits(['back', 'done'])

const network = ref(null)
const errorMessage = ref('')

async function loadNetwork() {
    try {
        const response = await axios.get(`/api/v1/networks/${props.id}`, { withCredentials: true })
        network.value = response.data
        errorMessage.value = ''
    } catch (error) {
        errorMessage.value = 'Failed to load network details'
        console.error(error)
    }
}

onMounted(loadNetwork)
watch(() => props.id, loadNetwork)
</script>

<style lang="scss">
.net_details{
    .window{
        padding: 1rem;
        border-radius: 1rem;
        box-shadow: 0 1px 4px var(--contrast-color);
    }

.position{
    display: flex;
    justify-content: space-between;

    label{
        color: var(--font-light);
    }
}

.red{
    color: var(--red);
}

.yellow{
    color: var(--yellow);
}

.green{
    color: var(--green);
}

button {
    appearance: none;
    border-width: 0;
    background-color: var(--contrast-color);
    padding: 1px 10px 4px 10px;
    border-radius: 5px;
    color: var(--main-color);
    font-size: medium;
    box-shadow: inset 0 -1px 4px;
    transition: all 100ms ease-in;
}

button:hover {
    box-shadow: none;
}

button:disabled{
    background-color: var(--font-light);
}

.buttons{
    display: flex;
    justify-content: space-between;
    padding-top: 1rem;
}

.error{
    color: var(--red);
}

.list{
    border-radius: 1rem;
    box-shadow: inset 0px 1px 4px var(--contrast-color);
    position: relative;
    z-index: auto;
    // pointer-events: none;
    scrollbar-color: var(--main-color) var(--contrast-color);
    scrollbar-width: thin;
}

.list_item{
    z-index: -1;
    padding: 1rem;
    border-radius: 1rem;
    background-color: var(--main-color);
    box-shadow: inset 0px 1px 4px var(--contrast-color);
    box-sizing: border-box;
    position: relative;
    pointer-events: auto;
    

    .description {
        color: var(--font-light);
        width: fit-content;
    }
    .safety_score {
        width: fit-content;
        position: absolute;
        bottom: 0;
        right: 0;
        margin-bottom: -10px;
    }
    
    button{
        height: fit-content;
        position: absolute;
        bottom: 0;
    }
}

.list_item>div{
    position: relative;
}

.list_bg{
    z-index: auto;
    isolation: isolate;
    border-radius: 1rem;
    background-color: var(--contrast-color);
    position: relative;
    // pointer-events: auto;
}
}

</style>